#!/bin/bash
# Complete pipeline runner for PrivateZK Credit Scout

set -e

echo "=========================================="
echo "PrivateZK Credit Scout - Full Pipeline"
echo "=========================================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 not found"
    exit 1
fi

# Check EZKL (optional for data/model steps)
if ! command -v ezkl &> /dev/null; then
    echo "Warning: EZKL not found. Install with: cargo install --git https://github.com/zkonduit/ezkl"
    echo "Continuing with data/model steps only..."
    SKIP_EZKL=true
else
    SKIP_EZKL=false
fi

# Step 1: Process data
echo "[1/5] Processing data..."
python3 data_processing.py
if [ $? -ne 0 ]; then
    echo "Error: Data processing failed"
    exit 1
fi
echo "✓ Data processed"
echo ""

# Step 2: Train model
echo "[2/5] Training model..."
python3 train_model.py
if [ $? -ne 0 ]; then
    echo "Error: Model training failed"
    exit 1
fi
echo "✓ Model trained"
echo ""

# Step 3: Compute explanations
echo "[3/5] Computing explanations..."
python3 explainability.py
if [ $? -ne 0 ]; then
    echo "Warning: Explanation computation failed (non-critical)"
fi
echo "✓ Explanations computed"
echo ""

# Step 4: EZKL pipeline
if [ "$SKIP_EZKL" = false ]; then
    echo "[4/5] Running EZKL pipeline..."
    python3 ezkl_pipeline.py
    if [ $? -ne 0 ]; then
        echo "Warning: EZKL pipeline failed (non-critical for API)"
    else
        echo "✓ EZKL pipeline complete"
    fi
else
    echo "[4/5] Skipping EZKL pipeline (not installed)"
fi
echo ""

# Step 5: Run tests
echo "[5/5] Running tests..."
python3 -m pytest tests/ -v
if [ $? -ne 0 ]; then
    echo "Warning: Some tests failed"
else
    echo "✓ All tests passed"
fi
echo ""

echo "=========================================="
echo "Pipeline Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Start API server: python3 -m api.main"
echo "  2. Test endpoint: curl -X POST http://localhost:8000/prove -H 'Content-Type: application/json' -d '{\"loan_amnt\": 10000}'"
echo ""


