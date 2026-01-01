import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

/**
 * Script to check if EZKL verifier exists and provide instructions
 * This helps integrate the EZKL pipeline with the contracts
 */
async function main() {
  const contractsDir = path.join(__dirname, "..");
  const zkmlDir = path.join(contractsDir, "..", "zkml");
  const verifierPath = path.join(contractsDir, "contracts", "Verifier.sol");
  const ezklContractsDir = path.join(zkmlDir, "contracts");

  console.log("=".repeat(60));
  console.log("EZKL Verifier Integration Check");
  console.log("=".repeat(60));
  console.log("");

  // Check if EZKL verifier exists in zkml/contracts
  const ezklVerifierPath = path.join(ezklContractsDir, "Verifier.sol");
  if (fs.existsSync(ezklVerifierPath)) {
    console.log("✓ Found EZKL-generated Verifier.sol in zkml/contracts");
    console.log("");
    console.log("Would you like to copy it to contracts/contracts/?");
    console.log("This will replace the placeholder Verifier.sol");
    console.log("");
    console.log("To copy manually:");
    console.log(`  cp ${ezklVerifierPath} ${verifierPath}`);
    console.log("");
  } else {
    console.log("⚠ EZKL Verifier.sol not found in zkml/contracts");
    console.log("");
    console.log("To generate the EZKL verifier:");
    console.log("  1. cd ../zkml");
    console.log("  2. python3 ezkl_pipeline.py");
    console.log("  3. This will generate contracts/Verifier.sol");
    console.log("  4. Copy it to contracts/contracts/Verifier.sol");
    console.log("");
  }

  // Check if placeholder verifier exists
  if (fs.existsSync(verifierPath)) {
    const content = fs.readFileSync(verifierPath, "utf8");
    if (content.includes("PLACEHOLDER") || content.includes("Replace with EZKL")) {
      console.log("ℹ Current Verifier.sol is a placeholder");
      console.log("  It will deploy but revert on verify() calls");
      console.log("  Replace with EZKL-generated verifier before production deployment");
      console.log("");
    } else {
      console.log("✓ Verifier.sol appears to be a real EZKL-generated verifier");
      console.log("");
    }
  }

  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

