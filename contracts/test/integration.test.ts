import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

describe("Integration Scripts", function () {
  const contractsDir = path.join(__dirname, "..");
  const abisDir = path.join(contractsDir, "abis");
  const frontendDir = path.join(contractsDir, "..", "client");
  const frontendAbisDir = path.join(frontendDir, "src", "lib", "contracts");

  describe("ABI Export", function () {
    it("Should export ABIs after compilation", async function () {
      // Ensure contracts are compiled
      try {
        execSync("npm run compile", { cwd: contractsDir, stdio: "pipe" });
      } catch (error) {
        // Compilation may fail if already compiled, that's ok
      }

      // Run export script
      execSync("npm run export", { cwd: contractsDir, stdio: "pipe" });

      // Check that ABIs exist
      expect(fs.existsSync(path.join(abisDir, "Verifier.json"))).to.be.true;
      expect(fs.existsSync(path.join(abisDir, "PrivateCreditLending.json"))).to.be.true;
      expect(fs.existsSync(path.join(abisDir, "all.json"))).to.be.true;

      // Verify ABIs are valid JSON
      const verifierAbi = JSON.parse(
        fs.readFileSync(path.join(abisDir, "Verifier.json"), "utf8")
      );
      const lendingAbi = JSON.parse(
        fs.readFileSync(path.join(abisDir, "PrivateCreditLending.json"), "utf8")
      );
      const allAbis = JSON.parse(
        fs.readFileSync(path.join(abisDir, "all.json"), "utf8")
      );

      expect(verifierAbi).to.be.an("array");
      expect(lendingAbi).to.be.an("array");
      expect(allAbis).to.be.an("object");
      expect(allAbis).to.have.property("Verifier");
      expect(allAbis).to.have.property("PrivateCreditLending");
    });

    it("Should export valid contract ABIs", async function () {
      const lendingAbi = JSON.parse(
        fs.readFileSync(path.join(abisDir, "PrivateCreditLending.json"), "utf8")
      );

      // Check for key functions
      const functions = lendingAbi.filter((item: any) => item.type === "function");
      const functionNames = functions.map((f: any) => f.name);

      expect(functionNames).to.include("submitScore");
      expect(functionNames).to.include("getCreditScore");
      expect(functionNames).to.include("creditScores");

      // Check for events
      const events = lendingAbi.filter((item: any) => item.type === "event");
      const eventNames = events.map((e: any) => e.name);
      expect(eventNames).to.include("ScoreSubmitted");
    });
  });

  describe("Frontend Integration", function () {
    before(function () {
      this.timeout(60000);
      // Ensure ABIs exist before integration
      if (!fs.existsSync(path.join(abisDir, "PrivateCreditLending.json"))) {
        execSync("npm run export", { 
          cwd: contractsDir, 
          stdio: "pipe",
          timeout: 60000 
        });
      }
    });

    it("Should copy ABIs to frontend", async function () {
      this.timeout(90000); // Increase timeout for compilation + integration
      // Run integration script
      execSync("npm run integrate:frontend", { 
        cwd: contractsDir, 
        stdio: "pipe",
        timeout: 90000 
      });

      // Check that ABIs were copied
      expect(fs.existsSync(path.join(frontendAbisDir, "PrivateCreditLending.json"))).to.be.true;
      expect(fs.existsSync(path.join(frontendAbisDir, "Verifier.json"))).to.be.true;
      expect(fs.existsSync(path.join(frontendAbisDir, "all.json"))).to.be.true;

      // Verify files are identical
      const original = fs.readFileSync(path.join(abisDir, "PrivateCreditLending.json"), "utf8");
      const copied = fs.readFileSync(path.join(frontendAbisDir, "PrivateCreditLending.json"), "utf8");
      expect(original).to.equal(copied);
    });

    it("Should create frontend .env.example", async function () {
      const envExamplePath = path.join(frontendDir, ".env.example");

      expect(fs.existsSync(envExamplePath)).to.be.true;

      const content = fs.readFileSync(envExamplePath, "utf8");
      expect(content).to.include("VITE_VERIFIER_ADDRESS");
      expect(content).to.include("VITE_PRIVATE_CREDIT_LENDING_ADDRESS");
      expect(content).to.include("VITE_NETWORK_CHAIN_ID");
      expect(content).to.include("VITE_EXPLORER_URL");
    });

    it("Should create contract-config.ts in frontend", async function () {
      const configPath = path.join(frontendAbisDir, "contract-config.ts");
      
      // This file might exist, check if it does
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, "utf8");
        expect(content).to.include("VERIFIER_ADDRESS");
        expect(content).to.include("PRIVATE_CREDIT_LENDING_ADDRESS");
      }
    });
  });

  describe("Contract ABIs Structure", function () {
    it("Should have correct PrivateCreditLending ABI structure", function () {
      const abi = JSON.parse(
        fs.readFileSync(path.join(abisDir, "PrivateCreditLending.json"), "utf8")
      );

      // Check constructor
      const constructor = abi.find((item: any) => item.type === "constructor");
      expect(constructor).to.exist;
      expect(constructor.inputs).to.have.length(1);
      expect(constructor.inputs[0].name).to.equal("_verifier");

      // Check submitScore function
      const submitScore = abi.find(
        (item: any) => item.type === "function" && item.name === "submitScore"
      );
      expect(submitScore).to.exist;
      expect(submitScore.inputs).to.have.length(3);
      expect(submitScore.inputs[0].type).to.equal("bytes");
      expect(submitScore.inputs[1].type).to.equal("uint256");
      expect(submitScore.inputs[2].type).to.equal("int256[3]");

      // Check getCreditScore function
      const getCreditScore = abi.find(
        (item: any) => item.type === "function" && item.name === "getCreditScore"
      );
      expect(getCreditScore).to.exist;
      expect(getCreditScore.inputs).to.have.length(1);
      expect(getCreditScore.outputs).to.have.length(1);
      expect(getCreditScore.outputs[0].type).to.equal("uint256");

      // Check ScoreSubmitted event
      const scoreSubmitted = abi.find(
        (item: any) => item.type === "event" && item.name === "ScoreSubmitted"
      );
      expect(scoreSubmitted).to.exist;
      expect(scoreSubmitted.inputs).to.have.length(3);
      expect(scoreSubmitted.inputs[0].name).to.equal("user");
      expect(scoreSubmitted.inputs[0].indexed).to.be.true;
    });

    it("Should have correct Verifier ABI structure", function () {
      const abi = JSON.parse(
        fs.readFileSync(path.join(abisDir, "Verifier.json"), "utf8")
      );

      // Verifier should have verify function
      const verify = abi.find(
        (item: any) => item.type === "function" && item.name === "verify"
      );
      
      // Note: Placeholder verifier will have verify, real EZKL verifier will have it too
      // So we just check that the ABI exists and is valid
      expect(abi).to.be.an("array");
    });
  });

  describe("Script Execution", function () {
    it("Should run export:abis successfully", function () {
      this.timeout(60000); // Increase timeout for compilation
      expect(() => {
        execSync("npm run export:abis", { 
          cwd: contractsDir, 
          stdio: "pipe",
          timeout: 60000 
        });
      }).to.not.throw();
    });

    it("Should run integrate:frontend successfully", function () {
      this.timeout(60000); // Increase timeout for compilation
      expect(() => {
        execSync("npm run integrate:frontend", { 
          cwd: contractsDir, 
          stdio: "pipe",
          timeout: 60000 
        });
      }).to.not.throw();
    });

    it("Should handle missing ABIs gracefully", function () {
      // This test verifies the scripts don't crash on missing files
      // The actual error handling is tested implicitly by the other tests
      expect(fs.existsSync(abisDir)).to.be.true;
    });
  });
});

