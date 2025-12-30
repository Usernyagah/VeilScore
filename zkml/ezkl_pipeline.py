"""
EZKL pipeline for ZKML proof generation.
Handles quantization, compilation, setup, and verifier creation.
"""

import json
import subprocess
import numpy as np
import pandas as pd
from pathlib import Path
import logging
import pickle
from typing import Dict, List, Tuple
import onnxruntime as ort

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).parent / "models"
CONTRACTS_DIR = Path(__file__).parent.parent / "contracts"
CONTRACTS_DIR.mkdir(exist_ok=True, parents=True)


def check_ezkl_installed() -> bool:
    """Check if EZKL is installed."""
    try:
        result = subprocess.run(
            ["ezkl", "--version"],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False


def quantize_model(onnx_path: Path, output_path: Path, logrows: int = 19) -> Path:
    """
    Quantize ONNX model to int8 for EZKL compatibility.
    Limits depth/leaves to keep logrows <= 19 (<20s proofs).
    """
    logger.info(f"Quantizing model (logrows={logrows})...")
    
    # EZKL gen-settings command
    settings_path = output_path.with_suffix('.settings.json')
    
    cmd = [
        "ezkl",
        "gen-settings",
        "--model", str(onnx_path),
        "--settings-path", str(settings_path),
        "--logrows", str(logrows),
        "--bits", "16",  # Use 16 bits for better precision
    ]
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=60
        )
        logger.info(f"✓ Generated settings: {settings_path}")
        return settings_path
    except subprocess.CalledProcessError as e:
        logger.error(f"gen-settings failed: {e.stderr}")
        raise
    except FileNotFoundError:
        logger.error("EZKL not found. Install with: cargo install --git https://github.com/zkonduit/ezkl")
        raise


def calibrate_model(onnx_path: Path, settings_path: Path, 
                   calibration_data: np.ndarray, output_path: Path) -> Path:
    """
    Calibrate quantized model with sample data.
    """
    logger.info("Calibrating model...")
    
    # Save calibration data
    cal_data_path = output_path.parent / "calibration_data.json"
    cal_data_dict = {
        "input_data": [calibration_data.tolist()]
    }
    
    with open(cal_data_path, "w") as f:
        json.dump(cal_data_dict, f)
    
    cmd = [
        "ezkl",
        "calibrate-settings",
        "--data", str(cal_data_path),
        "--model", str(onnx_path),
        "--settings-path", str(settings_path),
        "--target", "resources",
    ]
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=120
        )
        logger.info(f"✓ Calibration complete")
        return settings_path
    except subprocess.CalledProcessError as e:
        logger.error(f"calibrate-settings failed: {e.stderr}")
        raise


def compile_model(onnx_path: Path, settings_path: Path, 
                 compiled_path: Path) -> Path:
    """
    Compile ONNX model to EZKL format.
    """
    logger.info("Compiling model...")
    
    cmd = [
        "ezkl",
        "compile-circuit",
        "--model", str(onnx_path),
        "--settings-path", str(settings_path),
        "--compiled-circuit", str(compiled_path),
    ]
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=180
        )
        logger.info(f"✓ Compiled circuit: {compiled_path}")
        return compiled_path
    except subprocess.CalledProcessError as e:
        logger.error(f"compile-circuit failed: {e.stderr}")
        raise


def setup_ezkl(compiled_path: Path, settings_path: Path, 
              pk_path: Path, vk_path: Path) -> Tuple[Path, Path]:
    """
    Generate proving key and verification key.
    """
    logger.info("Setting up proving/verification keys...")
    
    cmd = [
        "ezkl",
        "setup",
        "--compiled-circuit", str(compiled_path),
        "--settings-path", str(settings_path),
        "--pk-path", str(pk_path),
        "--vk-path", str(vk_path),
    ]
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=300
        )
        logger.info(f"✓ Setup complete")
        logger.info(f"  Proving key: {pk_path}")
        logger.info(f"  Verification key: {vk_path}")
        return pk_path, vk_path
    except subprocess.CalledProcessError as e:
        logger.error(f"setup failed: {e.stderr}")
        raise


def create_evm_verifier(settings_path: Path, vk_path: Path, 
                       sol_path: Path) -> Path:
    """
    Create EVM verifier contract.
    """
    logger.info("Creating EVM verifier contract...")
    
    cmd = [
        "ezkl",
        "create-evm-verifier",
        "--settings-path", str(settings_path),
        "--vk-path", str(vk_path),
        "--sol-code-path", str(sol_path),
    ]
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=60
        )
        logger.info(f"✓ EVM verifier created: {sol_path}")
        return sol_path
    except subprocess.CalledProcessError as e:
        logger.error(f"create-evm-verifier failed: {e.stderr}")
        raise


