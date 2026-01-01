import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { ConnectWallet } from '@/components/web3/ConnectWallet';
import { Button } from '@/components/ui/button';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo - Minimal text mark */}
        <Link to="/" className="flex items-center gap-2">
          <span className="font-semibold text-lg">VeilScore</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {!isLanding && (
            <Link
              to="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
          )}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />
          <ConnectWallet />
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background animate-fade-in">
          <nav className="container mx-auto px-4 py-6 flex flex-col gap-4">
            {!isLanding && (
              <Link
                to="/dashboard"
                className="text-sm py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
            )}
            <div className="flex items-center gap-4 pt-4 border-t border-border">
              <ThemeToggle />
              <ConnectWallet />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
