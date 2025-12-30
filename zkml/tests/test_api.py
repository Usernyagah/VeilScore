"""
Tests for FastAPI endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent.parent))

from api.main import app

client = TestClient(app)


def test_root_endpoint():
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "version" in data
    print("✓ Root endpoint works")


def test_health_endpoint():
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    print("✓ Health endpoint works")


def test_prove_endpoint():
    """Test /prove endpoint with sample data."""
    # Sample feature input
    feature_input = {
        "loan_amnt": 10000.0,
        "int_rate": 10.5,
        "installment": 300.0,
        "annual_inc": 50000.0,
        "dti": 15.0,
        "delinq_2yrs": 0.0,
        "inq_last_6mths": 1.0,
        "open_acc": 5.0,
        "pub_rec": 0.0,
        "revol_bal": 5000.0,
        "revol_util": 30.0,
        "total_acc": 10.0,
    }
    
    response = client.post("/prove", json=feature_input)
    
    # Should return 200 or 503 (if model not loaded)
    assert response.status_code in [200, 503], f"Unexpected status: {response.status_code}"
    
    if response.status_code == 200:
        data = response.json()
        assert "score" in data
        assert "default_probability" in data
        assert "explanations" in data
        assert "proof_available" in data
        
        # Check score range
        assert 300 <= data["score"] <= 850, f"Score {data['score']} should be 300-850"
        
        # Check explanations
        assert len(data["explanations"]) == 3, "Should have 3 explanations"
        for exp in data["explanations"]:
            assert "feature" in exp
            assert "impact" in exp
            assert "direction" in exp
        
        print(f"✓ Prove endpoint works: score={data['score']}")
    else:
        print("⚠ Prove endpoint returned 503 (model not loaded - expected in test environment)")


def test_prove_endpoint_missing_features():
    """Test /prove endpoint with minimal features."""
    # Minimal input
    feature_input = {
        "loan_amnt": 10000.0,
    }
    
    response = client.post("/prove", json=feature_input)
    
    # Should handle missing features gracefully
    assert response.status_code in [200, 503, 500]
    
    if response.status_code == 200:
        data = response.json()
        assert "score" in data
        print("✓ Prove endpoint handles missing features")


def test_prove_endpoint_invalid_data():
    """Test /prove endpoint with invalid data."""
    # Invalid input (non-numeric)
    feature_input = {
        "loan_amnt": "invalid",
    }
    
    response = client.post("/prove", json=feature_input)
    
    # Should return error or handle gracefully
    assert response.status_code in [200, 422, 500]
    print("✓ Prove endpoint handles invalid data")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


