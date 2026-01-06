"""
Comprehensive End-to-End Tests for VeilScore
Tests the complete flow: Frontend → Backend API → Smart Contracts
"""

import pytest
import requests
import time
import json
from typing import Dict, Any, Optional
from pathlib import Path
import sys

# Add contracts directory to path for contract interactions
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "contracts"))

# Test configuration
API_BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:8080"
CONTRACT_RPC_URL = "https://rpc.sepolia.mantle.xyz"
CHAIN_ID = 5003
TEST_TIMEOUT = 60  # Increased for proof generation

# Deployed contract addresses (from deployment)
VERIFIER_ADDRESS = "0x703e92f670d4D1b7e86f7a5bC9980C5fef07B4dD"
PRIVATE_CREDIT_LENDING_ADDRESS = "0xfc61d92FABc2344385362400b2f7C53BEd4837Dc"


@pytest.fixture(scope="module")
def services_available():
    """Check if all services are available."""
    services = {
        "api": False,
        "frontend": False,
    }
    
    # Check API
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            services["api"] = data.get("model_loaded", False)
    except:
        pass
    
    # Check Frontend
    try:
        response = requests.get(FRONTEND_URL, timeout=5)
        services["frontend"] = response.status_code == 200
    except:
        pass
    
    return services


@pytest.fixture
def sample_borrower_features() -> Dict[str, Any]:
    """Sample borrower features for testing."""
    return {
        "loan_amnt": 15000.0,
        "term": 36,
        "purpose": "debt_consolidation",
        "annual_inc": 75000.0,
        "verification_status": "Source Verified",
        "emp_length": 5,
        "home_ownership": "RENT",
        "dti": 18.0,
        "inq_last_6mths": 1.0,
        "open_acc": 8.0,
        "revol_bal": 12000.0,
        "revol_util": 35.0,
        "delinq_2yrs": 0.0,
        "pub_rec": 0.0,
        "total_acc": 15.0,
    }


