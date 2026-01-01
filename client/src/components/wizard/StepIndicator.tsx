import { Check } from 'lucide-react';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                i < currentStep
                  ? 'bg-primary text-primary-foreground'
                  : i === currentStep
                  ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i < currentStep ? <Check className="h-5 w-5" /> : i + 1}
            </div>
            <span className={`mt-2 text-xs font-medium ${i <= currentStep ? 'text-foreground' : 'text-muted-foreground'}`}>
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 ${i < currentStep ? 'bg-primary' : 'bg-muted'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
