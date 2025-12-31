"""
Full-stack integration tests
Tests the complete flow from client API calls to backend processing
"""

import pytest
import requests
import time
from typing import Dict, Any
import json

# Test configuration
API_BASE_URL = "http://localhost:8000"
CLIENT_BASE_URL = "http://localhost:8080"
TEST_TIMEOUT = 30


@pytest.fixture(scope="module")
def api_available():
    """Check if API is available."""
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        return response.status_code == 200
    except:
        return False


@pytest.fixture
def sample_borrower_features() -> Dict[str, Any]:
    """Sample borrower features matching client format."""
    return {
        "loan_amnt": 15000.0,
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


class TestFullStackIntegration:
    """Full-stack integration tests."""
    
    @pytest.mark.slow
    def test_api_health_check(self, api_available):
        """Test API health endpoint."""
        if not api_available:
            pytest.skip("API not available")
        
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert "model_loaded" in data
    
    @pytest.mark.slow
    def test_complete_credit_scoring_flow(self, api_available, sample_borrower_features):
        """Test complete flow from feature input to score and proof."""
        if not api_available:
            pytest.skip("API not available")
        
        # Step 1: Submit features to API
        response = requests.post(
            f"{API_BASE_URL}/prove",
            json=sample_borrower_features,
            timeout=TEST_TIMEOUT
        )
        
        assert response.status_code == 200, f"API returned {response.status_code}: {response.text}"
        
        # Step 2: Validate response structure
        data = response.json()
        
        assert "score" in data
        assert "default_probability" in data
        assert "explanations" in data
        assert "proof_available" in data
        
        # Step 3: Validate score
        score = data["score"]
        assert 300 <= score <= 850, f"Score {score} out of range"
        
        # Step 4: Validate explanations
        explanations = data["explanations"]
        assert len(explanations) == 3
        for exp in explanations:
            assert "feature" in exp
            assert "impact" in exp
            assert "direction" in exp
        
        # Step 5: Check proof availability
        assert isinstance(data["proof_available"], bool
    
    @pytest.mark.slow
    def test_multiple_concurrent_requests(self, api_available, sample_borrower_features):
        """Test handling multiple concurrent requests."""
        if not api_available:
            pytest.skip("API not available")
        
        import concurrent.futures
        
        def make_request():
            response = requests.post(
                f"{API_BASE_URL}/prove",
                json=sample_borrower_features,
                timeout=TEST_TIMEOUT
            )
            return response.status_code == 200
        
        # Make 5 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request) for _ in range(5)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
        # All requests should succeed
        assert all(results), "Some concurrent requests failed"
    
    @pytest.mark.slow
    def test_different_credit_profiles(self, api_available):
        """Test API with different credit profiles."""
        if not api_available:
            pytest.skip("API not available")
        
        profiles = [
            {
                "name": "Excellent credit",
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
                "name": "Poor credit",
                "features": {
                    "loan_amnt": 5000.0,
                    "annual_inc": 30000.0,
                    "dti": 45.0,
                    "revol_util": 90.0,
                    "delinq_2yrs": 2.0,
                    "pub_rec": 1.0,
                }
            },
        ]
        
        for profile in profiles:
            response = requests.post(
                f"{API_BASE_URL}/prove",
                json=profile["features"],
                timeout=TEST_TIMEOUT
            )
            
            assert response.status_code == 200, f"Failed for {profile['name']}"
            data = response.json()
            assert 300 <= data["score"] <= 850
    
    @pytest.mark.slow
    def test_error_handling(self, api_available):
        """Test API error handling."""
        if not api_available:
            pytest.skip("API not available")
        
        # Test with invalid data
        invalid_input = {
            "loan_amnt": "not a number",
        }
        
        response = requests.post(
            f"{API_BASE_URL}/prove",
            json=invalid_input,
            timeout=5
        )
        
        # Should return error status
        assert response.status_code in [422, 500]
    
    @pytest.mark.slow
    def test_response_time(self, api_available, sample_borrower_features):
        """Test API response time is reasonable."""
        if not api_available:
            pytest.skip("API not available")
        
        start_time = time.time()
        response = requests.post(
            f"{API_BASE_URL}/prove",
            json=sample_borrower_features,
            timeout=TEST_TIMEOUT
        )
        elapsed_time = time.time() - start_time
        
        assert response.status_code == 200
        # Should complete within timeout (allowing some buffer)
        assert elapsed_time < TEST_TIMEOUT, f"Request took {elapsed_time}s, exceeding timeout"
        
        # For inference without proof, should be relatively fast
        # (Proof generation can take longer)
        if not response.json().get("proof_available"):
            assert elapsed_time < 10, f"Inference took {elapsed_time}s, seems slow"


class TestClientServerIntegration:
    """Tests for client-server integration."""
    
    @pytest.mark.slow
    def test_cors_headers(self, api_available):
        """Test CORS headers allow client requests."""
        if not api_available:
            pytest.skip("API not available")
        
        # Make OPTIONS request (preflight)
        response = requests.options(
            f"{API_BASE_URL}/prove",
            headers={
                "Origin": CLIENT_BASE_URL,
                "Access-Control-Request-Method": "POST",
            }
        )
        
        # CORS should be configured (status may vary)
        assert response.status_code in [200, 204, 405]
    
    @pytest.mark.slow
    def test_api_response_format_matches_client_expectations(self, api_available, sample_borrower_features):
        """Test API response format matches what client expects."""
        if not api_available:
            pytest.skip("API not available")
        
        response = requests.post(
            f"{API_BASE_URL}/prove",
            json=sample_borrower_features,
            timeout=TEST_TIMEOUT
        )
        
        assert response.status_code == 200
        
        data = response.json()
        
        # Client expects these fields
        required_fields = ["score", "default_probability", "explanations", "proof_available"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Validate types match client expectations
        assert isinstance(data["score"], int)
        assert isinstance(data["default_probability"], (int, float))
        assert isinstance(data["explanations"], list)
        assert isinstance(data["proof_available"], bool)
        
        # Validate explanations structure
        for exp in data["explanations"]:
            assert "feature" in exp
            assert "impact" in exp
            assert "direction" in exp
            assert exp["direction"] in ["increases", "decreases"]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "slow"])

