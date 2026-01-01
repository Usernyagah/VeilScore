import * as fs from "fs";
import * as path from "path";

/**
 * Script to integrate contract ABIs and addresses with the frontend
 * Copies ABIs to frontend and creates/updates .env.example
 */
async function main() {
  const contractsDir = path.join(__dirname, "..");
  const frontendDir = path.join(contractsDir, "..", "client");
  const abisDir = path.join(contractsDir, "abis");
  const frontendAbisDir = path.join(frontendDir, "src", "lib", "contracts");

  console.log("Integrating contracts with frontend...");
  console.log(`Contracts dir: ${contractsDir}`);
  console.log(`Frontend dir: ${frontendDir}`);
  console.log("");

  // Ensure frontend contracts directory exists
  if (!fs.existsSync(frontendAbisDir)) {
    fs.mkdirSync(frontendAbisDir, { recursive: true });
    console.log(`✓ Created directory: ${frontendAbisDir}`);
  }

  // Copy ABIs to frontend
  const contracts = ["Verifier", "PrivateCreditLending"];
  for (const contractName of contracts) {
    const sourcePath = path.join(abisDir, `${contractName}.json`);
    const destPath = path.join(frontendAbisDir, `${contractName}.json`);

    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✓ Copied ${contractName} ABI to frontend`);
    } else {
      console.warn(`⚠ ABI not found: ${sourcePath}`);
      console.warn(`  Run 'npm run export:abis' first`);
    }
  }

  // Copy combined ABIs
  const combinedSource = path.join(abisDir, "all.json");
  const combinedDest = path.join(frontendAbisDir, "all.json");
  if (fs.existsSync(combinedSource)) {
    fs.copyFileSync(combinedSource, combinedDest);
    console.log(`✓ Copied combined ABIs to frontend`);
  }

  // Create/update frontend .env.example
  const envExamplePath = path.join(frontendDir, ".env.example");
  const envExampleContent = `# PrivateZK Credit Scout - Frontend Environment Variables
# Copy this file to .env and fill in the values

# Contract addresses (set after deployment)
VITE_VERIFIER_ADDRESS=
VITE_PRIVATE_CREDIT_LENDING_ADDRESS=
VITE_NETWORK_CHAIN_ID=5003
VITE_EXPLORER_URL=https://explorer.sepolia.mantle.xyz

# WalletConnect (optional)
VITE_WALLETCONNECT_PROJECT_ID=
`;

  if (!fs.existsSync(envExamplePath)) {
    fs.writeFileSync(envExamplePath, envExampleContent);
    console.log(`✓ Created frontend .env.example`);
  } else {
    console.log(`✓ Frontend .env.example already exists`);
  }

  // Check for deployment info and create env template if available
  const deploymentsDir = path.join(contractsDir, "deployments");
  if (fs.existsSync(deploymentsDir)) {
    const deploymentFiles = fs.readdirSync(deploymentsDir).filter(f => f.endsWith(".json"));
    if (deploymentFiles.length > 0) {
      // Use the most recent deployment
      const latestDeployment = deploymentFiles.sort().reverse()[0];
      const deploymentPath = path.join(deploymentsDir, latestDeployment);
      const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
      
      const envContent = `# PrivateZK Credit Scout - Frontend Environment Variables
# Generated from deployment: ${latestDeployment}

VITE_VERIFIER_ADDRESS=${deployment.contracts.Verifier}
VITE_PRIVATE_CREDIT_LENDING_ADDRESS=${deployment.contracts.PrivateCreditLending}
VITE_NETWORK_CHAIN_ID=${deployment.chainId}
VITE_EXPLORER_URL=${deployment.explorerUrl}

# WalletConnect (optional)
VITE_WALLETCONNECT_PROJECT_ID=
`;

      const envPath = path.join(frontendDir, ".env.local.example");
      fs.writeFileSync(envPath, envContent);
      console.log(`✓ Created frontend .env.local.example from deployment`);
    }
  }

  console.log("");
  console.log("Frontend integration complete!");
  console.log("");
  console.log("Next steps:");
  console.log("1. Update frontend/src/lib/mantle-config.ts to import real ABIs");
  console.log("2. Copy .env.example to .env and fill in contract addresses");
  console.log("3. Restart frontend dev server");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

