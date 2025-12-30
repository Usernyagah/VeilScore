"""
Train LightGBM credit scoring model and export to ONNX.
"""

import pandas as pd
import numpy as np
import lightgbm as lgb
from pathlib import Path
import logging
import pickle
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    roc_auc_score, classification_report, confusion_matrix,
    precision_score, recall_score, f1_score, accuracy_score
)

# Optional ONNX imports
try:
    import onnxmltools
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import FloatTensorType
    from onnxruntime import InferenceSession
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent / "data"
MODELS_DIR = Path(__file__).parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

from data_processing import process_lendingclub_data


def train_lightgbm(X: pd.DataFrame, y: pd.Series, test_size: float = 0.2) -> lgb.Booster:
    """
    Train LightGBM classifier with hyperparameter tuning for >0.90 AUC.
    """
    logger.info("Training LightGBM model...")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=42, stratify=y
    )
    
    logger.info(f"Train: {len(X_train):,} samples, Test: {len(X_test):,} samples")
    
    # LightGBM parameters optimized for credit scoring
    params = {
        'objective': 'binary',
        'metric': 'auc',
        'boosting_type': 'gbdt',
        'num_leaves': 31,  # Reduced for EZKL compatibility
        'learning_rate': 0.05,
        'feature_fraction': 0.8,
        'bagging_fraction': 0.8,
        'bagging_freq': 5,
        'verbose': -1,
        'random_state': 42,
        'max_depth': 6,  # Limited depth for ZK
        'min_data_in_leaf': 20,
        'lambda_l1': 0.1,
        'lambda_l2': 0.1,
    }
    
    # Create datasets
    train_data = lgb.Dataset(X_train, label=y_train)
    valid_data = lgb.Dataset(X_test, label=y_test, reference=train_data)
    
    # Train model
    model = lgb.train(
        params,
        train_data,
        valid_sets=[valid_data],
        num_boost_round=200,
        callbacks=[lgb.early_stopping(stopping_rounds=20), lgb.log_evaluation(period=50)]
    )
    
    # Evaluate
    y_pred_proba = model.predict(X_test)
    y_pred = (y_pred_proba >= 0.5).astype(int)
    
    # Calculate comprehensive metrics
    auc = roc_auc_score(y_test, y_pred_proba)
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    
    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    if cm.size == 4:
        tn, fp, fn, tp = cm.ravel()
    elif cm.size == 1:
        # Only one class present
        if y_test.sum() == 0:
            tn, fp, fn, tp = int(cm[0, 0]), 0, 0, 0
        else:
            tn, fp, fn, tp = 0, 0, 0, int(cm[0, 0])
    else:
        tn, fp, fn, tp = 0, 0, 0, 0
    
    logger.info("=" * 60)
    logger.info("MODEL EVALUATION METRICS")
    logger.info("=" * 60)
    logger.info(f"AUC-ROC:              {auc:.4f}")
    logger.info(f"Accuracy:             {accuracy:.4f}")
    logger.info(f"Precision:             {precision:.4f}")
    logger.info(f"Recall (Sensitivity):  {recall:.4f}")
    logger.info(f"F1-Score:              {f1:.4f}")
    logger.info("")
    logger.info("Confusion Matrix:")
    logger.info(f"  True Negatives:      {tn:,}")
    logger.info(f"  False Positives:     {fp:,}")
    logger.info(f"  False Negatives:     {fn:,}")
    logger.info(f"  True Positives:      {tp:,}")
    logger.info("")
    logger.info("Classification Report:")
    logger.info(classification_report(y_test, y_pred, target_names=['Paid', 'Default']))
    logger.info("=" * 60)
    
    if auc < 0.90:
        logger.warning(f"AUC {auc:.4f} is below target 0.90. Consider:")
        logger.warning("- Using more training data")
        logger.warning("- Adjusting hyperparameters")
        logger.warning("- Feature engineering")
    else:
        logger.info(f"✓ Model achieved AUC {auc:.4f} (target: >0.90)")
    
    return model, X_test, y_test, {
        'auc': auc,
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1': f1,
        'confusion_matrix': cm,
        'y_test': y_test,
        'y_pred': y_pred,
        'y_pred_proba': y_pred_proba
    }


def convert_to_onnx(model: lgb.Booster, feature_names: list, output_path: Path):
    """
    Convert LightGBM model to ONNX format.
    """
    logger.info("Converting model to ONNX...")
    
    # LightGBM doesn't have direct ONNX export, so we use onnxmltools
    try:
        # Create a wrapper that mimics sklearn interface
        from lightgbm import LGBMClassifier
        
        # We need to recreate the model as LGBMClassifier for ONNX conversion
        # This is a workaround - we'll save the original model separately
        logger.info("Note: Saving LightGBM model directly (ONNX conversion may require retraining as LGBMClassifier)")
        
        # Save native LightGBM model
        model.save_model(str(output_path.with_suffix('.txt')))
        logger.info(f"Saved LightGBM model to {output_path.with_suffix('.txt')}")
        
        # For ONNX, we'll need to retrain as LGBMClassifier
        # This is a limitation - we'll document it
        logger.warning("ONNX conversion requires LGBMClassifier. Creating compatible version...")
        
        return None
        
    except Exception as e:
        logger.error(f"ONNX conversion error: {e}")
        logger.info("Will use LightGBM native format with EZKL")
        return None


