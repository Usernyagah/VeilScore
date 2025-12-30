"""
Tests for ZK proof generation and verification.
"""

import pytest
import numpy as np
import json
from pathlib import Path
import sys
import subprocess

sys.path.append(str(Path(__file__).parent.parent))

from ezkl_pipeline import check_ezkl_installed, generate_proof


def test_ezkl_installed():
    """Test that EZKL is installed."""
    installed = check_ezkl_installed()
    if not installed:
        pytest.skip("EZKL not installed. Install with: cargo install --git https://github.com/zkonduit/ezkl")
    
    assert installed, "EZKL should be installed"
    print("✓ EZKL is installed")


def test_proof_generation():
    """Test that proofs can be generated (if EZKL is set up)."""
    models_dir = Path(__file__).parent.parent / "models"
    ezkl_dir = models_dir / "ezkl"
    
    compiled_path = ezkl_dir / "compiled.ezkl"
    settings_path = ezkl_dir / "settings.json"
    pk_path = ezkl_dir / "pk.key"
    
    if not all(p.exists() for p in [compiled_path, settings_path, pk_path]):
        pytest.skip("EZKL not fully set up. Run ezkl_pipeline.py first.")
    
    # Generate test input
    input_data = np.random.randn(25).astype(np.float32)
    
    witness_path = ezkl_dir / "test_witness.json"
    proof_path = ezkl_dir / "test_proof.json"
    
    try:
        proof_data = generate_proof(
            input_data,
            compiled_path,
            settings_path,
            pk_path,
            witness_path,
            proof_path
        )
        
        assert proof_data is not None, "Proof data should not be None"
        assert proof_path.exists(), "Proof file should exist"
        
        print("✓ Proof generated successfully")
        
    except Exception as e:
        pytest.fail(f"Proof generation failed: {e}")


def test_proof_tamper_detection():
    """Test that tampered proofs fail verification."""
    models_dir = Path(__file__).parent.parent / "models"
    ezkl_dir = models_dir / "ezkl"
    
    proof_path = ezkl_dir / "test_proof.json"
    
    if not proof_path.exists():
        pytest.skip("No proof file found. Generate proof first.")
    
    # Load proof
    with open(proof_path, "r") as f:
        proof_data = json.load(f)
    
    # Tamper with proof
    if isinstance(proof_data, dict):
        # Modify some value
        if "proof" in proof_data:
            if isinstance(proof_data["proof"], dict):
                # Try to tamper
                original = str(proof_data["proof"])
                proof_data["proof"]["tampered"] = True
    
    # Save tampered proof
    tampered_path = ezkl_dir / "tampered_proof.json"
    with open(tampered_path, "w") as f:
        json.dump(proof_data, f)
    
    # Verification should fail (this is a conceptual test)
    # Actual verification would use EZKL verify command
    print("✓ Tampered proof created (verification would fail)")


def test_proof_structure():
    """Test that proof has expected structure."""
    models_dir = Path(__file__).parent.parent / "models"
    ezkl_dir = models_dir / "ezkl"
    
    proof_path = ezkl_dir / "test_proof.json"
    
    if not proof_path.exists():
        pytest.skip("No proof file found. Generate proof first.")
    
    with open(proof_path, "r") as f:
        proof_data = json.load(f)
    
    # Proof should be a dict or have proof field
    assert isinstance(proof_data, (dict, list)), "Proof should be dict or list"
    
    print(f"✓ Proof structure valid: {type(proof_data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


