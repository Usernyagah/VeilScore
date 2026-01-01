# Contract Scripts

Scripts for deployment, integration, and maintenance of PrivateZK Credit Scout contracts.

## Available Scripts

### Deployment

- **`deploy_all.ts`** - Deploy Verifier and PrivateCreditLending contracts
  - Deploys to configured network (default: Mantle testnet)
  - Logs contract addresses and explorer links
  - Generates frontend `.env` configuration
  - Automatically runs `integrate:frontend` after deployment

**Usage:**
```bash
npm run deploy              # Deploy to Mantle testnet
npm run deploy:local        # Deploy to local Hardhat network
```

### Integration

- **`integrate_frontend.ts`** - Integrate contracts with frontend
  - Exports contract ABIs
  - Copies ABIs to `client/src/lib/contracts/`
  - Creates/updates frontend `.env.example`
  - Can be run independently or automatically after deployment

**Usage:**
```bash
npm run integrate:frontend
```

- **`export_abis.ts`** - Export contract ABIs
  - Extracts ABIs from compiled artifacts
  - Saves to `abis/` directory
  - Creates individual and combined ABI files

**Usage:**
```bash
npm run export:abis
```

### Verification

- **`setup_ezkl_verifier.ts`** - Check EZKL verifier status
  - Checks if EZKL-generated verifier exists
  - Verifies if current Verifier.sol is placeholder or real
  - Provides instructions for generating verifier

**Usage:**
```bash
npm run check:ezkl
```

## Script Dependencies

Scripts use:
- `hardhat` - Contract compilation and deployment
- `ethers` - Ethereum interactions
- `fs` - File system operations
- `path` - Path resolution

## Workflow

### Initial Setup

1. Generate EZKL verifier:
   ```bash
   cd ../zkml
   python3 ezkl_pipeline.py
   cp contracts/Verifier.sol ../contracts/contracts/Verifier.sol
   ```

2. Deploy contracts:
   ```bash
   npm run deploy
   ```

   This automatically:
   - Deploys contracts
   - Exports ABIs
   - Integrates with frontend

### Manual Integration

If you need to integrate manually:

```bash
# Export ABIs
npm run export:abis

# Integrate with frontend
npm run integrate:frontend
```

### Update After Contract Changes

After modifying contracts:

1. Recompile:
   ```bash
   npm run compile
   ```

2. Re-export and integrate:
   ```bash
   npm run integrate:frontend
   ```

## Output Files

### Deployment Output

- `deployments/<network>-<chainId>.json` - Deployment info
- `.env.deployment` - Frontend environment variables

### Integration Output

- `abis/` - Contract ABIs (JSON)
- `../client/src/lib/contracts/` - Frontend ABIs (copied)
- `../client/.env.example` - Frontend environment template

## Error Handling

Scripts include error handling for:
- Missing contract artifacts
- Network connection issues
- File system errors
- Invalid configurations

Check script output for specific error messages and suggested fixes.

