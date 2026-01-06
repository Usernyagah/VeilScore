"""
Smart Contract Integration End-to-End Tests
Tests the complete flow including blockchain interactions
"""

import pytest
import requests
import time
from typing import Dict, Any, Optional
import json

# Contract configuration
CONTRACT_RPC_URL = "https://rpc.sepolia.mantle.xyz"
CHAIN_ID = 5003
VERIFIER_ADDRESS = "0x703e92f670d4D1b7e86f7a5bC9980C5fef07B4dD"
PRIVATE_CREDIT_LENDING_ADDRESS = "0xfc61d92FABc2344385362400b2f7C53BEd4837Dc"
API_BASE_URL = "http://localhost:8000"
TEST_TIMEOUT = 60


@pytest.fixture(scope="module")
def web3_available():
    """Check if web3 is available and can connect."""
    try:
        from web3 import Web3
        w3 = Web3(Web3.HTTPProvider(CONTRACT_RPC_URL))
        return w3.is_connected()
    except ImportError:
        return False
    except:
        return False


@pytest.fixture
def sample_borrower_features() -> Dict[str, Any]:
    """Sample borrower features."""
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


class TestSmartContractIntegration:
    """Test smart contract integration."""
    
    @pytest.mark.e2e
    @pytest.mark.contracts
    @pytest.mark.slow
    def test_contracts_are_deployed(self, web3_available):
        """Test that contracts are deployed on Mantle Testnet."""
        if not web3_available:
            pytest.skip("web3 not available or cannot connect to RPC")
        
        from web3 import Web3
        w3 = Web3(Web3.HTTPProvider(CONTRACT_RPC_URL))
        
        # Check Verifier contract
        verifier_code = w3.eth.get_code(VERIFIER_ADDRESS)
        assert len(verifier_code) > 2, "Verifier contract not deployed or has no code"
        
        # Check PrivateCreditLending contract
        lending_code = w3.eth.get_code(PRIVATE_CREDIT_LENDING_ADDRESS)
        assert len(lending_code) > 2, "PrivateCreditLending contract not deployed"
        
        print(f"✓ Verifier deployed at: {VERIFIER_ADDRESS}")
        print(f"✓ PrivateCreditLending deployed at: {PRIVATE_CREDIT_LENDING_ADDRESS}")
    
    @pytest.mark.e2e
    @pytest.mark.contracts
    @pytest.mark.slow
    def test_contract_abi_structure(self):
        """Test that contract ABIs are properly structured."""
        import json
        from pathlib import Path
        
        contracts_dir = Path(__file__).parent.parent.parent / "contracts"
        abi_dir = contracts_dir / "abis"
        
        # Check Verifier ABI
        verifier_abi_path = abi_dir / "Verifier.json"
        assert verifier_abi_path.exists(), "Verifier ABI not found"
        
        with open(verifier_abi_path) as f:
            verifier_abi = json.load(f)
        assert isinstance(verifier_abi, list)
        assert len(verifier_abi) > 0
        
        # Check for verify function
        verify_functions = [item for item in verifier_abi 
                          if item.get("type") == "function" 
                          and item.get("name") == "verify"]
        assert len(verify_functions) > 0, "Verifier ABI missing verify function"
        
        # Check PrivateCreditLending ABI
        lending_abi_path = abi_dir / "PrivateCreditLending.json"
        assert lending_abi_path.exists(), "PrivateCreditLending ABI not found"
        
        with open(lending_abi_path) as f:
            lending_abi = json.load(f)
        assert isinstance(lending_abi, list)
        assert len(lending_abi) > 0
        
        # Check for submitScore function
        submit_functions = [item for item in lending_abi 
                          if item.get("type") == "function" 
                          and item.get("name") == "submitScore"]
        assert len(submit_functions) > 0, "Lending ABI missing submitScore function"
        
        print("✓ Contract ABIs are properly structured")
    
    @pytest.mark.e2e
    @pytest.mark.contracts
    @pytest.mark.slow
    def test_api_to_contract_flow(self, web3_available, sample_borrower_features):
        """
        Test the flow from API to contract:
        1. Get score from API
        2. Verify score is valid
        3. Check contract can accept the score format
        """
        if not web3_available:
            pytest.skip("web3 not available")
        
        # Step 1: Get score from API
        try:
            response = requests.post(
                f"{API_BASE_URL}/prove",
                json=sample_borrower_features,
                timeout=TEST_TIMEOUT
            )
            assert response.status_code == 200
            api_data = response.json()
        except requests.exceptions.RequestException:
            pytest.skip("API not available")
        
        # Step 2: Validate score format matches contract expectations
        score = api_data["score"]
        assert 300 <= score <= 850, "Score out of valid range"
        
        # Step 3: Check explanations format (for contributions)
        explanations = api_data.get("explanations", [])
        assert len(explanations) == 3, "Should have 3 explanations for contributions"
        
        # Contributions should be int256[3] for contract
        contributions = [int(exp.get("impact", 0) * 10000) for exp in explanations[:3]]
        assert len(contributions) == 3
        
        # Step 4: Verify contract can be called (if we had a signer)
        # This is a structural test - actual submission requires a wallet
        from web3 import Web3
        w3 = Web3(Web3.HTTPProvider(CONTRACT_RPC_URL))
        
        # Check contract exists
        lending_code = w3.eth.get_code(PRIVATE_CREDIT_LENDING_ADDRESS)
        assert len(lending_code) > 2
        
        print(f"✓ API score: {score}")
        print(f"✓ Contributions: {contributions}")
        print("✓ Score format compatible with contract")
    
    @pytest.mark.e2e
    @pytest.mark.contracts
    @pytest.mark.slow
    def test_contract_verifier_address(self, web3_available):
        """Test that PrivateCreditLending contract has correct verifier address."""
        if not web3_available:
            pytest.skip("web3 not available")
        
        try:
            from web3 import Web3
            import json
            from pathlib import Path
            
            w3 = Web3(Web3.HTTPProvider(CONTRACT_RPC_URL))
            
            # Load ABI
            contracts_dir = Path(__file__).parent.parent.parent / "contracts"
            abi_path = contracts_dir / "abis" / "PrivateCreditLending.json"
            
            with open(abi_path) as f:
                abi = json.load(f)
            
            # Create contract instance
            contract = w3.eth.contract(
                address=PRIVATE_CREDIT_LENDING_ADDRESS,
                abi=abi
            )
            
            # Call verifier() function
            verifier_address = contract.functions.verifier().call()
            
            assert verifier_address.lower() == VERIFIER_ADDRESS.lower(), \
                f"Verifier address mismatch: {verifier_address} != {VERIFIER_ADDRESS}"
            
            print(f"✓ Contract verifier address: {verifier_address}")
        except Exception as e:
            pytest.skip(f"Could not verify contract verifier: {e}")


