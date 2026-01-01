import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Step2Compute } from '@/components/wizard/Step2Compute';
import { DEFAULT_FEATURES } from '@/lib/mock-inference';

describe('Step2Compute', () => {
  const mockSetInferenceResult = jest.fn();
  const mockSetProofResult = jest.fn();
  const mockOnNext = jest.fn();
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders run inference button initially', () => {
    render(
      <Step2Compute
        features={DEFAULT_FEATURES}
        inferenceResult={null}
        setInferenceResult={mockSetInferenceResult}
        proofResult={null}
        setProofResult={mockSetProofResult}
        onNext={mockOnNext}
        onBack={mockOnBack}
      />
    );
    
    expect(screen.getByText('Run Inference')).toBeInTheDocument();
  });

  it('shows loading state when running inference', async () => {
    render(
      <Step2Compute
        features={DEFAULT_FEATURES}
        inferenceResult={null}
        setInferenceResult={mockSetInferenceResult}
        proofResult={null}
        setProofResult={mockSetProofResult}
        onNext={mockOnNext}
        onBack={mockOnBack}
      />
    );
    
    fireEvent.click(screen.getByText('Run Inference'));
    
    expect(screen.getByText('Running local inference...')).toBeInTheDocument();
  });

  it('displays score after inference completes', async () => {
    const mockResult = {
      score: 720,
      explanations: [
        { feature: 'dti', impact: -50, direction: 'negative' as const, description: 'High DTI: -50 points' },
      ],
      confidence: 0.95,
    };

    render(
      <Step2Compute
        features={DEFAULT_FEATURES}
        inferenceResult={mockResult}
        setInferenceResult={mockSetInferenceResult}
        proofResult={null}
        setProofResult={mockSetProofResult}
        onNext={mockOnNext}
        onBack={mockOnBack}
      />
    );
    
    expect(screen.getByText('720')).toBeInTheDocument();
  });

  it('shows generate proof button after inference', () => {
    const mockResult = {
      score: 720,
      explanations: [
        { feature: 'dti', impact: -50, direction: 'negative' as const, description: 'High DTI: -50 points' },
      ],
      confidence: 0.95,
    };

    render(
      <Step2Compute
        features={DEFAULT_FEATURES}
        inferenceResult={mockResult}
        setInferenceResult={mockSetInferenceResult}
        proofResult={null}
        setProofResult={mockSetProofResult}
        onNext={mockOnNext}
        onBack={mockOnBack}
      />
    );
    
    expect(screen.getByText('Generate ZK Proof')).toBeInTheDocument();
  });

  it('renders back button', () => {
    render(
      <Step2Compute
        features={DEFAULT_FEATURES}
        inferenceResult={null}
        setInferenceResult={mockSetInferenceResult}
        proofResult={null}
        setProofResult={mockSetProofResult}
        onNext={mockOnNext}
        onBack={mockOnBack}
      />
    );
    
    expect(screen.getByText('Back')).toBeInTheDocument();
  });
});
