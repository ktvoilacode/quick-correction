/**
 * Mock checkout shown before a paper is sent for correction.
 *
 * Stands in for Razorpay Checkout. In the real app the order is created
 * server-side with a Route `transfers` split (teacher's linked account gets
 * the fee minus MedhaMark's platform fee), and this sheet is Razorpay's own.
 * Nothing here moves money.
 */
import * as React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Button, RadioGroup, RadioGroupItem,
} from '@bloomneo/uikit';
import { Smartphone, CreditCard, Landmark, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { rupees, TEACHER } from '../data/store';

const METHODS = [
  { id: 'upi', label: 'UPI', hint: 'GPay, PhonePe, Paytm', icon: Smartphone },
  { id: 'card', label: 'Card', hint: 'Debit or credit', icon: CreditCard },
  { id: 'nb', label: 'Netbanking', hint: 'All major banks', icon: Landmark },
];

export function PayDialog({
  open, onOpenChange, amount, paperTitle, childName, onPaid,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  amount: number;
  paperTitle: string;
  childName: string;
  onPaid: () => void;
}) {
  const [method, setMethod] = React.useState('upi');
  const [stage, setStage] = React.useState<'choose' | 'paying' | 'done'>('choose');

  React.useEffect(() => { if (open) setStage('choose'); }, [open]);

  const pay = () => {
    setStage('paying');
    window.setTimeout(() => setStage('done'), 1200);
    window.setTimeout(() => { onOpenChange(false); onPaid(); }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => stage === 'choose' && onOpenChange(v)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Pay for correction</DialogTitle>
          <DialogDescription>{paperTitle} · {childName}</DialogDescription>
        </DialogHeader>

        {stage === 'done' ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle2 className="size-12 text-success" />
            <p className="font-semibold">Paid {rupees(amount)}</p>
            <p className="text-sm text-muted-foreground">Sending the answer sheets for marking…</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-end justify-between rounded-xl bg-muted p-4">
              <div>
                <p className="text-sm text-muted-foreground">Correction fee</p>
                <p className="text-xs text-muted-foreground">Paid to {TEACHER.name} via MedhaMark</p>
              </div>
              <p className="text-3xl font-semibold tracking-tight">{rupees(amount)}</p>
            </div>

            <RadioGroup value={method} onValueChange={setMethod} className="space-y-2">
              {METHODS.map(({ id, label, hint, icon: Icon }) => (
                <label key={id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 has-[[data-state=checked]]:border-primary">
                  <RadioGroupItem value={id} />
                  <Icon className="size-4 text-muted-foreground" />
                  <span className="flex-1 text-sm font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">{hint}</span>
                </label>
              ))}
            </RadioGroup>

            <Button size="lg" className="w-full" onClick={pay} disabled={stage === 'paying'}>
              {stage === 'paying' ? <><Loader2 className="size-4 animate-spin" /> Processing…</> : `Pay ${rupees(amount)}`}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" /> Secured by Razorpay · demo, no real payment
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
