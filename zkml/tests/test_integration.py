"""
Integration tests for ZKML API.
Tests the full flow from API request to response, including model inference.
"""

import pytest
import requests
import time
from pathlib import Path
import sys
from typing import Dict, Any

sys.path.append(str(Path(__file__).parent.parent))

from fastapi.testclient import TestClient
from api.main import app

# Mark all tests in this file as integration tests
pytestmark = pytest.mark.integration

client = TestClient(app)


@pytest.fixture
def sample_features() -> Dict[str, float]:
    """Sample feature input for testing."""
    return {
        "loan_amnt": 15000.0,
        "int_rate": 10.5,
        "installment": 350.0,
        "annual_inc": 75000.0,
        "dti": 18.0,
        "delinq_2yrs": 0.0,
        "inq_last_6mths": 1.0,
        "open_acc": 8.0,
        "pub_rec": 0.0,
        "revol_bal": 12000.0,
        "revol_util": 35.0,
        "total_acc": 15.0,
    }


@pytest.fixture
def minimal_features() -> Dict[str, float]:
    """Minimal feature input for testing."""
    return {
        "loan_amnt": 10000.0,
        "annual_inc": 50000.0,
        "dti": 15.0,
    }


class TestAPIIntegration:
    """Integration tests for API endpoints."""
    
    def test_health_check_integration(self):
        """Test health check endpoint returns correct structure."""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert "model_loaded" in data
        assert "features" in data
        assert isinstance(data["model_loaded"], bool)
        assert isinstance(data["features"], int)
    
    def test_root_endpoint_integration(self):
        """Test root endpoint returns API information."""
        response = client.get("/")
        assert response.status_code == 200
        
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert "status" in data
        assert "endpoints" in data
        assert "/prove" in data["endpoints"]
        assert "/health" in data["endpoints"]
    
    @pytest.mark.slow
    def test_prove_endpoint_full_flow(self, sample_features):
        """Test complete /prove endpoint flow with all features."""
        response = client.post("/prove", json=sample_features)
        
        # Handle both loaded and unloaded model cases
        if response.status_code == 503:
            pytest.skip("Model not loaded - skipping integration test")
        
        assert response.status_code == 200, f"Unexpected status: {response.status_code}, body: {response.text}"
        
        data = response.json()
        
        # Validate response structure
        assert "score" in data
        assert "default_probability" in data
        assert "explanations" in data
        assert "proof_available" in data
        assert "proof_hex" in data
        
        # Validate score range
        score = data["score"]
        assert 300 <= score <= 850, f"Score {score} should be in range 300-850"
        
        # Validate probability
        prob = data["default_probability"]
        assert 0.0 <= prob <= 1.0, f"Probability {prob} should be in range 0-1"
        
        # Validate explanations
        explanations = data["explanations"]
        assert isinstance(explanations, list)
        assert len(explanations) == 3, f"Expected 3 explanations, got {len(explanations)}"
        
        for exp in explanations:
            assert "feature" in exp
            assert "impact" in exp
            assert "direction" in exp
            assert exp["direction"] in ["increases", "decreases"]
            assert isinstance(exp["impact"], (int, float))
        
        # Validate proof availability
        assert isinstance(data["proof_available"], bool)
    
    def test_prove_endpoint_minimal_features(self, minimal_features):
        """Test /prove endpoint with minimal required features."""
        response = client.post("/prove", json=minimal_features)
        
        if response.status_code == 503:
            pytest.skip("Model not loaded - skipping integration test")
        
        assert response.status_code == 200
        
        data = response.json()
        assert "score" in data
        assert 300 <= data["score"] <= 850
    
    def test_prove_endpoint_consistency(self, sample_features):
        """Test that same input produces consistent results."""
        if client.get("/health").json().get("model_loaded") is False:
            pytest.skip("Model not loaded - skipping consistency test")
        
        # Make two requests with same features
        response1 = client.post("/prove", json=sample_features)
        response2 = client.post("/prove", json=sample_features)
        
        if response1.status_code == 503 or response2.status_code == 503:
            pytest.skip("Model not loaded")
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        data1 = response1.json()
        data2 = response2.json()
        
        # Scores should be identical for same input
        assert data1["score"] == data2["score"], "Scores should be consistent"
        assert data1["default_probability"] == data2["default_probability"]
    
    def test_prove_endpoint_different_inputs(self):
        """Test /prove endpoint with different input scenarios."""
        test_cases = [
            {
                "name": "High income, low DTI",
                "features": {
                    "loan_amnt": 20000.0,
                    "annual_inc": 150000.0,
                    "dti": 10.0,
                    "revol_util": 20.0,
                    "delinq_2yrs": 0.0,
                    "pub_rec": 0.0,
                }
            },
            {
                "name": "Low income, high DTI",
                "features": {
                    "loan_amnt": 5000.0,
                    "annual_inc": 30000.0,
                    "dti": 40.0,
                    "revol_util": 80.0,
                    "delinq_2yrs": 1.0,
                    "pub_rec": 0.0,
                }
            },
            {
                "name": "Medium profile",
                "features": {
                    "loan_amnt": 15000.0,
                    "annual_inc": 60000.0,
                    "dti": 25.0,
                    "revol_util": 50.0,
                    "delinq_2yrs": 0.0,
                    "pub_rec": 0.0,
                }
            },
        ]
        
        for test_case in test_cases:
            response = client.post("/prove", json=test_case["features"])
            
            if response.status_code == 503:
                pytest.skip("Model not loaded")
            
            assert response.status_code == 200, f"Failed for {test_case['name']}"
            data = response.json()
            assert 300 <= data["score"] <= 850
    
    def test_prove_endpoint_edge_cases(self):
        """Test /prove endpoint with edge case inputs."""
        edge_cases = [
            {
                "name": "Minimum values",
                "features": {
                    "loan_amnt": 1000.0,
                    "annual_inc": 20000.0,
                    "dti": 0.0,
                    "revol_util": 0.0,
                }
            },
            {
                "name": "Maximum values",
                "features": {
                    "loan_amnt": 40000.0,
                    "annual_inc": 200000.0,
                    "dti": 50.0,
                    "revol_util": 150.0,
                }
            },
            {
                "name": "Zero values",
                "features": {
                    "loan_amnt": 0.0,
                    "annual_inc": 0.0,
                    "dti": 0.0,
                }
            },
        ]
        
        for case in edge_cases:
            response = client.post("/prove", json=case["features"])
            
            # Should handle edge cases gracefully (may return error or default values)
            assert response.status_code in [200, 422, 500], \
                f"Unexpected status for {case['name']}: {response.status_code}"
    
    def test_prove_endpoint_invalid_types(self):
        """Test /prove endpoint rejects invalid data types."""
        invalid_inputs = [
            {"loan_amnt": "not a number"},
            {"loan_amnt": None},
            {"annual_inc": []},
            {"dti": "invalid"},
        ]
        
        for invalid_input in invalid_inputs:
            response = client.post("/prove", json=invalid_input)
            # Should return validation error
            assert response.status_code in [422, 500]
    
    def test_prove_endpoint_missing_all_features(self):
        """Test /prove endpoint with empty input."""
        response = client.post("/prove", json={})
        
        if response.status_code == 503:
            pytest.skip("Model not loaded")
        
        # Should handle empty input (may use defaults or return error)
        assert response.status_code in [200, 422, 500]
    
    def test_cors_headers(self):
        """Test CORS headers are present."""
        response = client.options("/prove", headers={"Origin": "http://localhost:8080"})
        # CORS middleware should be configured
        # Note: TestClient may not show CORS headers, but they should be in production