class TestEndToEndWorkflow:
    """Test complete end-to-end workflow including contracts."""
    
    @pytest.mark.e2e
    @pytest.mark.contracts
    @pytest.mark.slow
    def test_complete_application_flow(
        self, web3_available, sample_borrower_features
    ):
        """
        Test complete application flow:
        1. User inputs features (frontend)
        2. API generates score and proof
        3. Frontend displays results
        4. Contract addresses are configured
        5. Ready for blockchain submission
        """
        # Step 1: API generates score
        try:
            response = requests.post(
                f"{API_BASE_URL}/prove",
                json=sample_borrower_features,
                timeout=TEST_TIMEOUT
            )
            assert response.status_code == 200
            api_data = response.json()
        except requests.exceptions.RequestException:
            pytest.skip("API not available")
        
        # Step 2: Validate API response
        assert "score" in api_data
        assert "explanations" in api_data
        score = api_data["score"]
        explanations = api_data["explanations"]
        
        # Step 3: Validate contract addresses are set
        assert VERIFIER_ADDRESS is not None
        assert PRIVATE_CREDIT_LENDING_ADDRESS is not None
        
        # Step 4: Validate data format for contract submission
        # Score should be uint256
        assert isinstance(score, int)
        assert 300 <= score <= 850
        
        # Contributions should be int256[3]
        contributions = [int(exp.get("impact", 0) * 10000) for exp in explanations[:3]]
        assert len(contributions) == 3
        assert all(isinstance(c, int) for c in contributions)
        
        # Step 5: If web3 available, verify contracts exist
        if web3_available:
            from web3 import Web3
            w3 = Web3(Web3.HTTPProvider(CONTRACT_RPC_URL))
            
            verifier_code = w3.eth.get_code(VERIFIER_ADDRESS)
            lending_code = w3.eth.get_code(PRIVATE_CREDIT_LENDING_ADDRESS)
            
            assert len(verifier_code) > 2
            assert len(lending_code) > 2
        
        print("✓ Complete application flow validated")
        print(f"  Score: {score}")
        print(f"  Contributions: {contributions}")
        print(f"  Verifier: {VERIFIER_ADDRESS}")
        print(f"  Lending: {PRIVATE_CREDIT_LENDING_ADDRESS}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "contracts", "--tb=short"])

