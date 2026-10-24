/**
 * Sign in.
 *
 * A PAGE — it owns the form and nothing else. AuthLayoutRoute supplies the
 * split panel, the logo and the back link, because `shared/layouts.tsx` maps
 * `/login` to that shell.
 *
 * The pre-4.0 version of this file wrapped itself in `<AuthLayout scheme="hero"
 * imageUrl="https://images.pexels.com/…">` — chrome, layout and a stock photo
 * from a CDN, all decided by a component. That is the arrangement UIKit 4.0
 * removed: the shell is the app's, and it is 90 readable lines you can change.
 */
import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button, Input, FormField, Alert, AlertTitle, AlertDescription, Checkbox, Label,
} from '@bloomneo/uikit';
import { AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks';
import { SEO } from '@/shared/SEO';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [form, setForm] = React.useState({ email: '', password: '', rememberMe: false });
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // `?next=` lets a guard send someone here and return them afterwards.
  const next = params.get('next') || '/';

  React.useEffect(() => {
    if (isAuthenticated) navigate(next, { replace: true });
  }, [isAuthenticated, navigate, next]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await login({
        email: form.email,
        password: form.password,
        rememberMe: form.rememberMe,
      });
      // Deliberately vague: saying which of the two was wrong tells an attacker
      // whether an account exists.
      if (!result.success) setError(result.error ?? 'That email and password do not match.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the server.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <SEO title="Sign in" description="Access your account to continue" />

      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Sign in to continue.</p>
      </div>

      {error && (
        <Alert className="mb-5 border-destructive/40 bg-destructive/8">
          <AlertTriangle className="size-4 text-destructive" />
          <AlertTitle>Sign in failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField label="Email" required>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </FormField>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">
              Password <span className="text-destructive">*</span>
            </Label>
            <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">
              Forgot?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={form.rememberMe}
            onCheckedChange={(checked) => setForm({ ...form, rememberMe: checked === true })}
          />
          <Label htmlFor="remember" className="font-normal text-muted-foreground">
            Keep me signed in
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Signing in…
            </>
          ) : (
            <>
              Sign in <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        No account?{' '}
        <Link to="/register" className="font-medium text-foreground hover:underline">
          Create one
        </Link>
      </p>
    </>
  );
}
