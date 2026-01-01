import { render, screen, fireEvent } from '@testing-library/react';
import { Step1Inputs } from '@/components/wizard/Step1Inputs';
import { DEFAULT_FEATURES, BorrowerFeatures } from '@/lib/mock-inference';

// Mock TooltipProvider
jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('Step1Inputs', () => {
  const mockSetFeatures = jest.fn();
  const mockOnNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all input groups', () => {
    render(
      <Step1Inputs
        features={DEFAULT_FEATURES}
        setFeatures={mockSetFeatures}
        onNext={mockOnNext}
      />
    );
    
    expect(screen.getByText('Loan Details')).toBeInTheDocument();
    expect(screen.getByText('Income & Employment')).toBeInTheDocument();
    expect(screen.getByText('Credit Profile')).toBeInTheDocument();
  });

  it('shows privacy badge', () => {
    render(
      <Step1Inputs
        features={DEFAULT_FEATURES}
        setFeatures={mockSetFeatures}
        onNext={mockOnNext}
      />
    );
    
    expect(screen.getByText(/Data never leaves your browser/)).toBeInTheDocument();
  });

  it('renders loan amount slider', () => {
    render(
      <Step1Inputs
        features={DEFAULT_FEATURES}
        setFeatures={mockSetFeatures}
        onNext={mockOnNext}
      />
    );
    
    expect(screen.getByText('Loan Amount')).toBeInTheDocument();
    expect(screen.getByText('$15,000')).toBeInTheDocument();
  });

  it('calls onNext when compute score button clicked', () => {
    render(
      <Step1Inputs
        features={DEFAULT_FEATURES}
        setFeatures={mockSetFeatures}
        onNext={mockOnNext}
      />
    );
    
    fireEvent.click(screen.getByText('Compute Score'));
    
    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });

  it('renders term dropdown with options', () => {
    render(
      <Step1Inputs
        features={DEFAULT_FEATURES}
        setFeatures={mockSetFeatures}
        onNext={mockOnNext}
      />
    );
    
    expect(screen.getByText('Loan Term')).toBeInTheDocument();
  });
});
