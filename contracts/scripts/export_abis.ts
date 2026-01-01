import * as fs from "fs";
import * as path from "path";

async function main() {
  const artifactsDir = path.join(__dirname, "..", "artifacts", "contracts");
  const outputDir = path.join(__dirname, "..", "abis");
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const contracts = ["Verifier", "PrivateCreditLending"];
  
  console.log("Exporting ABIs...");
  
  for (const contractName of contracts) {
    const contractPath = path.join(artifactsDir, `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(contractPath)) {
      console.warn(`⚠ Contract artifact not found: ${contractPath}`);
      console.warn(`  Run 'npx hardhat compile' first`);
      continue;
    }
    
    const artifact = JSON.parse(fs.readFileSync(contractPath, "utf8"));
    const abi = artifact.abi;
    
    const outputPath = path.join(outputDir, `${contractName}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(abi, null, 2));
    
    console.log(`✓ Exported ${contractName} ABI to ${outputPath}`);
  }
  
  // Also create a combined file
  const combinedAbis: Record<string, any[]> = {};
  for (const contractName of contracts) {
    const abiPath = path.join(outputDir, `${contractName}.json`);
    if (fs.existsSync(abiPath)) {
      combinedAbis[contractName] = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    }
  }
  
  const combinedPath = path.join(outputDir, "all.json");
  fs.writeFileSync(combinedPath, JSON.stringify(combinedAbis, null, 2));
  console.log(`✓ Exported combined ABIs to ${combinedPath}`);
  
  console.log("");
  console.log("ABI export complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

