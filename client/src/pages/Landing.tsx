import { Link } from 'react-router-dom';
import { Shield, Lock, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ConnectWallet } from '@/components/web3/ConnectWallet';
import { useAccount } from 'wagmi';

export default function Landing() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero - Spacious, minimal */}
        <section className="py-24 md:py-40">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-display font-semibold mb-6 animate-slide-up">
                Private Credit Scoring
                <br />
                <span className="text-muted-foreground">for DeFi</span>
              </h1>

              <p className="text-lg text-muted-foreground mb-12 max-w-xl mx-auto animate-slide-up stagger-1">
                Your data never leaves your browser. ZK proofs verify your score on-chain without revealing private information.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up stagger-2">
                {isConnected ? (
                  <Button asChild size="lg" className="gap-2 h-12 px-8">
                    <Link to="/dashboard">
                      Get Your Score
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <ConnectWallet />
                )}
              </div>

              {/* Trust Indicator - Minimal */}
              <p className="mt-16 text-sm text-muted-foreground animate-fade-in stagger-3">
                Trained on 2M+ real LendingClub loans
              </p>
            </div>
          </div>
        </section>

        {/* Benefits - Clean grid with ample spacing */}
        <section className="py-24 border-t border-border">
          <div className="container mx-auto px-4">
            <h2 className="text-headline font-semibold text-center mb-16">
              Why Private Scoring?
            </h2>
            
            <div className="grid md:grid-cols-3 gap-12 md:gap-16 max-w-4xl mx-auto">
              {[
                {
                  icon: Lock,
                  title: 'Local Processing',
                  description: 'All ML inference happens in your browser. Your financial data never leaves your device.',
                },
                {
                  icon: Shield,
                  title: 'ZK Verification',
                  description: 'Cryptographic proofs verify your score without revealing the underlying inputs.',
                },
                {
                  icon: CheckCircle,
                  title: 'On-Chain Trust',
                  description: 'Lenders verify your creditworthiness on-chain without accessing your private data.',
                },
              ].map((benefit, i) => (
                <div
                  key={benefit.title}
                  className="text-center animate-fade-in"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="h-12 w-12 rounded-full border border-border flex items-center justify-center mx-auto mb-5">
                    <benefit.icon className="h-5 w-5 text-foreground" />
                  </div>
                  <h3 className="text-title font-medium mb-3">{benefit.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works - Simple numbered steps */}
        <section className="py-24 border-t border-border bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-headline font-semibold text-center mb-16">
              How It Works
            </h2>
            
            <div className="grid md:grid-cols-4 gap-8 max-w-3xl mx-auto">
              {[
                { step: '1', title: 'Enter Data', desc: 'Input your loan details privately' },
                { step: '2', title: 'Compute', desc: 'Local ML inference calculates score' },
                { step: '3', title: 'Prove', desc: 'ZK proof generated in browser' },
                { step: '4', title: 'Submit', desc: 'Verified score recorded on-chain' },
              ].map((item, i) => (
                <div key={item.step} className="text-center animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="text-4xl font-semibold text-muted-foreground/30 mb-3">
                    {item.step}
                  </div>
                  <h3 className="font-medium mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
