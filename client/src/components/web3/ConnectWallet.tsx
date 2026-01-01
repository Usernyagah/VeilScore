import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { Wallet, ChevronDown, LogOut, Copy, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mantleSepolia } from '@/lib/mantle-config';
import { useToast } from '@/hooks/use-toast';

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { toast } = useToast();

  const isWrongNetwork = isConnected && chainId !== mantleSepolia.id;

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast({
        title: 'Address copied',
        description: 'Wallet address copied to clipboard',
      });
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="gap-2" disabled={isPending}>
            <Wallet className="h-4 w-4" />
            {isPending ? 'Connecting...' : 'Connect Wallet'}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {connectors.map((connector) => (
            <DropdownMenuItem
              key={connector.uid}
              onClick={() => connect({ connector })}
              className="cursor-pointer"
            >
              {connector.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (isWrongNetwork) {
    return (
      <Button
        variant="destructive"
        onClick={() => switchChain({ chainId: mantleSepolia.id })}
        className="gap-2"
      >
        <AlertCircle className="h-4 w-4" />
        Switch to Mantle Sepolia
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          {formatAddress(address!)}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleCopyAddress} className="cursor-pointer">
          <Copy className="mr-2 h-4 w-4" />
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://explorer.sepolia.mantle.xyz/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View on Explorer
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => disconnect()}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
