# Test Suite

Comprehensive test suite for PrivateZK Credit Scout contracts and integration scripts.

## Test Files

### Contract Tests

- **`PrivateCreditLending.test.ts`** - Main contract functionality tests
  - Deployment tests
  - `submitScore()` function tests
  - `getCreditScore()` function tests
  - Event emission tests
  - Boundary condition tests
  - Gas optimization tests

- **`MockVerifier.test.ts`** - Mock verifier tests (test-only contract)
  - Deployment tests
  - Proof validation tests
  - Configuration tests

### Integration Tests

- **`integration.test.ts`** - Integration script tests
  - ABI export functionality
  - Frontend integration
  - Contract ABI structure validation
  - Script execution tests

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test File

```bash
# Contract tests only
npm test -- test/PrivateCreditLending.test.ts

# Integration tests only
npm test -- test/integration.test.ts
```

### Run with Coverage

```bash
npm run coverage
```

## Test Coverage

Current coverage: **>95%**

- **PrivateCreditLending.sol**: 100% coverage
- **MockVerifier.sol**: 100% coverage
- **Verifier.sol**: 0% (placeholder contract, expected)

## Test Structure

### Contract Tests

Tests use:
- `loadFixture` from `@nomicfoundation/hardhat-network-helpers`
- `ethers` for contract interactions
- `chai` for assertions

Example:
```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("PrivateCreditLending", function () {
  async function deployContractsFixture() {
    // Setup...
  }

  it("Should submit valid score", async function () {
    const { lending } = await loadFixture(deployContractsFixture);
    // Test...
  });
});
```

### Integration Tests

Tests use:
- `fs` for file system operations
- `execSync` for running scripts
- File system assertions

Example:
```typescript
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

describe("Integration Scripts", function () {
  it("Should export ABIs", function () {
    execSync("npm run export", { cwd: contractsDir });
    expect(fs.existsSync(abiPath)).to.be.true;
  });
});
```

## Test Categories

### 1. Deployment Tests
- Contract deployment with valid parameters
- Rejection of invalid parameters (zero addresses, etc.)

### 2. Function Tests
- Valid function calls
- Invalid function calls (should revert)
- Return value validation
- State changes

### 3. Event Tests
- Event emission
- Event parameter validation

### 4. Boundary Tests
- Minimum values
- Maximum values
- Edge cases
- Large numbers

### 5. Integration Tests
- ABI export
- Frontend integration
- File system operations
- Script execution

## Writing New Tests

### Contract Test Template

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("ContractName", function () {
  async function deployFixture() {
    const [owner, user1] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("ContractName");
    const contract = await Contract.deploy();
    await contract.waitForDeployment();
    return { contract, owner, user1 };
  }

  it("Should do something", async function () {
    const { contract } = await loadFixture(deployFixture);
    // Test implementation
    expect(await contract.someFunction()).to.equal(expectedValue);
  });
});
```

### Integration Test Template

```typescript
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

describe("Script Name", function () {
  it("Should execute successfully", function () {
    this.timeout(60000);
    expect(() => {
      execSync("npm run script-name", { 
        cwd: contractsDir, 
        stdio: "pipe",
        timeout: 60000 
      });
    }).to.not.throw();
  });
});
```

## Troubleshooting

### Tests Timeout

If tests timeout:
1. Increase timeout: `this.timeout(60000);`
2. Check if compilation is needed
3. Verify network configuration

### Tests Fail with "factory runner does not support sending transactions"

This means `defaultNetwork` is set incorrectly. Ensure:
- `defaultNetwork: "hardhat"` in `hardhat.config.ts` (for tests)
- Deployment scripts explicitly use `--network`

### Integration Tests Fail

1. Ensure ABIs are exported first: `npm run export:abis`
2. Check file paths are correct
3. Verify frontend directory exists

## Continuous Integration

Tests run automatically in CI/CD:
- GitHub Actions workflow (`.github/workflows/ci.yml`)
- Runs on every push/PR
- Generates coverage reports
- Uploads coverage artifacts

