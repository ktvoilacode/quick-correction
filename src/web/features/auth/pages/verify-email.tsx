/**
 * Confirm an email address from a token. AuthLayoutRoute supplies the chrome.
 */
import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Alert, AlertTitle, AlertDescription } from '@bloomneo/uikit';
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks';
import { SEO } from '@/shared/SEO';

type State = 'verifying' | 'ok' | 'failed';

export default function VerifyEmailPage() {
  const { verifyEmail } = useAuth();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = React.useState<State>(token ? 'verifying' : 'failed');
  const [message, setMessage] = React.useState<string>('');

  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await verifyEmail({ token });
        if (cancelled) return;
        setState(result.success ? 'ok' : 'failed');
        if (!result.success) setMessage(result.error ?? 'That link is invalid or has expired.');
      } catch (err) {
        if (cancelled) return;
        setState('failed');
        setMessage(err instanceof Error ? err.message : 'Could not reach the server.');
      }
    })();
    // Verification is a one-shot side effect; a late response after unmount
    // must not set state on a gone component.
    return () => { cancelled = true; };
  }, [token, verifyEmail]);

  return (
    <>
      <SEO title="Verify email" />
      {state === 'verifying' && (
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> Verifying your email…
        </div>
      )}

      {state === 'ok' && (
        <>
          <Alert className="border-success/40 bg-success/8">
            <CheckCircle2 className="size-4 text-success" />
            <AlertTitle>Email verified</AlertTitle>
            <AlertDescription>Your address is confirmed. You can sign in now.</AlertDescription>
          </Alert>
          <Button asChild className="mt-6 w-full">
            <Link to="/login">Continue to sign in <ArrowRight className="size-4" /></Link>
          </Button>
        </>
      )}

      {state === 'failed' && (
        <>
          <Alert className="border-destructive/40 bg-destructive/8">
            <AlertTriangle className="size-4 text-destructive" />
            <AlertTitle>Could not verify</AlertTitle>
            <AlertDescription>{message || 'This link is invalid or has expired.'}</AlertDescription>
          </Alert>
          <Button variant="outline" asChild className="mt-6 w-full">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </>
      )}
    </>
  );
}
