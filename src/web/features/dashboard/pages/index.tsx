/**
 * /dashboard — the landing page behind sign-in.
 *
 * A starting point, not a demo. It shows the person their own account and the
 * things they can actually do with it; the previous version explained what the
 * auth layer had given the DEVELOPER, which is documentation wearing a page's
 * clothes. Replace the quick actions with your product's and this is a real
 * home screen.
 *
 * Everything here reads from the auth context — no fetch, so it paints
 * immediately and cannot fail.
 */
import { Link } from 'react-router-dom';
import {
  Card, CardContent, Badge, Button,
} from '@bloomneo/uikit';
import {
  User, ShieldCheck, KeyRound, Mail, ArrowRight, CircleAlert,
} from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { useAuth } from '@/features/auth/hooks';

/** Replace these with the things people actually come here to do. */
const ACTIONS = [
  { to: '/dashboard/profile', label: 'Edit your profile', hint: 'Name, email and phone', icon: User },
  { to: '/dashboard/profile', label: 'Change password', hint: 'Requires your current one', icon: KeyRound },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardHome() {
  const { user } = useAuth();
  const firstName = (user?.name ?? '').trim().split(' ')[0] || 'there';

  return (
    <>
      <SEO title="Dashboard" description="Your account overview" />

      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting()}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here is your account at a glance.
        </p>
      </div>

      {/* Unverified is the one piece of account state worth interrupting for —
          it usually means email delivery is not set up yet. */}
      {user && !user.isVerified && (
        <Card className="mb-6 border-warning/40 bg-warning/8">
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <CircleAlert className="size-4 shrink-0 text-warning" />
            <span className="flex-1 text-sm">
              Your email address has not been verified yet.
            </span>
            <Button size="sm" variant="outline" asChild>
              <Link to="/auth/verify-email">Verify now</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* ── quick actions ─────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Quick actions</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {ACTIONS.map(({ to, label, hint, icon: Icon }) => (
              <li key={label}>
                <Link
                  to={to}
                  className="flex items-center gap-4 bg-card px-5 py-4 transition-colors hover:bg-accent/40"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-sm text-muted-foreground">{hint}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ── account card ──────────────────────────────────────────────── */}
        <aside>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Your account</h2>
          <Card>
            <CardContent className="space-y-4 py-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                  {(user?.name ?? user?.email ?? 'U').slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{user?.name ?? 'Signed in'}</span>
                  <span className="block truncate text-sm text-muted-foreground">{user?.email}</span>
                </span>
              </div>

              <dl className="space-y-2.5 border-t border-border pt-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Role</dt>
                  <dd><Badge variant="secondary">{user?.role}.{user?.level}</Badge></dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="flex items-center gap-1.5">
                    {user?.isVerified
                      ? <><ShieldCheck className="size-3.5 text-success" /> Verified</>
                      : <><Mail className="size-3.5 text-muted-foreground" /> Unverified</>}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
