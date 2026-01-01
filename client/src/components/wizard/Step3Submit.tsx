import { useState } from 'react';
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InferenceResult, ProofResult, getScoreCategory } from '@/lib/mock-inference';
import { LENDING_CONTRACT_ADDRESS } from '@/lib/mantle-config';

interface Step3SubmitProps {
  inferenceResult: InferenceResult;
  proofResult: ProofResult;
  setTxHash: (hash: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step3Submit({ inferenceResult, proofResult, setTxHash, onNext, onBack }: Step3SubmitProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scoreCategory = getScoreCategory(inferenceResult.score);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate transaction
    await new Promise((r) => setTimeout(r, 2000));
    const mockTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    setTxHash(mockTxHash);
    setIsSubmitting(false);
    onNext();
  };

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-headline font-semibold mb-3">Submit to Mantle</h2>
        <p className="text-muted-foreground">Your verified score will be recorded on-chain</p>
      </div>

      {/* Summary */}
      <div className="border border-border rounded-lg divide-y divide-border">
        {/* Score */}
        <div className="p-6 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Verified Score</span>
          <div className="text-right">
            <span className={`text-2xl font-semibold score-${scoreCategory.color}`}>
              {inferenceResult.score}
            </span>
            <span className="text-sm text-muted-foreground ml-2">{scoreCategory.label}</span>
          </div>
        </div>

        {/* Explanations */}
        <div className="p-6">
          <span className="text-sm text-muted-foreground block mb-3">Public Explanations</span>
          <div className="space-y-2">
            {inferenceResult.explanations.slice(0, 3).map((exp, i) => (
              <p key={i} className="text-sm">{exp.description}</p>
            ))}
          </div>
        </div>

        {/* Proof */}
        <div className="p-6">
          <span className="text-sm text-muted-foreground block mb-2">Proof Hash</span>
          <code className="text-xs text-muted-foreground break-all">{proofResult.proofHash}</code>
        </div>

        {/* Contract */}
        {LENDING_CONTRACT_ADDRESS && (
          <div className="p-6">
            <span className="text-sm text-muted-foreground block mb-2">Contract</span>
            <code className="text-xs text-muted-foreground">{LENDING_CONTRACT_ADDRESS}</code>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button size="lg" onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              Submit to Mantle
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
