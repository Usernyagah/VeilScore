// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MockVerifier
 * @notice Mock verifier for testing purposes
 * @dev This contract should ONLY be used in tests, never in production
 */
contract MockVerifier {
    mapping(bytes32 => bool) private validProofs;
    bool public acceptAllProofs;
    
    constructor() {
        acceptAllProofs = false;
    }
    
    /**
     * @notice Set a proof hash as valid (for testing)
     */
    function setValidProof(bytes32 proofHash, bool isValid) external {
        validProofs[proofHash] = isValid;
    }
    
    /**
     * @notice Set whether to accept all proofs (for testing)
     */
    function setAcceptAllProofs(bool accept) external {
        acceptAllProofs = accept;
    }
    
    /**
     * @notice Mock verify function
     */
    function verify(
        bytes calldata proof,
        bytes calldata publicInputs
    ) external view returns (bool) {
        if (acceptAllProofs) {
            return true;
        }
        
        bytes32 proofHash = keccak256(abi.encodePacked(proof, publicInputs));
        return validProofs[proofHash];
    }
}

