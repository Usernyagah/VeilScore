import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("MockVerifier", function () {
  async function deployMockVerifierFixture() {
    const [owner] = await ethers.getSigners();
    
    const MockVerifier = await ethers.getContractFactory("MockVerifier");
    const verifier = await MockVerifier.deploy();
    await verifier.waitForDeployment();
    const verifierAddress = await verifier.getAddress();
    
    return { owner, verifier, verifierAddress };
  }

  describe("Deployment", function () {
    it("Should deploy with acceptAllProofs set to false", async function () {
      const { verifier } = await loadFixture(deployMockVerifierFixture);
      expect(await verifier.acceptAllProofs()).to.be.false;
    });
  });

  describe("setValidProof", function () {
    it("Should set proof as valid", async function () {
      const { verifier } = await loadFixture(deployMockVerifierFixture);
      
      const proof = "0x1234";
      const publicInputs = "0x5678";
      const proofHash = ethers.keccak256(ethers.concat([proof, publicInputs]));
      
      await verifier.setValidProof(proofHash, true);
      expect(await verifier.verify(proof, publicInputs)).to.be.true;
    });

    it("Should set proof as invalid", async function () {
      const { verifier } = await loadFixture(deployMockVerifierFixture);
      
      const proof = "0x1234";
      const publicInputs = "0x5678";
      const proofHash = ethers.keccak256(ethers.concat([proof, publicInputs]));
      
      await verifier.setValidProof(proofHash, false);
      expect(await verifier.verify(proof, publicInputs)).to.be.false;
    });
  });

  describe("setAcceptAllProofs", function () {
    it("Should accept all proofs when enabled", async function () {
      const { verifier } = await loadFixture(deployMockVerifierFixture);
      
      await verifier.setAcceptAllProofs(true);
      expect(await verifier.acceptAllProofs()).to.be.true;
      expect(await verifier.verify("0x1234", "0x5678")).to.be.true;
      expect(await verifier.verify("0xabcd", "0xef01")).to.be.true;
    });

    it("Should reject proofs when disabled", async function () {
      const { verifier } = await loadFixture(deployMockVerifierFixture);
      
      await verifier.setAcceptAllProofs(false);
      expect(await verifier.acceptAllProofs()).to.be.false;
      expect(await verifier.verify("0x1234", "0x5678")).to.be.false;
    });
  });

  describe("verify", function () {
    it("Should return false for unknown proofs by default", async function () {
      const { verifier } = await loadFixture(deployMockVerifierFixture);
      expect(await verifier.verify("0x1234", "0x5678")).to.be.false;
    });

    it("Should return true for valid proofs when acceptAllProofs is false but proof is set", async function () {
      const { verifier } = await loadFixture(deployMockVerifierFixture);
      
      const proof = "0x1234";
      const publicInputs = "0x5678";
      const proofHash = ethers.keccak256(ethers.concat([proof, publicInputs]));
      
      await verifier.setValidProof(proofHash, true);
      expect(await verifier.verify(proof, publicInputs)).to.be.true;
    });

    it("Should handle empty proof and inputs", async function () {
      const { verifier } = await loadFixture(deployMockVerifierFixture);
      
      await verifier.setAcceptAllProofs(true);
      expect(await verifier.verify("0x", "0x")).to.be.true;
    });
  });
});

