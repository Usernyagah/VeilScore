"""
Example usage of PrivateZK Credit Scout API.
Demonstrates how to use the credit scoring system.
"""

try:
    import requests
except ImportError:
    requests = None

import json
from pathlib import Path
import sys

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

from api.main import app, load_models
from train_model import credit_score_from_proba
import pandas as pd
import numpy as np


def example_local_inference():
    """Example of using the model directly (without API)."""
    print("=" * 60)
    print("Example: Direct Model Inference")
    print("=" * 60)
    
    try:
        import lightgbm as lgb
        import pickle
        
        models_dir = Path(__file__).parent / "models"
        model_path = models_dir / "credit_model.txt"
        
        if not model_path.exists():
            print("Model not found. Please train model first:")
            print("  python train_model.py")
            return
        
        # Load model
        model = lgb.Booster(model_file=str(model_path))
        
        with open(models_dir / "feature_names.pkl", "rb") as f:
            feature_names = pickle.load(f)
        
        # Create sample input
        print(f"\nModel expects {len(feature_names)} features:")
        print(f"Features: {feature_names[:5]}...")
        
        # Sample feature values
        sample_features = np.random.randn(1, len(feature_names))
        X = pd.DataFrame(sample_features, columns=feature_names)
        
        # Predict
        proba = model.predict(X.values)[0]
        score = credit_score_from_proba(proba)
        
        print(f"\nPrediction:")
        print(f"  Default probability: {proba:.4f}")
        print(f"  Credit score: {score}")
        
        # Get explanations
        from explainability import explain_prediction
        _, top_impacts = explain_prediction(model, X, feature_names)
        
        print(f"\nTop 3 Feature Impacts:")
        for i, impact in enumerate(top_impacts, 1):
            print(f"  {i}. {impact['feature']}: {impact['impact']:.4f}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()


def example_api_request():
    """Example of using the API endpoint."""
    print("\n" + "=" * 60)
    print("Example: API Request")
    print("=" * 60)
    
    # Sample loan application
    loan_data = {
        "loan_amnt": 15000.0,
        "int_rate": 12.5,
        "installment": 450.0,
        "annual_inc": 75000.0,
        "dti": 18.5,
        "delinq_2yrs": 0.0,
        "inq_last_6mths": 2.0,
        "open_acc": 8.0,
        "pub_rec": 0.0,
        "revol_bal": 12000.0,
        "revol_util": 45.0,
        "total_acc": 15.0,
    }
    
    print(f"\nLoan Application Data:")
    for key, value in loan_data.items():
        print(f"  {key}: {value}")
    
    # Make API request
    if requests is None:
        print("\n⚠ requests library not installed. Install with: pip install requests")
        return
    
    try:
        response = requests.post(
            "http://localhost:8000/prove",
            json=loan_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n✓ Credit Score: {result['score']}")
            print(f"  Default probability: {result['default_probability']:.4f}")
            print(f"\n  Top 3 Feature Impacts:")
            for exp in result['explanations']:
                print(f"    - {exp['feature']}: {exp['impact']:.4f} ({exp['direction']} risk)")
            
            if result.get('proof_available'):
                print(f"\n  ✓ ZK Proof generated: {len(result.get('proof_hex', ''))} chars")
            else:
                print(f"\n  ⚠ ZK Proof not available (EZKL not set up)")
        else:
            print(f"\n✗ API Error: {response.status_code}")
            print(f"  {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("\n⚠ API server not running.")
        print("  Start server with: python -m api.main")
    except Exception as e:
        print(f"\n✗ Error: {e}")


def example_batch_scoring():
    """Example of scoring multiple loans."""
    print("\n" + "=" * 60)
    print("Example: Batch Scoring")
    print("=" * 60)
    
    # Generate sample loans
    np.random.seed(42)
    n_loans = 5
    
    loans = []
    for i in range(n_loans):
        loan = {
            "loan_amnt": np.random.uniform(5000, 35000),
            "int_rate": np.random.uniform(5, 25),
            "annual_inc": np.random.uniform(30000, 150000),
            "dti": np.random.uniform(5, 40),
            "revol_util": np.random.uniform(0, 100),
        }
        loans.append(loan)
    
    print(f"\nScoring {n_loans} loans...")
    
    if requests is None:
        print("\n⚠ requests library not installed. Skipping batch scoring.")
        return
    
    scores = []
    for i, loan in enumerate(loans, 1):
        try:
            response = requests.post(
                "http://localhost:8000/prove",
                json=loan,
                timeout=10
            )
            if response.status_code == 200:
                result = response.json()
                scores.append(result['score'])
                print(f"  Loan {i}: Score = {result['score']}")
        except:
            print(f"  Loan {i}: Failed")
    
    if scores:
        print(f"\n  Average score: {np.mean(scores):.1f}")
        print(f"  Score range: {min(scores)} - {max(scores)}")


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("PrivateZK Credit Scout - Example Usage")
    print("=" * 60)
    
    # Example 1: Direct inference
    example_local_inference()
    
    # Example 2: API request
    example_api_request()
    
    # Example 3: Batch scoring
    # Uncomment to test batch scoring
    # example_batch_scoring()
    
    print("\n" + "=" * 60)
    print("Examples complete!")
    print("=" * 60)

