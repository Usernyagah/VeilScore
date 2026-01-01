import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("PrivateCreditLending", function () {
  // Fixture data
  const VALID_SCORE = 720;
  const VALID_CONTRIBUTIONS: [bigint, bigint, bigint] = [
    BigInt(-234), // -0.0234 * 10000
    BigInt(189),  // 0.0189 * 10000
    BigInt(-123), // -0.0123 * 10000
  ];

  // Test fixture: deploy contracts
  async function deployContractsFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy MockVerifier for testing
    const MockVerifier = await ethers.getContractFactory("MockVerifier");
    const mockVerifier = await MockVerifier.deploy();
    await mockVerifier.waitForDeployment();
    const verifierAddress = await mockVerifier.getAddress();

    // Deploy PrivateCreditLending
    const PrivateCreditLending = await ethers.getContractFactory("PrivateCreditLending");
    const lending = await PrivateCreditLending.deploy(verifierAddress);
    await lending.waitForDeployment();
    const lendingAddress = await lending.getAddress();

    return {
      owner,
      user1,
      user2,
      user3,
      mockVerifier,
      lending,
      verifierAddress,
      lendingAddress,
    };
  }

  // Helper: create mock proof bytes
  function createMockProof(proofId: string = "valid"): string {
    return ethers.hexlify(ethers.toUtf8Bytes(`proof_${proofId}_${Date.now()}`));
  }

  // Helper: encode public inputs
  function encodePublicInputs(score: bigint, contributions: [bigint, bigint, bigint]): string {
    return ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "int256[3]"],
      [score, contributions]
    );
  }

  // Helper: set proof as valid in mock verifier
  async function setProofValid(
    mockVerifier: any,
    proof: string,
    publicInputs: string
  ) {
    const proofHash = ethers.keccak256(ethers.concat([proof, publicInputs]));
    await mockVerifier.setValidProof(proofHash, true);
  }

  describe("Deployment", function () {
    it("Should deploy with correct verifier address", async function () {
      const { lending, verifierAddress } = await loadFixture(deployContractsFixture);
      expect(await lending.verifier()).to.equal(verifierAddress);
    });

    it("Should reject zero address verifier", async function () {
      const PrivateCreditLending = await ethers.getContractFactory("PrivateCreditLending");
      await expect(
        PrivateCreditLending.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("PrivateCreditLending: Invalid verifier address");
    });
  });

  describe("submitScore", function () {
    it("Should submit valid score and emit event", async function () {
      const { user1, mockVerifier, lending } = await loadFixture(deployContractsFixture);
      
      const proof = createMockProof("valid");
      const publicInputs = encodePublicInputs(BigInt(VALID_SCORE), VALID_CONTRIBUTIONS);
      
      await setProofValid(mockVerifier, proof, publicInputs);
      
      await expect(
        lending.connect(user1).submitScore(proof, VALID_SCORE, VALID_CONTRIBUTIONS)
      )
        .to.emit(lending, "ScoreSubmitted")
        .withArgs(user1.address, VALID_SCORE, VALID_CONTRIBUTIONS);
      
      expect(await lending.creditScores(user1.address)).to.equal(VALID_SCORE);
    });

    it("Should reject invalid proof", async function () {
      const { user1, lending } = await loadFixture(deployContractsFixture);
      
      const proof = createMockProof("invalid");
      const publicInputs = encodePublicInputs(BigInt(VALID_SCORE), VALID_CONTRIBUTIONS);
      
      await expect(
        lending.connect(user1).submitScore(proof, VALID_SCORE, VALID_CONTRIBUTIONS)
      ).to.be.revertedWith("PrivateCreditLending: Invalid proof");
    });

    it("Should allow multiple users to submit scores", async function () {
      const { user1, user2, user3, mockVerifier, lending } = await loadFixture(deployContractsFixture);
      
      const scores = [650, 720, 800];
      const contributions = [
        [BigInt(-100), BigInt(50), BigInt(-25)],
        VALID_CONTRIBUTIONS,
        [BigInt(200), BigInt(150), BigInt(100)],
      ];
      
      for (let i = 0; i < 3; i++) {
        const user = [user1, user2, user3][i];
        const proof = createMockProof(`user${i}`);
        const publicInputs = encodePublicInputs(BigInt(scores[i]), contributions[i] as [bigint, bigint, bigint]);
        
        await setProofValid(mockVerifier, proof, publicInputs);
        
        await lending.connect(user).submitScore(proof, scores[i], contributions[i] as [bigint, bigint, bigint]);
        
        expect(await lending.creditScores(user.address)).to.equal(scores[i]);
      }
    });

    it("Should allow user to update their score", async function () {
      const { user1, mockVerifier, lending } = await loadFixture(deployContractsFixture);
      
      // First submission
      const proof1 = createMockProof("first");
      const publicInputs1 = encodePublicInputs(BigInt(650), VALID_CONTRIBUTIONS);
      await setProofValid(mockVerifier, proof1, publicInputs1);
      
      await lending.connect(user1).submitScore(proof1, 650, VALID_CONTRIBUTIONS);
      expect(await lending.creditScores(user1.address)).to.equal(650);
      
      // Update with new score
      const proof2 = createMockProof("second");
      const publicInputs2 = encodePublicInputs(BigInt(750), VALID_CONTRIBUTIONS);
      await setProofValid(mockVerifier, proof2, publicInputs2);
      
      await lending.connect(user1).submitScore(proof2, 750, VALID_CONTRIBUTIONS);
      expect(await lending.creditScores(user1.address)).to.equal(750);
    });

    it("Should handle boundary scores (min)", async function () {
      const { user1, mockVerifier, lending } = await loadFixture(deployContractsFixture);
      
      const minScore = 300;
      const proof = createMockProof("min");
      const publicInputs = encodePublicInputs(BigInt(minScore), VALID_CONTRIBUTIONS);
      await setProofValid(mockVerifier, proof, publicInputs);
      
      await lending.connect(user1).submitScore(proof, minScore, VALID_CONTRIBUTIONS);
      expect(await lending.creditScores(user1.address)).to.equal(minScore);
    });

    it("Should handle boundary scores (max)", async function () {
      const { user1, mockVerifier, lending } = await loadFixture(deployContractsFixture);
      
      const maxScore = 850;
      const proof = createMockProof("max");
      const publicInputs = encodePublicInputs(BigInt(maxScore), VALID_CONTRIBUTIONS);
      await setProofValid(mockVerifier, proof, publicInputs);
      
      await lending.connect(user1).submitScore(proof, maxScore, VALID_CONTRIBUTIONS);
      expect(await lending.creditScores(user1.address)).to.equal(maxScore);
    });

    it("Should handle zero score", async function () {
      const { user1, mockVerifier, lending } = await loadFixture(deployContractsFixture);
      
      const proof = createMockProof("zero");
      const publicInputs = encodePublicInputs(BigInt(0), VALID_CONTRIBUTIONS);
      await setProofValid(mockVerifier, proof, publicInputs);
      
      await lending.connect(user1).submitScore(proof, 0, VALID_CONTRIBUTIONS);
      expect(await lending.creditScores(user1.address)).to.equal(0);
    });

    it("Should handle very large scores", async function () {
      const { user1, mockVerifier, lending } = await loadFixture(deployContractsFixture);
      
      const largeScore = ethers.MaxUint256;
      const proof = createMockProof("large");
      const publicInputs = encodePublicInputs(largeScore, VALID_CONTRIBUTIONS);
      await setProofValid(mockVerifier, proof, publicInputs);
      
      await lending.connect(user1).submitScore(proof, largeScore, VALID_CONTRIBUTIONS);
      expect(await lending.creditScores(user1.address)).to.equal(largeScore);
    });

    it("Should handle negative contributions", async function () {
      const { user1, mockVerifier, lending } = await loadFixture(deployContractsFixture);
      
      const negativeContribs: [bigint, bigint, bigint] = [
        BigInt(-1000),
        BigInt(-500),
        BigInt(-250),
      ];
      
      const proof = createMockProof("negative");
      const publicInputs = encodePublicInputs(BigInt(VALID_SCORE), negativeContribs);
      await setProofValid(mockVerifier, proof, publicInputs);
      
      await expect(
        lending.connect(user1).submitScore(proof, VALID_SCORE, negativeContribs)
      )
        .to.emit(lending, "ScoreSubmitted")
        .withArgs(user1.address, VALID_SCORE, negativeContribs);
    });

    it("Should handle positive contributions", async function () {
      const { user1, mockVerifier, lending } = await loadFixture(deployContractsFixture);
      
      const positiveContribs: [bigint, bigint, bigint] = [
        BigInt(1000),
        BigInt(500),
        BigInt(250),
      ];
      
      const proof = createMockProof("positive");
      const publicInputs = encodePublicInputs(BigInt(VALID_SCORE), positiveContribs);
      await setProofValid(mockVerifier, proof, publicInputs);
      
      await expect(
        lending.connect(user1).submitScore(proof, VALID_SCORE, positiveContribs)
      )
        .to.emit(lending, "ScoreSubmitted")
        .withArgs(user1.address, VALID_SCORE, positiveContribs);
    });

    it("Should handle mixed positive/negative contributions", async function () {
      const { user1, mockVerifier, lending } = await loadFixture(deployContractsFixture);
      
      const mixedContribs: [bigint, bigint, bigint] = [
        BigInt(-234),
        BigInt(189),
        BigInt(-123),
      ];
      
      const proof = createMockProof("mixed");
      const publicInputs = encodePublicInputs(BigInt(VALID_SCORE), mixedContribs);
      await setProofValid(mockVerifier, proof, publicInputs);
      
      await expect(
        lending.connect(user1).submitScore(proof, VALID_SCORE, mixedContribs)
      )
        .to.emit(lending, "ScoreSubmitted")
        .withArgs(user1.address, VALID_SCORE, mixedContribs);
    });

    it("Should reject proof with mismatched public inputs", async function () {
      const { user1, mockVerifier, lending } = await loadFixture(deployContractsFixture);
      
      const proof = createMockProof("mismatch");
      // Set proof valid for one set of inputs
      const publicInputs1 = encodePublicInputs(BigInt(VALID_SCORE), VALID_CONTRIBUTIONS);
      await setProofValid(mockVerifier, proof, publicInputs1);
      
      // Try to use different inputs
      const wrongContributions: [bigint, bigint, bigint] = [BigInt(999), BigInt(999), BigInt(999)];
      await expect(
        lending.connect(user1).submitScore(proof, VALID_SCORE, wrongContributions)
      ).to.be.revertedWith("PrivateCreditLending: Invalid proof");
    });

    it("Should properly encode public inputs", async function () {
      const { user1, mockVerifier, lending } = await loadFixture(deployContractsFixture);
      
      const proof = createMockProof("encoding");
      const publicInputs = encodePublicInputs(BigInt(VALID_SCORE), VALID_CONTRIBUTIONS);
      await setProofValid(mockVerifier, proof, publicInputs);
      
      // Verify the encoding matches what the contract expects
      const expectedEncoding = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "int256[3]"],
        [BigInt(VALID_SCORE), VALID_CONTRIBUTIONS]
      );
      expect(publicInputs).to.equal(expectedEncoding);
      
      await lending.connect(user1).submitScore(proof, VALID_SCORE, VALID_CONTRIBUTIONS);
    });
  });

  describe("getCreditScore", function () {
    it("Should return 0 for users without scores", async function () {
      const { user1, lending } = await loadFixture(deployContractsFixture);
      expect(await lending.getCreditScore(user1.address)).to.equal(0);
    });

    it("Should return correct score after submission", async function () {
      const { user1, mockVerifier, lending } = await loadFixture(deployContractsFixture);
      
      const proof = createMockProof("getter");
      const publicInputs = encodePublicInputs(BigInt(VALID_SCORE), VALID_CONTRIBUTIONS);
      await setProofValid(mockVerifier, proof, publicInputs);
      
      await lending.connect(user1).submitScore(proof, VALID_SCORE, VALID_CONTRIBUTIONS);
      expect(await lending.getCreditScore(user1.address)).to.equal(VALID_SCORE);
    });
  });

  describe("creditScores mapping", function () {
    it("Should store scores correctly in public mapping", async function () {
      const { user1, mockVerifier, lending } = await loadFixture(deployContractsFixture);
      
      const proof = createMockProof("mapping");
      const publicInputs = encodePublicInputs(BigInt(VALID_SCORE), VALID_CONTRIBUTIONS);
      await setProofValid(mockVerifier, proof, publicInputs);
      
      await lending.connect(user1).submitScore(proof, VALID_SCORE, VALID_CONTRIBUTIONS);
      expect(await lending.creditScores(user1.address)).to.equal(VALID_SCORE);
    });
  });

  describe("Gas optimization", function () {
    it("Should use reasonable gas for score submission", async function () {
      const { user1, mockVerifier, lending } = await loadFixture(deployContractsFixture);
      
      // Enable accept all proofs for simpler gas measurement
      await mockVerifier.setAcceptAllProofs(true);
      
      const proof = createMockProof("gas");
      const tx = await lending.connect(user1).submitScore(proof, VALID_SCORE, VALID_CONTRIBUTIONS);
      const receipt = await tx.wait();
      
      // Gas should be reasonable (< 500k for typical operations)
      expect(receipt!.gasUsed).to.be.lessThan(500000n);
    });
  });
});

