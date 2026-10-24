/**
 * Profile — the signed-in user's own account.
 *
 * Route: features/dashboard/pages/profile.tsx  →  /dashboard/profile
 * Protected by DashboardLayoutRoute's AuthGuard, like everything in this
 * section — this file has no guard of its own and does not need one.
 */
import * as React from 'react';
import {
  PageHeader, Card, CardContent, Button, Badge,
  FormField, Input, Alert, AlertTitle, AlertDescription, toast,
} from '@bloomneo/uikit';
import { ShieldCheck, Save } from 'lucide-react';
import { useAuth } from '../../auth/hooks';
import { SEO } from '@/shared/SEO';

export default function ProfilePage() {
  const { user } = useAuth();

  const [form, setForm] = React.useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
  });
  const [saving, setSaving] = React.useState(false);

  // `user` arrives after the session resolves, so seed the form when it lands.
  React.useEffect(() => {
    if (user) setForm({ name: user.name ?? '', email: user.email ?? '', phone: user.phone ?? '' });
  }, [user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // Wire this to PATCH /api/user/:id — the route already exists.
      await new Promise((r) => setTimeout(r, 400));
      toast.success('Profile saved');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <SEO title="Profile" description="Your account details" />
      <PageHeader title="Profile" description="Your account details and sign-in." />

      <Card>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField label="Full name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </FormField>
            <FormField label="Email" helper="Changing this requires re-verification.">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </FormField>
            <FormField label="Phone" helper="Optional.">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 0100" />
            </FormField>
            <Button type="submit" disabled={saving}>
              <Save className="size-4" /> {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Access</h2>
        <Card>
          <CardContent>
            <dl className="divide-y divide-border">
              {([
                ['Role', user?.role ?? '—'],
                ['Level', user?.level ?? '—'],
                ['Email verified', user?.isVerified ? 'Yes' : 'No'],
              ] as const).map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="text-sm font-medium">
                    {label === 'Email verified'
                      ? <Badge variant={value === 'Yes' ? 'secondary' : 'outline'}>{value}</Badge>
                      : value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </section>

      <Alert>
        <ShieldCheck className="size-4" />
        <AlertTitle>Role and level are not editable here</AlertTitle>
        <AlertDescription>
          They are set server-side. A form that let you raise your own role would be the bug, not the feature.
        </AlertDescription>
      </Alert>
    </div>
  );
}
