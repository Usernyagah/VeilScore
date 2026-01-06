# End-to-End Tests

Comprehensive end-to-end tests for VeilScore application covering the complete flow from frontend to backend to smart contracts.

## Test Files

### `test_complete_flow.py`
Tests the complete user workflow:
- Frontend → Backend API integration
- Credit scoring flow
- Multiple credit profiles
- API performance and reliability
- Error handling
- CORS configuration

### `test_docker_deployment.py`
Tests Docker deployment:
- Container status
- Health endpoints
- Nginx proxy configuration
- Frontend serving
- Complete workflow in Docker

### `test_smart_contract_flow.py`
Tests smart contract integration:
- Contract deployment verification
- ABI structure validation
- API to contract data flow
- Complete blockchain integration

## Running Tests

### Prerequisites

1. **Install Python dependencies:**
   ```bash
   pip install pytest requests web3
   ```

2. **Start services:**
   ```bash
   # Option 1: Docker
   docker compose up -d
   
   # Option 2: Local development
   ./start-dev.sh
   ```

### Run All E2E Tests

```bash
# From project root
pytest tests/e2e/ -v
```

### Run Specific Test Suites

```bash
# Complete flow tests only
pytest tests/e2e/test_complete_flow.py -v

# Docker tests only
pytest tests/e2e/test_docker_deployment.py -v -m docker

# Smart contract tests only
pytest tests/e2e/test_smart_contract_flow.py -v -m contracts
```

### Run with Markers

```bash
# Only slow tests
pytest tests/e2e/ -v -m slow

# Skip slow tests
pytest tests/e2e/ -v -m "not slow"

# Only contract tests
pytest tests/e2e/ -v -m contracts

# Only docker tests
pytest tests/e2e/ -v -m docker
```

### Run with Coverage

```bash
pytest tests/e2e/ --cov=. --cov-report=html
```

## Test Markers

- `@pytest.mark.e2e` - End-to-end test
- `@pytest.mark.slow` - Slow running test (>10s)
- `@pytest.mark.docker` - Docker deployment test
- `@pytest.mark.contracts` - Smart contract integration test

## Test Configuration

Tests are configured to:
- Skip if services are not available
- Use appropriate timeouts for different operations
- Validate complete data flow
- Test error handling

## Expected Test Duration

- Fast tests: < 5 seconds each
- Slow tests: 10-60 seconds each
- Full suite: ~5-10 minutes

## Troubleshooting

### Services Not Available

If tests skip with "API not available":
1. Ensure backend is running: `curl http://localhost:8000/health`
2. Check frontend: `curl http://localhost:8080`
3. For Docker: `docker compose ps`

### Contract Tests Failing

If contract tests fail:
1. Verify contracts are deployed: Check `contracts/deployments/`
2. Check RPC connection: `curl -X POST https://rpc.sepolia.mantle.xyz ...`
3. Verify contract addresses in test files match deployment

### Timeout Errors

If tests timeout:
1. Increase `TEST_TIMEOUT` in test files
2. Check service performance
3. Ensure models are loaded (check API health)

## Continuous Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run E2E Tests
  run: |
    docker compose up -d
    sleep 30  # Wait for services
    pytest tests/e2e/ -v
```

