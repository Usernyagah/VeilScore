import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Navigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { NetworkBanner } from '@/components/layout/NetworkBanner';
import { StepIndicator } from '@/components/wizard/StepIndicator';
import { Step1Inputs } from '@/components/wizard/Step1Inputs';
import { Step2Compute } from '@/components/wizard/Step2Compute';
import { Step3Submit } from '@/components/wizard/Step3Submit';
import { Step4Success } from '@/components/wizard/Step4Success';
import { BorrowerFeatures, DEFAULT_FEATURES, InferenceResult, ProofResult } from '@/lib/mock-inference';

const STEPS = ['Private Inputs', 'Compute & Prove', 'Submit', 'Success'];

export default function Dashboard() {
  const { isConnected } = useAccount();
  const [currentStep, setCurrentStep] = useState(0);
  const [features, setFeatures] = useState<BorrowerFeatures>(DEFAULT_FEATURES);
  const [inferenceResult, setInferenceResult] = useState<InferenceResult | null>(null);
  const [proofResult, setProofResult] = useState<ProofResult | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  if (!isConnected) {
    return <Navigate to="/" replace />;
  }

  const handleNext = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  const handleBack = () => setCurrentStep((s) => Math.max(s - 1, 0));
  const handleReset = () => {
    setCurrentStep(0);
    setFeatures(DEFAULT_FEATURES);
    setInferenceResult(null);
    setProofResult(null);
    setTxHash(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <NetworkBanner />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <StepIndicator steps={STEPS} currentStep={currentStep} />

          <div className="mt-8">
            {currentStep === 0 && (
              <Step1Inputs features={features} setFeatures={setFeatures} onNext={handleNext} />
            )}
            {currentStep === 1 && (
              <Step2Compute
                features={features}
                inferenceResult={inferenceResult}
                setInferenceResult={setInferenceResult}
                proofResult={proofResult}
                setProofResult={setProofResult}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {currentStep === 2 && (
              <Step3Submit
                inferenceResult={inferenceResult!}
                proofResult={proofResult!}
                setTxHash={setTxHash}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {currentStep === 3 && (
              <Step4Success
                inferenceResult={inferenceResult!}
                txHash={txHash!}
                onReset={handleReset}
              />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
