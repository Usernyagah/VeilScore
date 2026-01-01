import { ExternalLink } from 'lucide-react';
import { MANTLE_FAUCET_URL } from '@/lib/mantle-config';

export function NetworkBanner() {
  return (
    <div className="w-full bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-white px-4 py-2">
      <div className="container mx-auto flex items-center justify-center gap-2 text-sm font-medium">
        <span className="inline-flex h-2 w-2 rounded-full bg-white animate-pulse" />
        <span>Connected to Mantle Sepolia Testnet</span>
        <span className="mx-2 opacity-60">|</span>
        <a
          href={MANTLE_FAUCET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-80 transition-opacity"
        >
          Get testnet MNT
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
