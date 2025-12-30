"""
Check setup and dependencies for PrivateZK Credit Scout.
"""

import sys
from pathlib import Path

def check_python_version():
    """Check Python version."""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("✗ Python 3.8+ required")
        return False
    print(f"✓ Python {version.major}.{version.minor}.{version.micro}")
    return True


def check_package(package_name, import_name=None):
    """Check if a Python package is installed."""
    if import_name is None:
        import_name = package_name
    
    try:
        __import__(import_name)
        print(f"✓ {package_name}")
        return True
    except ImportError:
        print(f"✗ {package_name} not installed")
        return False


def check_file(file_path, description):
    """Check if a file exists."""
    path = Path(file_path)
    if path.exists():
        print(f"✓ {description}: {path}")
        return True
    else:
        print(f"✗ {description} not found: {path}")
        return False


def check_ezkl():
    """Check if EZKL is installed."""
    import subprocess
    try:
        result = subprocess.run(
            ["ezkl", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            print(f"✓ EZKL installed")
            return True
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    
    print("✗ EZKL not installed (optional for API, required for proofs)")
    print("  Install with: cargo install --git https://github.com/zkonduit/ezkl")
    return False


def main():
    """Run all checks."""
    print("=" * 60)
    print("PrivateZK Credit Scout - Setup Check")
    print("=" * 60)
    print()
    
    all_ok = True
    
    # Python version
    print("Python Version:")
    if not check_python_version():
        all_ok = False
    print()
    
    # Required packages
    print("Required Packages:")
    required = [
        ("pandas", "pandas"),
        ("numpy", "numpy"),
        ("scikit-learn", "sklearn"),
        ("lightgbm", "lightgbm"),
        ("onnxmltools", "onnxmltools"),
        ("skl2onnx", "skl2onnx"),
        ("shap", "shap"),
        ("fastapi", "fastapi"),
        ("uvicorn", "uvicorn"),
        ("pydantic", "pydantic"),
        ("pytest", "pytest"),
    ]
    
    for package, import_name in required:
        if not check_package(package, import_name):
            all_ok = False
    print()
    
    # Optional packages
    print("Optional Packages:")
    optional = [
        ("onnxruntime", "onnxruntime"),
        ("requests", "requests"),
    ]
    
    for package, import_name in optional:
        check_package(package, import_name)
    print()
    
    # EZKL
    print("ZKML Tools:")
    check_ezkl()
    print()
    
    # Data files
    print("Data Files:")
    data_dir = Path(__file__).parent / "data"
    csv_files = list(data_dir.glob("*.csv"))
    if csv_files:
        print(f"✓ LendingClub dataset found: {csv_files[0].name}")
        data_ok = True
    else:
        print(f"✗ LendingClub dataset not found in {data_dir}")
        print("  Download from: https://www.kaggle.com/datasets/wordsforthewise/lending-club")
        data_ok = False
    print()
    
    # Model files
    print("Model Files:")
    models_dir = Path(__file__).parent / "models"
    model_ok = check_file(models_dir / "credit_model.txt", "Trained model")
    check_file(models_dir / "credit_model.onnx", "ONNX model")
    check_file(models_dir / "feature_names.pkl", "Feature names")
    check_file(models_dir / "encoders.pkl", "Encoders")
    print()
    
    # EZKL artifacts
    print("EZKL Artifacts (optional):")
    ezkl_dir = models_dir / "ezkl"
    check_file(ezkl_dir / "compiled.ezkl", "Compiled circuit")
    check_file(ezkl_dir / "settings.json", "EZKL settings")
    check_file(ezkl_dir / "pk.key", "Proving key")
    check_file(ezkl_dir / "vk.key", "Verification key")
    print()
    
    # Contracts
    print("Contracts:")
    contracts_dir = Path(__file__).parent.parent / "contracts"
    check_file(contracts_dir / "Verifier.sol", "EVM verifier")
    print()
    
    # Summary
    print("=" * 60)
    if all_ok and model_ok:
        print("✓ Setup looks good! You can run the pipeline.")
    elif all_ok:
        print("⚠ Packages installed, but model not trained yet.")
        print("  Run: python train_model.py")
    else:
        print("✗ Some required packages are missing.")
        print("  Install with: pip install -r requirements.txt")
    print("=" * 60)


if __name__ == "__main__":
    main()

