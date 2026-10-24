/**
 * Create an account.
 *
 * A PAGE — AuthLayoutRoute supplies the chrome. See login.tsx for why.
 */
import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button, Input, FormField, Alert, AlertTitle, AlertDescription,
} from '@bloomneo/uikit';
import { AlertTriangle, ArrowRight, Loader2, Check } from 'lucide-react';
import { useAuth } from '../hooks';
import { SEO } from '@/shared/SEO';

/** Cheap, honest strength signal. Not a security control — a hint. */
function strength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (/\d/.test(pw) && /[A-Za-z]/.test(pw)) score++;
  return Math.min(score, 4);
}

const STRENGTH_LABEL = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = React.useState({ name: '', email: '', password: '' });
  const [touched, setTouched] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const score = strength(form.password);
  const nameError = touched && form.name.trim().length < 2 ? 'Please enter your name' : undefined;
  const emailError = touched && !/^[^@]+@[^@]+\.[^@]+$/.test(form.email) ? 'Enter a valid email address' : undefined;
  const pwError = touched && form.password.length < 8 ? 'At least 8 characters' : undefined;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (submitting || nameError || emailError || pwError) return;
    if (!form.name || !form.email || !form.password) return;

    setError(null);
    setSubmitting(true);
    try {
      const result = await register(form);
      if (!result.success) setError(result.error ?? 'Could not create your account.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the server.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <SEO title="Create account" description="Create your account to get started" />

      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Free to start. No card required.</p>
      </div>

      {error && (
        <Alert className="mb-5 border-destructive/40 bg-destructive/8">
          <AlertTriangle className="size-4 text-destructive" />
          <AlertTitle>Could not sign you up</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField label="Full name" required error={nameError}>
          <Input
            autoComplete="name"
            placeholder="Jordan Ellis"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </FormField>

        <FormField label="Email" required error={emailError}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </FormField>

        <FormField label="Password" required error={pwError} helper="At least 8 characters.">
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </FormField>

        {form.password && (
          <div aria-live="polite">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i < score ? (score <= 1 ? 'bg-destructive' : score === 2 ? 'bg-warning' : 'bg-success') : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{STRENGTH_LABEL[score]}</p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Creating account…
            </>
          ) : (
            <>
              Create account <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <ul className="mt-6 space-y-1.5">
        {['No credit card', 'Cancel any time', 'Your data stays yours'].map((t) => (
          <li key={t} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="size-3.5 text-success" /> {t}
          </li>
        ))}
      </ul>

      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