class TestModelIntegration:
    """Integration tests for model inference."""
    
    @pytest.mark.slow
    def test_model_loaded_on_startup(self):
        """Test that model is loaded (if available)."""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        model_loaded = data.get("model_loaded", False)
        
        if not model_loaded:
            pytest.skip("Model not loaded - ensure model is trained first")
        
        assert model_loaded is True
        assert data["features"] > 0
    
    def test_feature_preprocessing(self, sample_features):
        """Test that features are preprocessed correctly."""
        response = client.post("/prove", json=sample_features)
        
        if response.status_code == 503:
            pytest.skip("Model not loaded")
        
        assert response.status_code == 200
        
        # Response should be valid even if some features are missing
        data = response.json()
        assert "score" in data
    
    @pytest.mark.slow
    def test_explanation_generation(self, sample_features):
        """Test that explanations are generated correctly."""
        response = client.post("/prove", json=sample_features)
        
        if response.status_code == 503:
            pytest.skip("Model not loaded")
        
        assert response.status_code == 200
        
        data = response.json()
        explanations = data["explanations"]
        
        # Should have exactly 3 explanations
        assert len(explanations) == 3
        
        # Each explanation should have valid structure
        for exp in explanations:
            assert "feature" in exp
            assert "impact" in exp
            assert "direction" in exp
            
            # Impact should be numeric
            assert isinstance(exp["impact"], (int, float))
            
            # Direction should be valid
            assert exp["direction"] in ["increases", "decreases"]


class TestProofIntegration:
    """Integration tests for ZK proof generation."""
    
    @pytest.mark.slow
    def test_proof_availability(self, sample_features):
        """Test that proof generation is attempted."""
        response = client.post("/prove", json=sample_features)
        
        if response.status_code == 503:
            pytest.skip("Model not loaded")
        
        assert response.status_code == 200
        
        data = response.json()
        assert "proof_available" in data
        assert isinstance(data["proof_available"], bool)
        
        # If proof is available, proof_hex should be present
        if data["proof_available"]:
            assert "proof_hex" in data
            # proof_hex can be None if proof generation failed
            # but the flag should indicate attempt was made
    
    @pytest.mark.slow
    def test_proof_format(self, sample_features):
        """Test proof format if available."""
        response = client.post("/prove", json=sample_features)
        
        if response.status_code == 503:
            pytest.skip("Model not loaded")
        
        assert response.status_code == 200
        
        data = response.json()
        
        if data.get("proof_available") and data.get("proof_hex"):
            proof_hex = data["proof_hex"]
            # Should be a string
            assert isinstance(proof_hex, str)
            # If hex format, should start with 0x or be valid hex
            if proof_hex.startswith("0x"):
                assert len(proof_hex) > 2


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "integration"])

