import '@testing-library/jest-dom';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({ address: undefined, isConnected: false })),
  useConnect: jest.fn(() => ({ connect: jest.fn(), connectors: [], isPending: false })),
  useDisconnect: jest.fn(() => ({ disconnect: jest.fn() })),
  useChainId: jest.fn(() => 5003),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn() })),
  WagmiProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  Navigate: () => null,
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});