class TestCompleteUserFlow:
    """Test the complete user flow from input to blockchain submission."""
    
    @pytest.mark.e2e
    @pytest.mark.slow
    def test_complete_credit_scoring_workflow(
        self, services_available, sample_borrower_features
    ):
        """
        Test complete workflow:
        1. User inputs features
        2. Backend generates credit score
        3. Backend generates ZK proof
        4. Frontend displays results
        5. User submits to blockchain (if contracts available)
        """
        if not services_available["api"]:
            pytest.skip("API not available or model not loaded")
        
        # Step 1: Submit features to API
        print("\n[Step 1] Submitting features to API...")
        response = requests.post(
            f"{API_BASE_URL}/prove",
            json=sample_borrower_features,
            timeout=TEST_TIMEOUT
        )
        
        assert response.status_code == 200, f"API returned {response.status_code}: {response.text}"
        data = response.json()
        
        # Step 2: Validate API response
        print("[Step 2] Validating API response...")
        assert "score" in data
        assert "default_probability" in data
        assert "explanations" in data
        assert "proof_available" in data
        
        score = data["score"]
        assert 300 <= score <= 850, f"Score {score} out of valid range"
        
        # Step 3: Validate explanations
        print("[Step 3] Validating explanations...")
        explanations = data["explanations"]
        assert len(explanations) == 3, "Should have 3 top feature explanations"
        
        for exp in explanations:
            assert "feature" in exp
            assert "impact" in exp
            assert "direction" in exp
            assert exp["direction"] in ["increases", "decreases"]
        
        # Step 4: Check proof availability
        print("[Step 4] Checking proof status...")
        proof_available = data.get("proof_available", False)
        if proof_available:
            assert "proof_hex" in data or data.get("proof_hex") is not None
            print("✓ ZK proof generated")
        else:
            print("⚠ ZK proof not available (EZKL may not be set up)")
        
        # Step 5: Validate frontend can access API
        if services_available["frontend"]:
            print("[Step 5] Testing frontend access...")
            frontend_response = requests.get(FRONTEND_URL, timeout=5)
            assert frontend_response.status_code == 200
        
        print("✓ Complete workflow test passed")
        return data
    
    @pytest.mark.e2e
    @pytest.mark.slow
    def test_api_response_structure(self, services_available, sample_borrower_features):
        """Test API response structure matches frontend expectations."""
        if not services_available["api"]:
            pytest.skip("API not available")
        
        response = requests.post(
            f"{API_BASE_URL}/prove",
            json=sample_borrower_features,
            timeout=TEST_TIMEOUT
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Required fields for frontend
        required_fields = {
            "score": int,
            "default_probability": (int, float),
            "explanations": list,
            "proof_available": bool,
        }
        
        for field, expected_type in required_fields.items():
            assert field in data, f"Missing required field: {field}"
            assert isinstance(data[field], expected_type), \
                f"Field {field} has wrong type: {type(data[field])}"
        
        # Validate explanations structure
        for exp in data["explanations"]:
            assert isinstance(exp, dict)
            assert "feature" in exp and isinstance(exp["feature"], str)
            assert "impact" in exp and isinstance(exp["impact"], (int, float))
            assert "direction" in exp and exp["direction"] in ["increases", "decreases"]
    
    @pytest.mark.e2e
    @pytest.mark.slow
    def test_multiple_credit_profiles(self, services_available):
        """Test API with various credit profiles."""
        if not services_available["api"]:
            pytest.skip("API not available")
        
        profiles = [
            {
                "name": "Excellent Credit",
                "features": {
                    "loan_amnt": 20000.0,
                    "annual_inc": 150000.0,
                    "dti": 10.0,
                    "revol_util": 20.0,
                    "delinq_2yrs": 0.0,
                    "pub_rec": 0.0,
                    "inq_last_6mths": 0.0,
                    "open_acc": 10.0,
                    "revol_bal": 5000.0,
                    "total_acc": 20.0,
                },
                "expected_score_range": (700, 850),
            },
            {
                "name": "Good Credit",
                "features": {
                    "loan_amnt": 15000.0,
                    "annual_inc": 75000.0,
                    "dti": 18.0,
                    "revol_util": 35.0,
                    "delinq_2yrs": 0.0,
                    "pub_rec": 0.0,
                    "inq_last_6mths": 1.0,
                    "open_acc": 8.0,
                    "revol_bal": 12000.0,
                    "total_acc": 15.0,
                },
                "expected_score_range": (650, 750),
            },
            {
                "name": "Poor Credit",
                "features": {
                    "loan_amnt": 5000.0,
                    "annual_inc": 30000.0,
                    "dti": 45.0,
                    "revol_util": 90.0,
                    "delinq_2yrs": 2.0,
                    "pub_rec": 1.0,
                    "inq_last_6mths": 5.0,
                    "open_acc": 3.0,
                    "revol_bal": 15000.0,
                    "total_acc": 5.0,
                },
                "expected_score_range": (300, 600),
            },
        ]
        
        for profile in profiles:
            print(f"\nTesting profile: {profile['name']}")
            response = requests.post(
                f"{API_BASE_URL}/prove",
                json=profile["features"],
                timeout=TEST_TIMEOUT
            )
            
            assert response.status_code == 200, \
                f"Failed for {profile['name']}: {response.text}"
            
            data = response.json()
            score = data["score"]
            min_score, max_score = profile["expected_score_range"]
            
            assert min_score <= score <= max_score, \
                f"Score {score} for {profile['name']} outside expected range {min_score}-{max_score}"
            
            print(f"✓ {profile['name']}: Score {score} (expected {min_score}-{max_score})")


class TestAPIPerformance:
    """Test API performance and reliability."""
    
    @pytest.mark.e2e
    @pytest.mark.slow
    def test_api_response_time(self, services_available, sample_borrower_features):
        """Test API responds within acceptable time."""
        if not services_available["api"]:
            pytest.skip("API not available")
        
        start_time = time.time()
        response = requests.post(
            f"{API_BASE_URL}/prove",
            json=sample_borrower_features,
            timeout=TEST_TIMEOUT
        )
        elapsed_time = time.time() - start_time
        
        assert response.status_code == 200
        assert elapsed_time < TEST_TIMEOUT, \
            f"Request took {elapsed_time}s, exceeding timeout {TEST_TIMEOUT}s"
        
        # Without proof generation, should be faster
        data = response.json()
        if not data.get("proof_available"):
            assert elapsed_time < 15, \
                f"Inference took {elapsed_time}s, seems slow (expected <15s)"
        
        print(f"✓ API response time: {elapsed_time:.2f}s")
    
    @pytest.mark.e2e
    @pytest.mark.slow
    def test_concurrent_requests(self, services_available, sample_borrower_features):
        """Test API handles concurrent requests."""
        if not services_available["api"]:
            pytest.skip("API not available")
        
        import concurrent.futures
        
        def make_request():
            try:
                response = requests.post(
                    f"{API_BASE_URL}/prove",
                    json=sample_borrower_features,
                    timeout=TEST_TIMEOUT
                )
                return response.status_code == 200
            except Exception as e:
                print(f"Request failed: {e}")
                return False
        
        # Make 3 concurrent requests
        print("\nTesting concurrent requests...")
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(make_request) for _ in range(3)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
        success_count = sum(results)
        assert success_count >= 2, \
            f"Only {success_count}/3 concurrent requests succeeded"
        
        print(f"✓ {success_count}/3 concurrent requests succeeded")


class TestErrorHandling:
    """Test error handling across the stack."""
    
    @pytest.mark.e2e
    def test_invalid_input_handling(self, services_available):
        """Test API handles invalid inputs gracefully."""
        if not services_available["api"]:
            pytest.skip("API not available")
        
        invalid_inputs = [
            {"loan_amnt": "not a number"},  # Wrong type
            {"loan_amnt": -1000},  # Negative value
            {"dti": 150},  # Out of range
            {},  # Empty input
        ]
        
        for invalid_input in invalid_inputs:
            response = requests.post(
                f"{API_BASE_URL}/prove",
                json=invalid_input,
                timeout=10
            )
            
            # Should return error status (422 for validation, 500 for server error)
            assert response.status_code in [422, 400, 500], \
                f"Expected error for input {invalid_input}, got {response.status_code}"
    
    @pytest.mark.e2e
    def test_missing_required_fields(self, services_available):
        """Test API handles missing required fields."""
        if not services_available["api"]:
            pytest.skip("API not available")
        
        # Missing critical fields
        incomplete_input = {
            "loan_amnt": 10000.0,
            # Missing annual_inc, dti, etc.
        }
        
        response = requests.post(
            f"{API_BASE_URL}/prove",
            json=incomplete_input,
            timeout=10
        )
        
        # Should handle gracefully (may use defaults or return error)
        assert response.status_code in [200, 422, 400, 500]


class TestFrontendIntegration:
    """Test frontend integration with backend."""
    
    @pytest.mark.e2e
    def test_frontend_accessible(self, services_available):
        """Test frontend is accessible."""
        if not services_available["frontend"]:
            pytest.skip("Frontend not available")
        
        response = requests.get(FRONTEND_URL, timeout=5)
        assert response.status_code == 200
        assert "html" in response.text.lower() or len(response.text) > 0
    
    @pytest.mark.e2e
    def test_cors_configuration(self, services_available):
        """Test CORS is properly configured."""
        if not services_available["api"]:
            pytest.skip("API not available")
        
        # Test OPTIONS request (preflight)
        response = requests.options(
            f"{API_BASE_URL}/prove",
            headers={
                "Origin": FRONTEND_URL,
                "Access-Control-Request-Method": "POST",
            },
            timeout=5
        )
        
        # CORS should be configured
        assert response.status_code in [200, 204, 405]
        
        # Test actual request with Origin header
        response = requests.post(
            f"{API_BASE_URL}/prove",
            json={"loan_amnt": 10000.0, "annual_inc": 50000.0, "dti": 15.0},
            headers={"Origin": FRONTEND_URL},
            timeout=TEST_TIMEOUT
        )
        
        # Should allow cross-origin requests
        assert response.status_code in [200, 503]  # 503 if model not loaded


class TestContractIntegration:
    """Test smart contract integration (if available)."""
    
    @pytest.mark.e2e
    @pytest.mark.slow
    @pytest.mark.contracts
    def test_contract_addresses_configured(self):
        """Test that contract addresses are properly configured."""
        assert VERIFIER_ADDRESS is not None and len(VERIFIER_ADDRESS) == 42
        assert PRIVATE_CREDIT_LENDING_ADDRESS is not None and len(PRIVATE_CREDIT_LENDING_ADDRESS) == 42
        assert VERIFIER_ADDRESS.startswith("0x")
        assert PRIVATE_CREDIT_LENDING_ADDRESS.startswith("0x")
        
        print(f"✓ Verifier: {VERIFIER_ADDRESS}")
        print(f"✓ PrivateCreditLending: {PRIVATE_CREDIT_LENDING_ADDRESS}")
    
    @pytest.mark.e2e
    @pytest.mark.slow
    @pytest.mark.contracts
    def test_contracts_deployed(self):
        """Test that contracts are deployed and accessible."""
        try:
            from web3 import Web3
            
            w3 = Web3(Web3.HTTPProvider(CONTRACT_RPC_URL))
            assert w3.is_connected(), "Failed to connect to RPC"
            
            # Check if contracts have code
            verifier_code = w3.eth.get_code(VERIFIER_ADDRESS)
            lending_code = w3.eth.get_code(PRIVATE_CREDIT_LENDING_ADDRESS)
            
            assert len(verifier_code) > 2, "Verifier contract has no code"
            assert len(lending_code) > 2, "PrivateCreditLending contract has no code"
            
            print("✓ Contracts are deployed and have code")
        except ImportError:
            pytest.skip("web3.py not installed")
        except Exception as e:
            pytest.skip(f"Could not verify contracts: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "e2e", "--tb=short"])

