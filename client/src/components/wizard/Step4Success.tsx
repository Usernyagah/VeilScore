import { CheckCircle, ExternalLink, RefreshCw, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InferenceResult, getScoreCategory } from '@/lib/mock-inference';

interface Step4SuccessProps {
  inferenceResult: InferenceResult;
  txHash: string;
  onReset: () => void;
}

export function Step4Success({ inferenceResult, txHash, onReset }: Step4SuccessProps) {
  const scoreCategory = getScoreCategory(inferenceResult.score);
  const isEligible = inferenceResult.score >= 650;

  return (
    <div className="space-y-10 animate-fade-in text-center">
      {/* Success Icon */}
      <div className="pt-8">
        <CheckCircle className="h-12 w-12 text-accent mx-auto mb-6" />
        <h2 className="text-headline font-semibold mb-2">Score Verified</h2>
        <p className="text-muted-foreground">Your credit score is now on-chain</p>
      </div>

      {/* Score */}
      <div className="py-8 border border-border rounded-lg max-w-sm mx-auto">
        <div className={`text-6xl font-semibold mb-2 score-${scoreCategory.color}`}>
          {inferenceResult.score}
        </div>
        <div className="font-medium">{scoreCategory.label}</div>
      </div>

      {/* Outcome */}
      <div className="max-w-md mx-auto">
        <p className="text-sm text-muted-foreground">
          {isEligible 
            ? 'Eligible for undercollateralized lending at prime rates.'
            : 'Qualifies for standard DeFi lending with collateral.'}
        </p>
      </div>

      {/* Transaction */}
      <div>
        <a
          href={`https://explorer.sepolia.mantle.xyz/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm hover:underline"
        >
          View on Explorer
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <Button onClick={onReset} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          New Score
        </Button>
        <Button asChild className="gap-2">
          <a
            href={`https://twitter.com/intent/tweet?text=Verified%20my%20credit%20score%20privately%20on%20Mantle%20using%20ZK%20proofs%20%F0%9F%94%90`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Twitter className="h-4 w-4" />
            Share
          </a>
        </Button>
      </div>
    </div>
  );
}
