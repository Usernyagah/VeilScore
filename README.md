# VeilScore (PrivateZK Credit Scout)

Private credit scoring with zero-knowledge proofs on blockchain.

## 🚀 Live Deployment

**Network:** Mantle Sepolia Testnet (Chain ID: 5003)

**Deployed Contracts:**
- **Verifier:** [`0x703e92f670d4D1b7e86f7a5bC9980C5fef07B4dD`](https://explorer.sepolia.mantle.xyz/address/0x703e92f670d4D1b7e86f7a5bC9980C5fef07B4dD)
- **PrivateCreditLending:** [`0xfc61d92FABc2344385362400b2f7C53BEd4837Dc`](https://explorer.sepolia.mantle.xyz/address/0xfc61d92FABc2344385362400b2f7C53BEd4837Dc)

**Explorer:** [Mantle Sepolia Explorer](https://explorer.sepolia.mantle.xyz)

## Quick Start

### Option 1: Concurrent Development (Recommended)

Run both client and API server simultaneously:

```bash
# Using the bash script
./start-dev.sh

# Or using Node.js script
node start-dev.js

# Or using npm (after installing root dependencies)
npm install
npm run dev:all
```

This will start:
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:8000

### Option 2: Run Separately

**Terminal 1 - Backend:**
```bash
cd zkml
python3 -m api.main
```

**Terminal 2 - Frontend:**
```bash
cd client
npm install
npm run dev
```

## Installation

### Install All Dependencies

```bash
# Install root dependencies (for concurrent execution)
npm install

# Install client dependencies
cd client && npm install

# Install Python dependencies
cd ../zkml
pip install -r requirements.txt
```

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Python** >= 3.8
- **pip** (Python package manager)

## Project Structure

```
.
├── client/          # React frontend application
│   ├── src/        # Source code
│   └── package.json
├── zkml/           # ZKML backend (FastAPI)
│   ├── api/        # API endpoints
│   ├── models/     # Trained ML models
│   └── requirements.txt
├── contracts/      # Smart contracts (Hardhat)
│   ├── contracts/  # Solidity contracts
│   └── scripts/    # Deployment scripts
├── Dockerfile      # Unified Dockerfile for deployment
├── docker-compose.yml  # Docker Compose configuration
├── start-dev.sh    # Bash script for concurrent execution
├── start-dev.js    # Node.js script for concurrent execution
└── package.json    # Root package.json for concurrent execution
```

## Docker Deployment

### Quick Start with Docker

```bash
# Build and run
docker compose up --build

# Access the application
# Frontend & API: http://localhost:8080
```

See [DOCKER.md](./DOCKER.md) for detailed Docker documentation.

## Development

### Client Development

```bash
cd client
npm run dev          # Start dev server
npm run build        # Build for production
npm run lint         # Run linter
```

### Backend Development

```bash
cd zkml
python3 -m api.main              # Start API server
python3 train_model.py          # Train the model
python3 -m pytest tests/        # Run tests
```

### Environment Variables

Create `client/.env`:

```bash
VITE_API_URL=http://localhost:8000
VITE_VERIFIER_ADDRESS=0x703e92f670d4D1b7e86f7a5bC9980C5fef07B4dD
VITE_PRIVATE_CREDIT_LENDING_ADDRESS=0xfc61d92FABc2344385362400b2f7C53BEd4837Dc
VITE_NETWORK_CHAIN_ID=5003
VITE_EXPLORER_URL=https://explorer.sepolia.mantle.xyz
```

## Deployed Contracts

**Network:** Mantle Sepolia Testnet (Chain ID: 5003)

**Contract Addresses:**
- **Verifier:** [`0x703e92f670d4D1b7e86f7a5bC9980C5fef07B4dD`](https://explorer.sepolia.mantle.xyz/address/0x703e92f670d4D1b7e86f7a5bC9980C5fef07B4dD)
- **PrivateCreditLending:** [`0xfc61d92FABc2344385362400b2f7C53BEd4837Dc`](https://explorer.sepolia.mantle.xyz/address/0xfc61d92FABc2344385362400b2f7C53BEd4837Dc)

**Explorer:** [Mantle Sepolia Explorer](https://explorer.sepolia.mantle.xyz)

## API Endpoints

- `GET /health` - Health check
- `POST /prove` - Generate credit score with ZK proof

See `zkml/README.md` for detailed API documentation.

## Features

- 🎯 **High Performance**: LightGBM model with >0.90 AUC
- 🔒 **Zero-Knowledge Proofs**: Private inference with Groth16 proofs
- 📊 **Explainable**: SHAP-based feature impact analysis
- 🚀 **Production Ready**: FastAPI REST API with full test coverage
- ⚡ **Optimized**: Quantized int8 model for fast proofs
- 📝 **EVM Compatible**: Verifier.sol contract for on-chain verification
- 🐳 **Docker Ready**: Single unified Dockerfile for easy deployment
- 🌐 **Deployed**: Smart contracts live on Mantle Testnet

## Troubleshooting

### Port Already in Use

If port 8000 or 8080 is already in use:

**Backend (port 8000):**
```bash
# Edit zkml/api/main.py, change port in uvicorn.run()
uvicorn.run(app, host="0.0.0.0", port=8001)
```

**Frontend (port 8080):**
```bash
# Edit client/vite.config.ts, change port
server: {
  port: 8081,
}
```

### API Not Connecting

1. Check backend is running: `curl http://localhost:8000/health`
2. Check `VITE_API_URL` in `client/.env`
3. Check CORS settings in `zkml/api/main.py`

### Model Not Loaded

1. Train the model: `cd zkml && python3 train_model.py`
2. Ensure model files exist in `zkml/models/`
3. Check backend logs for errors

## Testing

### Unit Tests

```bash
# Backend tests
cd zkml && pytest tests/

# Contract tests
cd contracts && npm test

# Frontend tests
cd client && npm test
```

### End-to-End Tests

Comprehensive E2E tests covering the complete application flow:

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test suites
npm run test:e2e:docker      # Docker deployment tests
npm run test:e2e:contracts   # Smart contract tests
npm run test:e2e:fast        # Fast tests only

# Or use pytest directly
pytest tests/e2e/ -v
```

See [tests/e2e/README.md](./tests/e2e/README.md) for detailed E2E testing documentation.

## License

MIT

