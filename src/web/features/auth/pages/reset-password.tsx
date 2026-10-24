/**
 * Set a new password from a emailed token. AuthLayoutRoute supplies the chrome.
 */
import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input, FormField, Alert, AlertTitle, AlertDescription, toast } from '@bloomneo/uikit';
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks';
import { SEO } from '@/shared/SEO';

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [form, setForm] = React.useState({ password: '', confirm: '' });
  const [touched, setTouched] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const pwError = touched && form.password.length < 8 ? 'At least 8 characters' : undefined;
  const confirmError = touched && form.confirm !== form.password ? 'Passwords do not match' : undefined;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (submitting || pwError || confirmError || !form.password) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await resetPassword({ token, password: form.password });
      if (result.success) {
        toast.success('Password updated. Please sign in.');
        navigate('/login', { replace: true });
      } else {
        setError(result.error ?? 'That link is invalid or has expired.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the server.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <>
        <SEO title="Reset password" />
        <Alert className="border-destructive/40 bg-destructive/8">
          <AlertTriangle className="size-4 text-destructive" />
          <AlertTitle>This link is incomplete</AlertTitle>
          <AlertDescription>Request a new reset link and try again.</AlertDescription>
        </Alert>
        <Button variant="ghost" asChild className="mt-6">
          <Link to="/forgot-password"><ArrowLeft className="size-4" /> Request a new link</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <SEO title="Choose a new password" />
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">You'll sign in with this from now on.</p>
      </div>
      {error && (
        <Alert className="mb-5 border-destructive/40 bg-destructive/8">
          <AlertTriangle className="size-4 text-destructive" />
          <AlertTitle>Could not reset</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField label="New password" required error={pwError} helper="At least 8 characters.">
          <Input type="password" autoComplete="new-password" placeholder="••••••••"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </FormField>
        <FormField label="Confirm password" required error={confirmError}>
          <Input type="password" autoComplete="new-password" placeholder="••••••••"
            value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        </FormField>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <><Loader2 className="size-4 animate-spin" /> Updating…</> : 'Update password'}
        </Button>
      </form>
    </>
  );
}
