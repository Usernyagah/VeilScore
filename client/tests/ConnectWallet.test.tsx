import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectWallet } from '@/components/web3/ConnectWallet';
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';

jest.mock('wagmi');

const mockUseAccount = useAccount as jest.Mock;
const mockUseConnect = useConnect as jest.Mock;
const mockUseDisconnect = useDisconnect as jest.Mock;
const mockUseChainId = useChainId as jest.Mock;
const mockUseSwitchChain = useSwitchChain as jest.Mock;

describe('ConnectWallet', () => {
  beforeEach(() => {
    mockUseConnect.mockReturnValue({
      connect: jest.fn(),
      connectors: [{ id: 'injected', name: 'MetaMask' }],
      isPending: false,
    });
    mockUseDisconnect.mockReturnValue({ disconnect: jest.fn() });
    mockUseChainId.mockReturnValue(5003);
    mockUseSwitchChain.mockReturnValue({ switchChain: jest.fn() });
  });

  it('shows connect button when disconnected', () => {
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false });
    
    render(<ConnectWallet />);
    
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
  });

  it('shows address when connected', () => {
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
    });
    
    render(<ConnectWallet />);
    
    expect(screen.getByText('0x1234...7890')).toBeInTheDocument();
  });

  it('shows wrong network alert when on different chain', () => {
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
    });
    mockUseChainId.mockReturnValue(1); // Ethereum mainnet
    
    render(<ConnectWallet />);
    
    expect(screen.getByText('Wrong Network')).toBeInTheDocument();
  });

  it('opens connector dropdown on click when disconnected', () => {
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false });
    
    render(<ConnectWallet />);
    fireEvent.click(screen.getByText('Connect Wallet'));
    
    expect(screen.getByText('MetaMask')).toBeInTheDocument();
  });
});
