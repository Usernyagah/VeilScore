/**
 * End-to-end integration tests
 * Tests the full flow from UI interaction to API response
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Step2Compute } from '@/components/wizard/Step2Compute';
import { BorrowerFeatures } from '@/lib/mock-inference';
import { isApiAvailable } from '@/lib/api-client';

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe('End-to-End Integration Tests', () => {
  let apiAvailable: boolean = false;

  beforeAll(async () => {
    try {
      apiAvailable = await isApiAvailable();
    } catch {
      apiAvailable = false;
    }
  }, 10000);

  const sampleFeatures: BorrowerFeatures = {
    loan_amnt: 15000,
    term: 36,
    purpose: 'debt_consolidation',
    annual_inc: 75000,
    verification_status: 'Source Verified',
    emp_length: 5,
    home_ownership: 'RENT',
    dti: 18,
    inq_last_6mths: 1,
    open_acc: 8,
    revol_bal: 12000,
    revol_util: 35,
    delinq_2yrs: 0,
    pub_rec: 0,
    total_acc: 15,
  };

  it('should render Step2Compute component', () => {
    const mockSetInference = jest.fn();
    const mockSetProof = jest.fn();
    const mockOnNext = jest.fn();
    const mockOnBack = jest.fn();

    render(
      <Step2Compute
        features={sampleFeatures}
        inferenceResult={null}
        setInferenceResult={mockSetInference}
        proofResult={null}
        setProofResult={mockSetProof}
        onNext={mockOnNext}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText(/Compute & Prove/i)).toBeInTheDocument();
    expect(screen.getByText(/Run Inference/i)).toBeInTheDocument();
  });

  it('should handle inference computation flow', async () => {
    if (!apiAvailable) {
      console.log('Skipping E2E test - API not available');
      return;
    }

    const mockSetInference = jest.fn();
    const mockSetProof = jest.fn();
    const mockOnNext = jest.fn();
    const mockOnBack = jest.fn();

    render(
      <Step2Compute
        features={sampleFeatures}
        inferenceResult={null}
        setInferenceResult={mockSetInference}
        proofResult={null}
        setProofResult={mockSetProof}
        onNext={mockOnNext}
        onBack={mockOnBack}
      />
    );

    const runButton = screen.getByText(/Run Inference/i);
    expect(runButton).toBeInTheDocument();

    // Click the run inference button
    await userEvent.click(runButton);

    // Wait for inference to complete
    await waitFor(
      () => {
        expect(mockSetInference).toHaveBeenCalled();
      },
      { timeout: 35000 }
    );

    // Verify inference result was set
    const inferenceCall = mockSetInference.mock.calls[0][0];
    expect(inferenceCall).toBeDefined();
    expect(inferenceCall.score).toBeGreaterThanOrEqual(300);
    expect(inferenceCall.score).toBeLessThanOrEqual(850);
    expect(inferenceCall.explanations).toBeDefined();
  }, 40000);

  it('should handle proof generation flow', async () => {
    if (!apiAvailable) {
      console.log('Skipping E2E test - API not available');
      return;
    }

    const mockInferenceResult = {
      score: 720,
      explanations: [
        {
          feature: 'dti',
          impact: 0.0234,
          direction: 'positive' as const,
          description: 'Low DTI improves score',
        },
        {
          feature: 'annual_inc',
          impact: 0.0189,
          direction: 'positive' as const,
          description: 'High income improves score',
        },
        {
          feature: 'revol_util',
          impact: 0.0123,
          direction: 'negative' as const,
          description: 'High utilization decreases score',
        },
      ],
      confidence: 0.92,
    };

    const mockSetInference = jest.fn();
    const mockSetProof = jest.fn();
    const mockOnNext = jest.fn();
    const mockOnBack = jest.fn();

    render(
      <Step2Compute
        features={sampleFeatures}
        inferenceResult={mockInferenceResult}
        setInferenceResult={mockSetInference}
        proofResult={null}
        setProofResult={mockSetProof}
        onNext={mockOnNext}
        onBack={mockOnBack}
      />
    );

    // Should show inference result
    expect(screen.getByText('720')).toBeInTheDocument();

    // Find and click proof generation button
    const proofButton = screen.getByText(/Generate ZK Proof/i);
    expect(proofButton).toBeInTheDocument();

    await userEvent.click(proofButton);

    // Wait for proof generation
    await waitFor(
      () => {
        expect(mockSetProof).toHaveBeenCalled();
      },
      { timeout: 35000 }
    );

    // Verify proof was generated
    const proofCall = mockSetProof.mock.calls[0][0];
    expect(proofCall).toBeDefined();
    expect(proofCall.proofHash).toBeDefined();
  }, 40000);
});

