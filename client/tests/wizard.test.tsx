import { render, screen } from '@testing-library/react';
import { StepIndicator } from '@/components/wizard/StepIndicator';

describe('StepIndicator', () => {
  const steps = ['Private Inputs', 'Compute & Prove', 'Submit', 'Success'];

  it('renders all steps', () => {
    render(<StepIndicator steps={steps} currentStep={0} />);
    
    steps.forEach((step) => {
      expect(screen.getByText(step)).toBeInTheDocument();
    });
  });

  it('highlights current step', () => {
    render(<StepIndicator steps={steps} currentStep={1} />);
    
    const computeStep = screen.getByText('Compute & Prove');
    expect(computeStep).toHaveClass('text-primary');
  });

  it('marks completed steps with checkmark', () => {
    render(<StepIndicator steps={steps} currentStep={2} />);
    
    // First two steps should be completed
    const checkmarks = document.querySelectorAll('.bg-primary');
    expect(checkmarks.length).toBeGreaterThanOrEqual(2);
  });

  it('shows step numbers for incomplete steps', () => {
    render(<StepIndicator steps={steps} currentStep={0} />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
