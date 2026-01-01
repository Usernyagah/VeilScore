import { Lock, HelpCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BorrowerFeatures, LOAN_PURPOSES, FEATURE_DESCRIPTIONS } from '@/lib/mock-inference';

interface Step1InputsProps {
  features: BorrowerFeatures;
  setFeatures: (f: BorrowerFeatures) => void;
  onNext: () => void;
}

function FieldTooltip({ field }: { field: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-sm">{FEATURE_DESCRIPTIONS[field]}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function Step1Inputs({ features, setFeatures, onNext }: Step1InputsProps) {
  const update = <K extends keyof BorrowerFeatures>(key: K, value: BorrowerFeatures[K]) => {
    setFeatures({ ...features, [key]: value });
  };

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-headline font-semibold mb-3">Enter Your Data</h2>
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          Data never leaves your browser
        </div>
      </div>

      {/* Loan Details */}
      <section className="space-y-6">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Loan Details</h3>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm">
              Loan Amount <FieldTooltip field="loan_amnt" />
            </Label>
            <Slider value={[features.loan_amnt]} onValueChange={([v]) => update('loan_amnt', v)} min={1000} max={40000} step={500} />
            <div className="text-sm text-muted-foreground">${features.loan_amnt.toLocaleString()}</div>
          </div>
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm">
              Loan Term <FieldTooltip field="term" />
            </Label>
            <Select value={String(features.term)} onValueChange={(v) => update('term', Number(v) as 36 | 60)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="36">36 months</SelectItem>
                <SelectItem value="60">60 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm">
              Purpose <FieldTooltip field="purpose" />
            </Label>
            <Select value={features.purpose} onValueChange={(v) => update('purpose', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LOAN_PURPOSES.map((p) => (
                  <SelectItem key={p} value={p} className="capitalize">{p.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Income & Employment */}
      <section className="space-y-6">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Income & Employment</h3>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm">
              Annual Income <FieldTooltip field="annual_inc" />
            </Label>
            <Input type="number" value={features.annual_inc} onChange={(e) => update('annual_inc', Number(e.target.value))} />
          </div>
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm">
              Verification Status <FieldTooltip field="verification_status" />
            </Label>
            <Select value={features.verification_status} onValueChange={(v) => update('verification_status', v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Verified">Verified</SelectItem>
                <SelectItem value="Source Verified">Source Verified</SelectItem>
                <SelectItem value="Not Verified">Not Verified</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm">
              Employment Length <FieldTooltip field="emp_length" />
            </Label>
            <Slider value={[features.emp_length]} onValueChange={([v]) => update('emp_length', v)} min={0} max={10} step={1} />
            <div className="text-sm text-muted-foreground">{features.emp_length}+ years</div>
          </div>
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm">
              Home Ownership <FieldTooltip field="home_ownership" />
            </Label>
            <Select value={features.home_ownership} onValueChange={(v) => update('home_ownership', v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="RENT">Rent</SelectItem>
                <SelectItem value="OWN">Own</SelectItem>
                <SelectItem value="MORTGAGE">Mortgage</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Credit Profile */}
      <section className="space-y-6">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Credit Profile</h3>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm">
              DTI Ratio <FieldTooltip field="dti" />
            </Label>
            <Slider value={[features.dti]} onValueChange={([v]) => update('dti', v)} min={0} max={50} step={0.5} />
            <div className="text-sm text-muted-foreground">{features.dti.toFixed(1)}%</div>
          </div>
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm">
              Revolving Utilization <FieldTooltip field="revol_util" />
            </Label>
            <Slider value={[features.revol_util]} onValueChange={([v]) => update('revol_util', v)} min={0} max={150} step={1} />
            <div className="text-sm text-muted-foreground">{features.revol_util.toFixed(0)}%</div>
          </div>
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm">
              Revolving Balance <FieldTooltip field="revol_bal" />
            </Label>
            <Input type="number" value={features.revol_bal} onChange={(e) => update('revol_bal', Number(e.target.value))} />
          </div>
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm">
              Inquiries (6mo) <FieldTooltip field="inq_last_6mths" />
            </Label>
            <Input type="number" value={features.inq_last_6mths} onChange={(e) => update('inq_last_6mths', Number(e.target.value))} min={0} max={10} />
          </div>
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm">
              Open Accounts <FieldTooltip field="open_acc" />
            </Label>
            <Input type="number" value={features.open_acc} onChange={(e) => update('open_acc', Number(e.target.value))} min={0} />
          </div>
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm">
              Total Accounts <FieldTooltip field="total_acc" />
            </Label>
            <Input type="number" value={features.total_acc} onChange={(e) => update('total_acc', Number(e.target.value))} min={0} />
          </div>
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm">
              Delinquencies (2yr) <FieldTooltip field="delinq_2yrs" />
            </Label>
            <Input type="number" value={features.delinq_2yrs} onChange={(e) => update('delinq_2yrs', Number(e.target.value))} min={0} />
          </div>
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm">
              Public Records <FieldTooltip field="pub_rec" />
            </Label>
            <Input type="number" value={features.pub_rec} onChange={(e) => update('pub_rec', Number(e.target.value))} min={0} />
          </div>
        </div>
      </section>

      {/* Action */}
      <div className="flex justify-end pt-4">
        <Button size="lg" onClick={onNext} className="gap-2">
          Compute Score
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
