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
import { AlertTriangle, ArrowRight, Loader2, Check, GraduationCap, HeartHandshake, Clock } from 'lucide-react';
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

type SignUpAs = 'parent' | 'teacher';

const ROLES: { value: SignUpAs; label: string; hint: string; icon: typeof GraduationCap }[] = [
  { value: 'parent', label: 'Parent', hint: 'Upload answers, see marks', icon: HeartHandshake },
  { value: 'teacher', label: 'Teacher', hint: 'Make and assign papers', icon: GraduationCap },
];

const STRENGTH_LABEL = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = React.useState({ name: '', email: '', password: '' });
  const [appRole, setAppRole] = React.useState<SignUpAs>('parent');
  const [done, setDone] = React.useState<SignUpAs | null>(null);
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
      const result = await register({ ...form, appRole });
      if (result.success) setDone(appRole);
      else setError(result.error ?? 'Could not create your account.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the server.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <>
        <SEO title="Account created" description="Your account has been created" />
        <div className="text-center">
          <span className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-secondary text-primary">
            {done === 'teacher' ? <Clock className="size-7" /> : <Check className="size-7" />}
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">
            {done === 'teacher' ? 'Sent for approval' : 'Account created'}
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {done === 'teacher'
              ? 'An administrator needs to approve your teacher account. You can sign in any time to check.'
              : 'You can sign in now. Ask your child’s teacher for the invite code to link them.'}
          </p>
          <Button asChild className="mt-6">
            <Link to="/auth/login">Sign in <ArrowRight className="size-4" /></Link>
          </Button>
        </div>
      </>
    );
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
        <fieldset>
          <legend className="mb-2 text-sm font-medium">I am a</legend>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="I am a">
            {ROLES.map(({ value, label, hint, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={appRole === value}
                onClick={() => setAppRole(value)}
                className={`flex cursor-pointer flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${appRole === value ? 'border-primary bg-secondary' : 'border-border hover:bg-accent'}`}
              >
                <Icon className={`size-5 ${appRole === value ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-xs text-muted-foreground">{hint}</span>
              </button>
            ))}
          </div>
          {appRole === 'teacher' && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
              <Clock className="mt-0.5 size-3.5 shrink-0" /> Teacher accounts are approved by an administrator before they can be used.
            </p>
          )}
        </fieldset>

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
        <Link to="/auth/login" className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
