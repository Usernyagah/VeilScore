"""
FastAPI application for ZKML Credit Scout.
Provides /prove endpoint for generating credit scores with ZK proofs.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import numpy as np
import pandas as pd
import lightgbm as lgb
import json
from pathlib import Path
import logging
import pickle
import sys

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from explainability import explain_prediction, load_model_and_features
from ezkl_pipeline import generate_proof
from train_model import credit_score_from_proba

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="PrivateZK Credit Scout API",
    description="ZKML-powered credit scoring with explainable private proofs",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODELS_DIR = Path(__file__).parent.parent / "models"
EZKL_DIR = MODELS_DIR / "ezkl"

# Load model and encoders on startup
model = None
feature_names = None
encoders = None


class FeatureInput(BaseModel):
    """Input features for credit scoring."""
    # Common LendingClub features - adjust based on your model
    loan_amnt: Optional[float] = None
    int_rate: Optional[float] = None
    installment: Optional[float] = None
    annual_inc: Optional[float] = None
    dti: Optional[float] = None
    delinq_2yrs: Optional[float] = None
    inq_last_6mths: Optional[float] = None
    open_acc: Optional[float] = None
    pub_rec: Optional[float] = None
    revol_bal: Optional[float] = None
    revol_util: Optional[float] = None
    total_acc: Optional[float] = None
    total_pymnt: Optional[float] = None
    total_pymnt_inv: Optional[float] = None
    total_rec_prncp: Optional[float] = None
    total_rec_int: Optional[float] = None
    total_rec_late_fee: Optional[float] = None
    recoveries: Optional[float] = None
    collection_recovery_fee: Optional[float] = None
    last_pymnt_amnt: Optional[float] = None
    collections_12_mths_ex_med: Optional[float] = None
    policy_code: Optional[float] = None
    acc_now_delinq: Optional[float] = None
    tot_coll_amt: Optional[float] = None
    tot_cur_bal: Optional[float] = None
    total_rev_hi_lim: Optional[float] = None
    
    class Config:
        extra = "allow"  # Allow additional features


class ProveResponse(BaseModel):
    """Response from /prove endpoint."""
    score: int = Field(..., description="Credit score (300-850)")
    default_probability: float = Field(..., description="Probability of default (0-1)")
    explanations: List[Dict[str, any]] = Field(..., description="Top 3 feature impacts")
    proof_hex: Optional[str] = Field(None, description="ZK proof (hex encoded)")
    proof_available: bool = Field(..., description="Whether ZK proof was generated")


@app.on_event("startup")
async def load_models():
    """Load models and encoders on startup."""
    global model, feature_names, encoders
    
    try:
        model_path = MODELS_DIR / "credit_model.txt"
        if not model_path.exists():
            logger.warning(f"Model not found at {model_path}. Train model first.")
            return
        
        model = lgb.Booster(model_file=str(model_path))
        
        with open(MODELS_DIR / "feature_names.pkl", "rb") as f:
            feature_names = pickle.load(f)
        
        try:
            with open(MODELS_DIR / "encoders.pkl", "rb") as f:
                encoders = pickle.load(f)
        except FileNotFoundError:
            logger.warning("Encoders not found. Will use defaults.")
            encoders = {}
        
        logger.info(f"✓ Loaded model with {len(feature_names)} features")
        
    except Exception as e:
        logger.error(f"Failed to load models: {e}")
        # Don't raise - allow API to start but endpoints will return 503


def prepare_features(feature_input: FeatureInput) -> pd.DataFrame:
    """
    Prepare features from input, applying same encoding as training.
    """
    # Convert input to dict
    input_dict = feature_input.dict(exclude_none=True)
    
    # Create DataFrame with feature names
    feature_dict = {}
    for feat in feature_names:
        if feat in input_dict:
            feature_dict[feat] = [input_dict[feat]]
        else:
            # Fill missing with median/default
            feature_dict[feat] = [0.0]
    
    df = pd.DataFrame(feature_dict)
    
    # Apply encoding (same as training)
    from data_processing import encode_features
    df_encoded, _ = encode_features(df, feature_names, fit=False, encoders=encoders)
    df_encoded.columns = feature_names
    
    return df_encoded


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "PrivateZK Credit Scout API",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "/prove": "POST - Generate credit score with ZK proof",
            "/health": "GET - Health check"
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "features": len(feature_names) if feature_names else 0
    }


@app.post("/prove", response_model=ProveResponse)
async def prove_credit_score(feature_input: FeatureInput):
    """
    Generate credit score with ZK proof and explanations.
    
    Input: JSON with feature values
    Output: Credit score (300-850), explanations, and ZK proof
    """
    if model is None or feature_names is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please train model first."
        )
    
    try:
        # Prepare features
        X = prepare_features(feature_input)
        
        # Get prediction
        proba = model.predict(X.values)[0]
        score = credit_score_from_proba(proba)
        
        # Get explanations
        _, top_impacts = explain_prediction(model, X, feature_names)
        
        # Format explanations
        explanations = [
            {
                "feature": imp["feature"],
                "impact": round(imp["impact"], 4),
                "direction": "increases" if imp["impact"] > 0 else "decreases"
            }
            for imp in top_impacts
        ]
        
        # Generate ZK proof if EZKL is set up
        proof_hex = None
        proof_available = False
        
        try:
            compiled_path = EZKL_DIR / "compiled.ezkl"
            settings_path = EZKL_DIR / "settings.json"
            pk_path = EZKL_DIR / "pk.key"
            
            if all(p.exists() for p in [compiled_path, settings_path, pk_path]):
                # Generate proof
                witness_path = EZKL_DIR / "witness.json"
                proof_path = EZKL_DIR / "proof.json"
                
                input_data = X.values[0].astype(np.float32)
                
                proof_data = generate_proof(
                    input_data,
                    compiled_path,
                    settings_path,
                    pk_path,
                    witness_path,
                    proof_path
                )
                
                # Extract proof hex (format depends on EZKL output)
                if isinstance(proof_data, dict):
                    # Try to find proof in various formats
                    proof_hex = proof_data.get("proof", {}).get("proof", None)
                    if proof_hex is None:
                        # Serialize entire proof as hex
                        proof_hex = json.dumps(proof_data).encode().hex()
                
                proof_available = True
                logger.info("✓ ZK proof generated")
            else:
                logger.warning("EZKL not fully set up. Skipping proof generation.")
                
        except Exception as e:
            logger.warning(f"Proof generation failed: {e}. Returning score without proof.")
        
        return ProveResponse(
            score=score,
            default_probability=round(float(proba), 4),
            explanations=explanations,
            proof_hex=proof_hex,
            proof_available=proof_available
        )
        
    except Exception as e:
        logger.error(f"Error processing request: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

