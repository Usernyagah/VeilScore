import { useState } from 'react';
import { Loader2, ArrowLeft, ArrowRight, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BorrowerFeatures, InferenceResult, ProofResult, runInference, generateProof, getScoreCategory } from '@/lib/mock-inference';
import { useToast } from '@/hooks/use-toast';

interface Step2ComputeProps {
  features: BorrowerFeatures;
  inferenceResult: InferenceResult | null;
  setInferenceResult: (r: InferenceResult) => void;
  proofResult: ProofResult | null;
  setProofResult: (r: ProofResult) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step2Compute({
  features, inferenceResult, setInferenceResult, proofResult, setProofResult, onNext, onBack,
}: Step2ComputeProps) {
  const [isComputing, setIsComputing] = useState(false);
  const [isProving, setIsProving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCompute = async () => {
    setIsComputing(true);
    setError(null);
    
    try {
      const result = await runInference(features);
      setInferenceResult(result);
      toast({
        title: 'Inference complete',
        description: `Credit score calculated: ${result.score}`,
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to compute credit score. Please try again.';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsComputing(false);
    }
  };

  const handleGenerateProof = async () => {
    if (!inferenceResult) return;
    
    setIsProving(true);
    setError(null);
    
    try {
      const proof = await generateProof(features, inferenceResult);
      setProofResult(proof);
      toast({
        title: 'Proof generated',
        description: 'ZK proof has been successfully created',
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate proof. Please try again.';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProving(false);
    }
  };

  const scoreCategory = inferenceResult ? getScoreCategory(inferenceResult.score) : null;

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-headline font-semibold mb-3">Compute & Prove</h2>
        <p className="text-muted-foreground">Run ML inference, then generate a ZK proof</p>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Compute Section */}
      {!inferenceResult ? (
        <div className="py-16 text-center border border-border rounded-lg">
          <p className="text-muted-foreground mb-6">LightGBM model will analyze your credit profile</p>
          <Button size="lg" onClick={handleCompute} disabled={isComputing} className="gap-2">
            {isComputing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running local inference...
              </>
            ) : (
              'Run Inference'
            )}
          </Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          {/* Score Display */}
          <div className="p-8 text-center border-b border-border">
            <div className={`text-7xl font-semibold mb-2 score-${scoreCategory?.color}`}>
              {inferenceResult.score}
            </div>
            <div className="text-lg font-medium">{scoreCategory?.label}</div>
            <p className="text-sm text-muted-foreground mt-1">{scoreCategory?.description}</p>
          </div>
          
          {/* Explanations */}
          <div className="p-6">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
              Key Factors
            </h4>
            <div className="space-y-3">
              {inferenceResult.explanations.slice(0, 3).map((exp, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    {exp.direction === 'positive' ? (
                      <TrendingUp className="h-4 w-4 text-accent" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                    <span className="text-sm">{exp.description}</span>
                  </div>
                  <span className={`text-sm font-medium ${exp.direction === 'positive' ? 'text-accent' : 'text-destructive'}`}>
                    {exp.direction === 'positive' ? '+' : '-'}{exp.impact}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Proof Section */}
      {inferenceResult && !proofResult && (
        <div className="py-12 text-center border border-border rounded-lg">
          <p className="text-muted-foreground mb-6">Create a cryptographic proof that verifies your score</p>
          <Button size="lg" onClick={handleGenerateProof} disabled={isProving} className="gap-2">
            {isProving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating proof...
              </>
            ) : (
              'Generate ZK Proof'
            )}
          </Button>
        </div>
      )}

      {proofResult && (
        <div className="p-6 border border-accent/30 rounded-lg">
          <h4 className="text-sm font-medium mb-3">Proof Hash</h4>
          <code className="text-xs text-muted-foreground break-all block">
            {proofResult.proofHash}
          </code>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button size="lg" onClick={onNext} disabled={!proofResult} className="gap-2">
          Submit to Mantle
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
