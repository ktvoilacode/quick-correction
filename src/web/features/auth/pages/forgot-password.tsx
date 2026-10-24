/**
 * Request a password reset. AuthLayoutRoute supplies the chrome.
 *
 * Always reports success, whether or not the address exists — otherwise this
 * form is an account-enumeration oracle.
 */
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, FormField, Alert, AlertTitle, AlertDescription } from '@bloomneo/uikit';
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react';
import { useAuth } from '../hooks';
import { SEO } from '@/shared/SEO';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = React.useState('');
  const [touched, setTouched] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const emailError = touched && !/^[^@]+@[^@]+\.[^@]+$/.test(email) ? 'Enter a valid email address' : undefined;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (submitting || emailError || !email) return;
    setSubmitting(true);
    try {
      await forgotPassword({ email });
    } finally {
      // Success regardless — see the note above.
      setSent(true);
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <>
        <SEO title="Check your email" />
        <Alert className="border-success/40 bg-success/8">
          <MailCheck className="size-4 text-success" />
          <AlertTitle>Check your email</AlertTitle>
          <AlertDescription>
            If an account exists for {email}, a reset link is on its way. It expires in one hour.
          </AlertDescription>
        </Alert>
        <Button variant="ghost" asChild className="mt-6">
          <Link to="/login"><ArrowLeft className="size-4" /> Back to sign in</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <SEO title="Reset password" description="Reset your account password" />
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter your email and we'll send you a link.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField label="Email" required error={emailError}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <><Loader2 className="size-4 animate-spin" /> Sending…</> : 'Send reset link'}
        </Button>
      </form>
      <Button variant="ghost" asChild className="mt-6">
        <Link to="/login"><ArrowLeft className="size-4" /> Back to sign in</Link>
      </Button>
    </>
  );
}
