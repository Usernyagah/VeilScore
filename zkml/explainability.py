"""
SHAP-based explainability for credit scoring model.
Extracts top 3 feature impacts (positive/negative).
"""

import numpy as np
import pandas as pd
import lightgbm as lgb
import shap
from pathlib import Path
import logging
import pickle
from typing import List, Dict, Tuple

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).parent / "models"


def load_model_and_features():
    """Load trained model and feature names."""
    model_path = MODELS_DIR / "credit_model.txt"
    feature_path = MODELS_DIR / "feature_names.pkl"
    
    if not model_path.exists():
        raise FileNotFoundError(f"Model not found at {model_path}. Train model first.")
    
    try:
        model = lgb.Booster(model_file=str(model_path))
    except:
        # Try loading as sklearn model
        import joblib
        model = joblib.load(str(model_path.with_suffix('.pkl')))
    
    with open(feature_path, "rb") as f:
        feature_names = pickle.load(f)
    
    return model, feature_names


def compute_shap_values(model: lgb.Booster, X: pd.DataFrame, 
                       feature_names: List[str], n_samples: int = 1000) -> np.ndarray:
    """
    Compute SHAP values for the model.
    
    Args:
        model: Trained LightGBM model
        X: Feature matrix
        feature_names: List of feature names
        n_samples: Number of samples to use for SHAP (for speed)
    
    Returns:
        SHAP values array
    """
    logger.info(f"Computing SHAP values for {len(X)} samples...")
    
    # Sample data for SHAP (TreeExplainer is fast but still benefits from sampling)
    if len(X) > n_samples:
        X_sample = X.sample(n=min(n_samples, len(X)), random_state=42)
    else:
        X_sample = X
    
    # Create TreeExplainer
    explainer = shap.TreeExplainer(model)
    
    # Compute SHAP values
    shap_values = explainer.shap_values(X_sample)
    
    # For binary classification, get values for positive class
    if isinstance(shap_values, list):
        shap_values = shap_values[1]  # Positive class (default)
    
    logger.info(f"Computed SHAP values: shape {shap_values.shape}")
    
    return shap_values, X_sample


def get_top_impacts(shap_values: np.ndarray, feature_names: List[str], 
                   top_k: int = 3) -> List[Dict]:
    """
    Get top K feature impacts (positive and negative).
    
    Args:
        shap_values: SHAP values array (n_samples, n_features)
        feature_names: List of feature names
        top_k: Number of top impacts to return
    
    Returns:
        List of dicts with feature, impact, and direction
    """
    # Average absolute SHAP values across samples
    mean_abs_shap = np.abs(shap_values).mean(axis=0)
    
    # Get top K features by absolute impact
    top_indices = np.argsort(mean_abs_shap)[-top_k:][::-1]
    
    impacts = []
    for idx in top_indices:
        mean_shap = shap_values[:, idx].mean()
        feature_name = feature_names[idx]
        
        impacts.append({
            'feature': feature_name,
            'impact': float(mean_shap),
            'abs_impact': float(mean_abs_shap[idx]),
            'direction': 'positive' if mean_shap > 0 else 'negative'
        })
    
    # Sort by absolute impact
    impacts.sort(key=lambda x: x['abs_impact'], reverse=True)
    
    return impacts[:top_k]


def explain_prediction(model, X_instance: pd.DataFrame, 
                      feature_names: List[str]) -> Tuple[float, List[Dict]]:
    """
    Explain a single prediction.
    
    Args:
        model: Trained model (LightGBM Booster or LGBMClassifier)
        X_instance: Single row of features (1, n_features)
        feature_names: List of feature names
    
    Returns:
        Tuple of (prediction_proba, top_impacts)
    """
    # Get prediction
    if hasattr(model, 'predict_proba'):
        # sklearn-style model
        proba = model.predict_proba(X_instance.values)[0][1]
    else:
        # LightGBM Booster
        proba = model.predict(X_instance.values)[0]
    
    # Compute SHAP for this instance
    try:
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_instance)
        
        if isinstance(shap_values, list):
            shap_values = shap_values[1]  # Positive class
        
        shap_values = shap_values[0]  # Single instance
    except Exception as e:
        # Fallback: use feature importance
        logger.warning(f"SHAP computation failed: {e}. Using feature importance.")
        if hasattr(model, 'feature_importances_'):
            importance = model.feature_importances_
        else:
            importance = model.feature_importance(importance_type='gain')
        
        # Normalize to approximate SHAP values
        shap_values = importance / importance.sum() * (proba - 0.5)
    
    # Get top impacts
    impacts = []
    for i, (feature, shap_val) in enumerate(zip(feature_names, shap_values)):
        impacts.append({
            'feature': feature,
            'impact': float(shap_val),
            'abs_impact': float(abs(shap_val))
        })
    
    # Sort and get top 3
    impacts.sort(key=lambda x: x['abs_impact'], reverse=True)
    top_impacts = impacts[:3]
    
    return float(proba), top_impacts


def compute_global_explanations(X: pd.DataFrame = None) -> List[Dict]:
    """
    Compute global feature importance explanations.
    Uses test set if X is not provided.
    """
    logger.info("Computing global SHAP explanations...")
    
    model, feature_names = load_model_and_features()
    
    # Load test data if X not provided
    if X is None:
        data_dir = Path(__file__).parent / "data"
        try:
            X = pd.read_csv(data_dir / "X_processed.csv")
            # Ensure correct feature order
            X = X[feature_names]
        except FileNotFoundError:
            logger.warning("Test data not found. Using model's feature importance instead.")
            # Fallback to feature importance
            importance = model.feature_importance(importance_type='gain')
            feature_imp = list(zip(feature_names, importance))
            feature_imp.sort(key=lambda x: x[1], reverse=True)
            
            impacts = []
            for feat, imp in feature_imp[:3]:
                impacts.append({
                    'feature': feat,
                    'impact': float(imp),
                    'abs_impact': float(imp),
                    'direction': 'positive'  # Feature importance is always positive
                })
            return impacts
    
    # Compute SHAP values
    shap_values, X_sample = compute_shap_values(model, X, feature_names)
    
    # Get top impacts
    top_impacts = get_top_impacts(shap_values, feature_names, top_k=3)
    
    logger.info("Top 3 feature impacts:")
    for i, impact in enumerate(top_impacts, 1):
        logger.info(f"  {i}. {impact['feature']}: {impact['impact']:.4f} ({impact['direction']})")
    
    return top_impacts


if __name__ == "__main__":
    # Compute and save global explanations
    impacts = compute_global_explanations()
    
    # Save to file
    import json
    with open(MODELS_DIR / "explanations.json", "w") as f:
        json.dump(impacts, f, indent=2)
    
    logger.info(f"\nSaved explanations to {MODELS_DIR / 'explanations.json'}")

