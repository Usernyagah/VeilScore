import { Github, Twitter } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8">
          {/* Brand */}
          <div className="max-w-xs">
            <span className="font-semibold">VeilScore</span>
            <p className="text-sm text-muted-foreground mt-2">
              Privacy-preserving credit scoring with zero-knowledge proofs on blockchain.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-16">
            <div>
              <h4 className="text-sm font-medium mb-4">Resources</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <a href="https://www.kaggle.com/datasets/wordsforthewise/lending-club" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                    Dataset
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            © 2025 VeilScore
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Twitter className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