def generate_proof(input_data: np.ndarray, compiled_path: Path, 
                 settings_path: Path, pk_path: Path, 
                 witness_path: Path, proof_path: Path) -> Dict:
    """
    Generate ZK proof for inference.
    
    Returns:
        Dictionary with proof data and public outputs
    """
    logger.info("Generating ZK proof...")
    
    # Prepare input data
    input_path = witness_path.parent / "input.json"
    input_dict = {
        "input_data": [input_data.tolist()]
    }
    
    with open(input_path, "w") as f:
        json.dump(input_dict, f)
    
    # Generate witness
    witness_cmd = [
        "ezkl",
        "gen-witness",
        "--data", str(input_path),
        "--compiled-circuit", str(compiled_path),
        "--settings-path", str(settings_path),
        "--witness", str(witness_path),
    ]
    
    try:
        result = subprocess.run(
            witness_cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=60
        )
        logger.info("✓ Witness generated")
    except subprocess.CalledProcessError as e:
        logger.error(f"gen-witness failed: {e.stderr}")
        raise
    
    # Generate proof
    prove_cmd = [
        "ezkl",
        "prove",
        "--witness", str(witness_path),
        "--compiled-circuit", str(compiled_path),
        "--pk-path", str(pk_path),
        "--settings-path", str(settings_path),
        "--proof-path", str(proof_path),
    ]
    
    try:
        result = subprocess.run(
            prove_cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=30
        )
        logger.info("✓ Proof generated")
        
        # Read proof
        with open(proof_path, "r") as f:
            proof_data = json.load(f)
        
        return proof_data
        
    except subprocess.CalledProcessError as e:
        logger.error(f"prove failed: {e.stderr}")
        raise


def run_full_pipeline(onnx_path: Path = None, calibration_samples: int = 100):
    """
    Run complete EZKL pipeline: quantize → calibrate → compile → setup → verifier.
    """
    logger.info("=" * 60)
    logger.info("EZKL Pipeline - Full Setup")
    logger.info("=" * 60)
    
    # Check EZKL installation
    if not check_ezkl_installed():
        logger.error("EZKL not installed. Install with:")
        logger.error("  cargo install --git https://github.com/zkonduit/ezkl")
        return False
    
    # Load model paths
    if onnx_path is None:
        onnx_path = MODELS_DIR / "credit_model.onnx"
    
    if not onnx_path.exists():
        logger.error(f"ONNX model not found at {onnx_path}. Train model first.")
        return False
    
    # Load feature names for calibration data
    with open(MODELS_DIR / "feature_names.pkl", "rb") as f:
        feature_names = pickle.load(f)
    
    # Load calibration data
    try:
        X = pd.read_csv(MODELS_DIR.parent / "data" / "X_processed.csv")
        X = X[feature_names].head(calibration_samples)
        calibration_data = X.values.astype(np.float32)
    except FileNotFoundError:
        logger.warning("Calibration data not found. Using random data.")
        calibration_data = np.random.randn(calibration_samples, len(feature_names)).astype(np.float32)
    
    # Setup paths
    output_dir = MODELS_DIR / "ezkl"
    output_dir.mkdir(exist_ok=True)
    
    settings_path = output_dir / "settings.json"
    compiled_path = output_dir / "compiled.ezkl"
    pk_path = output_dir / "pk.key"
    vk_path = output_dir / "vk.key"
    sol_path = CONTRACTS_DIR / "Verifier.sol"
    
    try:
        # Step 1: Generate settings
        logger.info("\n[1/5] Generating settings...")
        quantize_model(onnx_path, settings_path, logrows=19)
        
        # Step 2: Calibrate
        logger.info("\n[2/5] Calibrating model...")
        calibrate_model(onnx_path, settings_path, calibration_data, output_dir / "calibrated.json")
        
        # Step 3: Compile
        logger.info("\n[3/5] Compiling circuit...")
        compile_model(onnx_path, settings_path, compiled_path)
        
        # Step 4: Setup
        logger.info("\n[4/5] Setting up keys...")
        setup_ezkl(compiled_path, settings_path, pk_path, vk_path)
        
        # Step 5: Create EVM verifier
        logger.info("\n[5/5] Creating EVM verifier...")
        create_evm_verifier(settings_path, vk_path, sol_path)
        
        logger.info("\n" + "=" * 60)
        logger.info("EZKL Pipeline Complete!")
        logger.info(f"Verifier contract: {sol_path}")
        logger.info("=" * 60)
        
        return True
        
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        return False


if __name__ == "__main__":
    run_full_pipeline()


