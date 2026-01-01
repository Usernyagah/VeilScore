// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Verifier.sol";

/**
 * @title PrivateCreditLending
 * @notice On-chain credit scoring with zero-knowledge proof verification
 * @dev Stores verified credit scores submitted with ZK proofs
 */
contract PrivateCreditLending {
    Verifier public verifier;
    
    /// @notice Maps user address to their verified credit score
    mapping(address => uint256) public creditScores;
    
    /// @notice Emitted when a user submits a verified credit score
    /// @param user The address of the user submitting the score
    /// @param score The verified credit score (typically 300-850)
    /// @param contributions Array of top 3 feature contribution impacts (int256)
    event ScoreSubmitted(
        address indexed user,
        uint256 score,
        int256[3] contributions
    );
    
    /**
     * @notice Constructor
     * @param _verifier Address of the Verifier contract (EZKL Groth16 verifier)
     */
    constructor(address _verifier) {
        require(_verifier != address(0), "PrivateCreditLending: Invalid verifier address");
        verifier = Verifier(_verifier);
    }
    
    /**
     * @notice Submit a credit score with zero-knowledge proof
     * @param proof The ZK proof bytes from EZKL
     * @param publicScore The credit score (public output from the proof)
     * @param contributions Array of 3 feature contribution values (SHAP impacts)
     * 
     * @dev The proof must prove knowledge of private inputs (features) that produce
     *      the publicScore and contributions without revealing the inputs.
     *      Public inputs are encoded as: abi.encode(publicScore, contributions)
     */
    function submitScore(
        bytes calldata proof,
        uint256 publicScore,
        int256[3] calldata contributions
    ) external {
        // Encode public inputs: [publicScore, contributions[0], contributions[1], contributions[2]]
        bytes memory publicInputs = abi.encode(publicScore, contributions);
        
        // Verify the proof
        require(
            verifier.verify(proof, publicInputs),
            "PrivateCreditLending: Invalid proof"
        );
        
        // Store the verified credit score
        creditScores[msg.sender] = publicScore;
        
        // Emit event with score and feature contributions
        emit ScoreSubmitted(msg.sender, publicScore, contributions);
    }
    
    /**
     * @notice Get credit score for a user
     * @param user The address to query
     * @return The verified credit score (0 if not set)
     */
    function getCreditScore(address user) external view returns (uint256) {
        return creditScores[user];
    }
}

