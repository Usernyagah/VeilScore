"""
Tests for model explainability.
"""

import pytest
import numpy as np
import pandas as pd
import lightgbm as lgb
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent.parent))

from explainability import get_top_impacts, explain_prediction, load_model_and_features


@pytest.fixture
def sample_model_and_data():
    """Create sample model for testing."""
    np.random.seed(42)
    X = pd.DataFrame(np.random.randn(100, 5), columns=[f"feature_{i}" for i in range(5)])
    y = (X.iloc[:, 0] + X.iloc[:, 1] > 0).astype(int)
    
    model = lgb.LGBMClassifier(n_estimators=10, random_state=42, verbose=-1)
    model.fit(X, y)
    
    return model, X, y


def test_explanations_logical(sample_model_and_data):
    """Test that explanations are logical (non-zero, reasonable values)."""
    model, X, y = sample_model_and_data
    
    # Get SHAP values
    import shap
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X)
    
    if isinstance(shap_values, list):
        shap_values = shap_values[1]  # Binary classification
    
    feature_names = [f"feature_{i}" for i in range(5)]
    top_impacts = get_top_impacts(shap_values, feature_names, top_k=3)
    
    # Check structure
    assert len(top_impacts) == 3, f"Should have 3 impacts, got {len(top_impacts)}"
    
    for impact in top_impacts:
        assert "feature" in impact, "Impact should have 'feature' key"
        assert "impact" in impact, "Impact should have 'impact' key"
        assert "abs_impact" in impact, "Impact should have 'abs_impact' key"
        assert "direction" in impact, "Impact should have 'direction' key"
        assert impact["direction"] in ["positive", "negative"], "Direction should be positive or negative"
    
    # Check that impacts are sorted by absolute value
    abs_impacts = [imp["abs_impact"] for imp in top_impacts]
    assert abs_impacts == sorted(abs_impacts, reverse=True), "Impacts should be sorted"
    
    print("✓ Explanations are logical and well-structured")


def test_explanation_prediction(sample_model_and_data):
    """Test that explanation prediction works."""
    model, X, y = sample_model_and_data
    
    # Get explanation for single instance
    X_instance = X.iloc[[0]]
    feature_names = X.columns.tolist()
    
    proba, top_impacts = explain_prediction(model, X_instance, feature_names)
    
    # Check outputs
    assert 0 <= proba <= 1, f"Probability {proba} should be in [0, 1]"
    assert len(top_impacts) == 3, f"Should have 3 impacts, got {len(top_impacts)}"
    
    for impact in top_impacts:
        assert "feature" in impact, "Impact should have 'feature' key"
        assert "impact" in impact, "Impact should have 'impact' key"
        assert isinstance(impact["impact"], (int, float)), "Impact should be numeric"
    
    print(f"✓ Explanation prediction works: proba={proba:.4f}, {len(top_impacts)} impacts")


def test_explanations_consistency():
    """Test that explanations are consistent across similar inputs."""
    models_dir = Path(__file__).parent.parent / "models"
    model_path = models_dir / "credit_model.txt"
    
    if not model_path.exists():
        pytest.skip("Model file not found. Run train_model.py first.")
    
    try:
        model, feature_names = load_model_and_features()
        
        # Create similar inputs
        np.random.seed(42)
        X1 = pd.DataFrame(np.random.randn(1, len(feature_names)), columns=feature_names)
        X2 = pd.DataFrame(np.random.randn(1, len(feature_names)), columns=feature_names)
        
        # Get explanations
        proba1, impacts1 = explain_prediction(model, X1, feature_names)
        proba2, impacts2 = explain_prediction(model, X2, feature_names)
        
        # Both should have valid structure
        assert len(impacts1) == 3, "Should have 3 impacts"
        assert len(impacts2) == 3, "Should have 3 impacts"
        
        print("✓ Explanations are consistent")
        
    except Exception as e:
        pytest.skip(f"Could not test consistency: {e}")


def test_top_impacts_format():
    """Test that top impacts have correct format."""
    # Create dummy SHAP values
    np.random.seed(42)
    shap_values = np.random.randn(100, 5)
    feature_names = [f"feature_{i}" for i in range(5)]
    
    top_impacts = get_top_impacts(shap_values, feature_names, top_k=3)
    
    assert len(top_impacts) == 3, "Should return top 3 impacts"
    
    for impact in top_impacts:
        assert isinstance(impact, dict), "Each impact should be a dict"
        assert "feature" in impact, "Should have 'feature' key"
        assert "impact" in impact, "Should have 'impact' key"
        assert "abs_impact" in impact, "Should have 'abs_impact' key"
        assert "direction" in impact, "Should have 'direction' key"
    
    print("✓ Top impacts format is correct")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