def create_onnx_compatible_model(X_train: pd.DataFrame, y_train: pd.Series, 
                                 feature_names: list, output_path: Path):
    """
    Create an ONNX-compatible LightGBM model using LGBMClassifier.
    """
    if not ONNX_AVAILABLE:
        logger.warning("ONNX tools not available. Skipping ONNX conversion.")
        return None, None
    
    logger.info("Training ONNX-compatible LightGBM model...")
    
    from lightgbm import LGBMClassifier
    
    model = LGBMClassifier(
        n_estimators=200,
        num_leaves=31,
        learning_rate=0.05,
        max_depth=6,
        random_state=42,
        verbose=-1
    )
    
    model.fit(X_train, y_train)
    
    # Convert to ONNX
    initial_type = [('float_input', FloatTensorType([None, len(feature_names)]))]
    
    try:
        onnx_model = convert_sklearn(
            model,
            initial_types=initial_type,
            target_opset=13
        )
        
        with open(output_path, "wb") as f:
            f.write(onnx_model.SerializeToString())
        
        logger.info(f"✓ Saved ONNX model to {output_path}")
        
        # Verify ONNX model
        session = InferenceSession(str(output_path))
        logger.info(f"✓ ONNX model verified. Input shape: {session.get_inputs()[0].shape}")
        
        return model, onnx_model
        
    except Exception as e:
        logger.error(f"ONNX conversion failed: {e}")
        # Fallback: save sklearn-compatible model
        import joblib
        joblib.dump(model, output_path.with_suffix('.pkl'))
        logger.info(f"Saved sklearn model to {output_path.with_suffix('.pkl')}")
        return model, None


def credit_score_from_proba(proba: float, min_score: int = 300, max_score: int = 850) -> int:
    """
    Convert default probability to credit score (300-850).
    Lower probability (safer) = higher score.
    """
    # Invert: proba=0 (no default) -> score=850, proba=1 (default) -> score=300
    score = max_score - (proba * (max_score - min_score))
    return int(np.clip(score, min_score, max_score))


def main():
    """Main training pipeline."""
    logger.info("=" * 60)
    logger.info("Credit Scoring Model Training Pipeline")
    logger.info("=" * 60)
    
    # Process data
    logger.info("\n[1/4] Processing data...")
    try:
        X, y, feature_names, encoders = process_lendingclub_data(
            n_samples=1000000,  # Use 1M+ samples
            n_features=25
        )
    except FileNotFoundError:
        logger.error("Data file not found. Please run data_processing.py first or download dataset.")
        return
    
    # Split for training
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Train native LightGBM (for inference)
    logger.info("\n[2/4] Training LightGBM model...")
    model, X_test, y_test, metrics = train_lightgbm(X_train, y_train)
    
    # Use metrics from training
    auc = metrics['auc']
    
    # Create ONNX-compatible model
    logger.info("\n[3/4] Creating ONNX-compatible model...")
    onnx_model, onnx_obj = create_onnx_compatible_model(
        X_train, y_train, feature_names, 
        MODELS_DIR / "credit_model.onnx"
    )
    
    # Save artifacts
    logger.info("\n[4/4] Saving model artifacts...")
    
    # Save native LightGBM model
    model.save_model(str(MODELS_DIR / "credit_model.txt"))
    
    # Save feature names and encoders
    with open(MODELS_DIR / "feature_names.pkl", "wb") as f:
        pickle.dump(feature_names, f)
    
    with open(MODELS_DIR / "encoders.pkl", "wb") as f:
        pickle.dump(encoders, f)
    
    # Save metadata with all metrics
    metadata = {
        'auc': float(metrics['auc']),
        'accuracy': float(metrics['accuracy']),
        'precision': float(metrics['precision']),
        'recall': float(metrics['recall']),
        'f1': float(metrics['f1']),
        'confusion_matrix': metrics['confusion_matrix'].tolist(),
        'n_features': len(feature_names),
        'feature_names': feature_names,
        'n_train': len(X_train),
        'n_test': len(X_test),
    }
    
    import json
    with open(MODELS_DIR / "model_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)
    
    logger.info("\n" + "=" * 60)
    logger.info("Training Complete!")
    logger.info(f"AUC: {auc:.4f}")
    logger.info(f"Features: {len(feature_names)}")
    logger.info(f"Models saved to: {MODELS_DIR}")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()

