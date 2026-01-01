import { defineChain } from 'viem';
import { http, createConfig } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';

// Mantle Sepolia Testnet Configuration
export const mantleSepolia = defineChain({
  id: 5003,
  name: 'Mantle Sepolia Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MNT',
    symbol: 'MNT',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.sepolia.mantle.xyz'],
    },
    public: {
      http: ['https://rpc.sepolia.mantle.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Mantle Sepolia Explorer',
      url: 'https://explorer.sepolia.mantle.xyz',
    },
  },
  testnet: true,
});

// Faucet URL for testnet MNT
export const MANTLE_FAUCET_URL = 'https://faucet.sepolia.mantle.xyz';

// Contract addresses from environment variables
export const VERIFIER_ADDRESS = import.meta.env.VITE_VERIFIER_ADDRESS as `0x${string}` | undefined;
export const PRIVATE_CREDIT_LENDING_ADDRESS = import.meta.env.VITE_PRIVATE_CREDIT_LENDING_ADDRESS as `0x${string}` | undefined;

// Legacy alias for backward compatibility
export const LENDING_CONTRACT_ADDRESS = PRIVATE_CREDIT_LENDING_ADDRESS;

// Wagmi configuration
export const wagmiConfig = createConfig({
  chains: [mantleSepolia],
  connectors: [
    injected(),
    walletConnect({
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
    }),
  ],
  transports: {
    [mantleSepolia.id]: http(),
  },
});

// Import real contract ABIs (generated from contracts)
import PrivateCreditLendingABI from './contracts/PrivateCreditLending.json';
import VerifierABI from './contracts/Verifier.json';

// Export ABIs for use with wagmi/viem
export const PRIVATE_CREDIT_LENDING_ABI = PrivateCreditLendingABI;
export const VERIFIER_ABI = VerifierABI;

// Legacy alias for backward compatibility
export const LENDING_CONTRACT_ABI = PRIVATE_CREDIT_LENDING_ABI;
