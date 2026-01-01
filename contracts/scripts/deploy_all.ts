import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=".repeat(60));
  console.log("Deploying PrivateZK Credit Scout Contracts");
  console.log("=".repeat(60));
  console.log(`Deploying with account: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${ethers.formatEther(balance)} ETH`);
  console.log("");

  // Deploy Verifier contract
  console.log("Deploying Verifier contract...");
  const Verifier = await ethers.getContractFactory("Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();
  console.log(`✓ Verifier deployed to: ${verifierAddress}`);

  // Deploy PrivateCreditLending contract
  console.log("Deploying PrivateCreditLending contract...");
  const PrivateCreditLending = await ethers.getContractFactory("PrivateCreditLending");
  const privateCreditLending = await PrivateCreditLending.deploy(verifierAddress);
  await privateCreditLending.waitForDeployment();
  const lendingAddress = await privateCreditLending.getAddress();
  console.log(`✓ PrivateCreditLending deployed to: ${lendingAddress}`);
  console.log("");

  // Network info
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  // Explorer URLs
  let explorerUrl = "";
  if (chainId === 5003) {
    explorerUrl = "https://explorer.sepolia.mantle.xyz";
  } else if (chainId === 1) {
    explorerUrl = "https://etherscan.io";
  } else if (chainId === 11155111) {
    explorerUrl = "https://sepolia.etherscan.io";
  } else {
    explorerUrl = `https://explorer.chainId=${chainId}`;
  }

  console.log("=".repeat(60));
  console.log("Deployment Summary");
  console.log("=".repeat(60));
  console.log(`Network: ${network.name} (Chain ID: ${chainId})`);
  console.log(`Explorer: ${explorerUrl}`);
  console.log("");
  console.log("Contract Addresses:");
  console.log(`  Verifier:            ${verifierAddress}`);
  console.log(`  PrivateCreditLending: ${lendingAddress}`);
  console.log("");
  console.log("Explorer Links:");
  console.log(`  Verifier:            ${explorerUrl}/address/${verifierAddress}`);
  console.log(`  PrivateCreditLending: ${explorerUrl}/address/${lendingAddress}`);
  console.log("");

  // Save deployment info to JSON
  const deploymentInfo = {
    network: network.name,
    chainId: chainId,
    deployer: deployer.address,
    contracts: {
      Verifier: verifierAddress,
      PrivateCreditLending: lendingAddress,
    },
    explorerUrl: explorerUrl,
    deployedAt: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${network.name}-${chainId}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`✓ Deployment info saved to: ${deploymentFile}`);

  // Output frontend .env format
  console.log("");
  console.log("=".repeat(60));
  console.log("Frontend .env Configuration");
  console.log("=".repeat(60));
  console.log("Add these to your frontend .env file:");
  console.log("");
  console.log(`VITE_VERIFIER_ADDRESS=${verifierAddress}`);
  console.log(`VITE_PRIVATE_CREDIT_LENDING_ADDRESS=${lendingAddress}`);
  console.log(`VITE_NETWORK_CHAIN_ID=${chainId}`);
  console.log(`VITE_EXPLORER_URL=${explorerUrl}`);
  console.log("");

  // Also output to .env file in contracts directory
  const envContent = `# PrivateZK Credit Scout - Deployed Contracts
# Network: ${network.name} (Chain ID: ${chainId})
# Deployed at: ${deploymentInfo.deployedAt}
# Deployer: ${deployer.address}

VITE_VERIFIER_ADDRESS=${verifierAddress}
VITE_PRIVATE_CREDIT_LENDING_ADDRESS=${lendingAddress}
VITE_NETWORK_CHAIN_ID=${chainId}
VITE_EXPLORER_URL=${explorerUrl}
`;
  
  const envFile = path.join(__dirname, "..", ".env.deployment");
  fs.writeFileSync(envFile, envContent);
  console.log(`✓ Frontend env saved to: ${envFile}`);

  // Integrate with frontend (copy ABIs and update env)
  console.log("");
  console.log("=".repeat(60));
  console.log("Integrating with frontend...");
  console.log("=".repeat(60));
  try {
    const { execSync } = require("child_process");
    execSync("npm run integrate:frontend", { 
      cwd: path.join(__dirname, ".."),
      stdio: "inherit"
    });
  } catch (error) {
    console.warn("⚠ Frontend integration failed. Run 'npm run integrate:frontend' manually.");
  }
  
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

