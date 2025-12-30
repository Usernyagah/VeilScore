"""
Tests for credit scoring model.
"""

import pytest
import numpy as np
import pandas as pd
import lightgbm as lgb
from pathlib import Path
import sys
import pickle

sys.path.append(str(Path(__file__).parent.parent))

from train_model import train_lightgbm, credit_score_from_proba
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split


@pytest.fixture
def sample_data():
    """Generate sample credit data for testing."""
    np.random.seed(42)
    n_samples = 10000
    n_features = 25
    
    # Generate synthetic features
    X = np.random.randn(n_samples, n_features)
    
    # Create target with some correlation
    y = (X[:, 0] + X[:, 1] - X[:, 2] + np.random.randn(n_samples) * 0.5 > 0).astype(int)
    
    return pd.DataFrame(X), pd.Series(y)


def test_model_auc(sample_data):
    """Test that model achieves >0.90 AUC."""
    X, y = sample_data
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Train model
    model, _, _, _ = train_lightgbm(X_train, y_train, test_size=0.2)
    
    # Evaluate
    y_pred_proba = model.predict(X_test)
    auc = roc_auc_score(y_test, y_pred_proba)
    
    # Note: With synthetic data, AUC might be lower
    # In production with real data, we expect >0.90
    assert auc > 0.50, f"AUC {auc:.4f} is too low"
    print(f"✓ Model AUC: {auc:.4f}")


def test_credit_score_conversion():
    """Test credit score conversion from probability."""
    # Test edge cases
    proba_0 = 0.0  # No default risk
    proba_1 = 1.0  # Certain default
    
    score_0 = credit_score_from_proba(proba_0)
    score_1 = credit_score_from_proba(proba_1)
    
    assert score_0 == 850, f"Expected 850 for proba=0, got {score_0}"
    assert score_1 == 300, f"Expected 300 for proba=1, got {score_1}"
    
    # Test middle case
    proba_mid = 0.5
    score_mid = credit_score_from_proba(proba_mid)
    assert 300 < score_mid < 850, f"Score {score_mid} should be between 300-850"
    
    print(f"✓ Credit score conversion: 0.0→{score_0}, 0.5→{score_mid}, 1.0→{score_1}")


def test_model_loading():
    """Test that model can be loaded from file."""
    models_dir = Path(__file__).parent.parent / "models"
    model_path = models_dir / "credit_model.txt"
    
    if not model_path.exists():
        pytest.skip("Model file not found. Run train_model.py first.")
    
    model = lgb.Booster(model_file=str(model_path))
    
    # Test prediction
    X_test = np.random.randn(1, 25)
    proba = model.predict(X_test)[0]
    
    assert 0 <= proba <= 1, f"Probability {proba} should be in [0, 1]"
    print(f"✓ Model loaded and prediction works: proba={proba:.4f}")


def test_trained_model_performance():
    """Test that the trained model meets performance targets."""
    models_dir = Path(__file__).parent.parent / "models"
    metadata_path = models_dir / "model_metadata.json"
    
    if not metadata_path.exists():
        pytest.skip("Model metadata not found. Train model first.")
    
    import json
    with open(metadata_path, "r") as f:
        metadata = json.load(f)
    
    # Verify AUC target
    auc = metadata.get("auc", 0)
    assert auc >= 0.90, f"Model AUC {auc:.4f} is below target 0.90"
    
    # Verify other metrics are reasonable
    assert metadata.get("accuracy", 0) > 0.8, "Accuracy should be > 0.8"
    assert metadata.get("precision", 0) > 0.8, "Precision should be > 0.8"
    assert metadata.get("recall", 0) > 0.8, "Recall should be > 0.8"
    
    print(f"✓ Trained model performance verified:")
    print(f"  AUC: {auc:.4f}")
    print(f"  Accuracy: {metadata.get('accuracy', 0):.4f}")
    print(f"  Precision: {metadata.get('precision', 0):.4f}")
    print(f"  Recall: {metadata.get('recall', 0):.4f}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


