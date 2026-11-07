/**
 * Holding page for a teacher whose account is not approved yet.
 *
 * A PAGE — AuthLayoutRoute supplies the chrome. Asks the server for the
 * current status instead of trusting the copy in localStorage, so an approval
 * shows up as soon as "Check again" is pressed (or the page is reopened).
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@bloomneo/uikit';
import { Clock, Loader2, RefreshCw, LogOut, XCircle } from 'lucide-react';
import { useAuth } from '../hooks';
import { homeFor } from '../lib/home';
import { config } from '../config';
import { api } from '@/shared/api';
import { SEO } from '@/shared/SEO';

type Me = { appRole: string | null; appStatus: string; isActive: boolean };

export default function PendingPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = React.useState(false);
  const [status, setStatus] = React.useState<string>(user?.appStatus ?? 'pending');

  const check = React.useCallback(async () => {
    if (!user) return;
    setChecking(true);
    try {
      const me = await api.get<Me>('/api/people/me');
      setStatus(me.appStatus);
      if (me.appStatus !== user.appStatus) {
        const next = { ...user, appStatus: me.appStatus, appRole: me.appRole };
        localStorage.setItem(config.auth.storage.user, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('userUpdated', { detail: { user: next } }));
        if (me.appStatus === 'active') navigate(homeFor(next), { replace: true });
      }
    } catch {
      /* leave the current message; the button stays available */
    } finally {
      setChecking(false);
    }
  }, [user, navigate]);

  React.useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { navigate('/auth/login', { replace: true }); return; }
    if (user?.appStatus === 'active' || user?.appRole !== 'teacher') { navigate(homeFor(user), { replace: true }); return; }
    void check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated]);

  const rejected = status === 'rejected';

  return (
    <>
      <SEO title="Waiting for approval" description="Your teacher account is waiting for approval" />
      <div className="text-center">
        <span className={`mx-auto mb-5 grid size-14 place-items-center rounded-full ${rejected ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-primary'}`}>
          {rejected ? <XCircle className="size-7" /> : <Clock className="size-7" />}
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">
          {rejected ? 'Request not approved' : 'Waiting for approval'}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          {rejected
            ? 'Your teacher account request was not approved. Contact the administrator if you think this is a mistake.'
            : 'Thanks for signing up. An administrator needs to approve your teacher account before you can create papers. You can close this page and come back later.'}
        </p>
        {user?.email && <p className="mt-3 text-sm font-medium">{user.email}</p>}

        <div className="mt-6 flex justify-center gap-2">
          {!rejected && (
            <Button onClick={check} disabled={checking}>
              {checking ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Check again
            </Button>
          )}
          <Button variant="outline" onClick={() => logout()}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </div>
    </>
  );
}
