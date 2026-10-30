/**
 * Users — `/admin/users`. Everyone who can sign in, in one place: teachers,
 * parents and admins.
 *
 * Approve teachers who signed up themselves, add logins, disable accounts,
 * reset passwords, and sign in as a teacher or parent to see their screens.
 * Data comes from `/api/people`.
 */
import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Button, Input, FormField, Badge, Card, CardContent,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Alert, AlertTitle, AlertDescription, toast, useConfirm,
} from '@bloomneo/uikit';
import { Plus, Search, Check, X, KeyRound, Ban, RotateCcw, Loader2, AlertTriangle, Users, Copy, LogIn } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { api } from '@/shared/api';
import { startImpersonation } from '@/features/auth/lib/impersonate';
import { useAuth } from '@/features/auth/hooks';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { PageLoading } from '../../components/PageLoading';

type Person = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  kind: 'teacher' | 'parent' | 'admin' | 'other';
  appRole: 'teacher' | 'parent' | null;
  appStatus: 'active' | 'pending' | 'rejected';
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  studentCount: number;
  childCount: number;
};

type Counts = { pending: number; teachers: number; parents: number; admins: number; all: number };
type Tab = 'pending' | 'teacher' | 'parent' | 'admin' | 'all';

const BLANK = { name: '', email: '', phone: '', appRole: 'teacher', password: '' };

function StatusBadge({ p }: { p: Person }) {
  if (!p.isActive) return <Badge variant="outline">Disabled</Badge>;
  if (p.appStatus === 'pending') return <Badge variant="secondary">Pending approval</Badge>;
  if (p.appStatus === 'rejected') return <Badge variant="outline" className="text-destructive">Rejected</Badge>;
  return (
    <span className="flex items-center gap-1.5 text-sm">
      <span aria-hidden className="size-1.5 rounded-full bg-success" /> Active
    </span>
  );
}

export default function AdminUsersPage() {
  const confirm = useConfirm();
  const { user: me } = useAuth();
  const [params] = useSearchParams();
  const [tab, setTab] = React.useState<Tab>(() => (['pending', 'teacher', 'parent', 'admin'] as Tab[]).find((t) => t === params.get('tab')) ?? 'all');
  const [q, setQ] = React.useState('');
  const [people, setPeople] = React.useState<Person[] | null>(null);
  const [counts, setCounts] = React.useState<Counts>({ pending: 0, teachers: 0, parents: 0, admins: 0, all: 0 });
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const [creating, setCreating] = React.useState(false);
  const [form, setForm] = React.useState(BLANK);
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [credentials, setCredentials] = React.useState<{ email: string; password: string; reset?: boolean } | null>(null);

  const load = React.useCallback(async () => {
    setLoadError(null);
    try {
      const query: Record<string, string> = {};
      if (tab === 'pending') { query.kind = 'teacher'; query.status = 'pending'; }
      if (tab === 'teacher' || tab === 'parent' || tab === 'admin') query.kind = tab;
      if (q.trim()) query.q = q.trim();
      const data = await api.get<{ people: Person[]; counts: Counts }>('/api/people', { query });
      setPeople(data.people);
      setCounts(data.counts);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load people.');
      setPeople((p) => p ?? []);
    }
  }, [tab, q]);

  React.useEffect(() => {
    const t = setTimeout(() => void load(), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  async function act(p: Person, what: 'approve' | 'reject' | 'enable' | 'disable') {
    setBusy(p.id);
    try {
      if (what === 'approve' || what === 'reject') await api.post(`/api/people/${p.id}/${what}`, {});
      else await api.post(`/api/people/${p.id}/active`, { isActive: what === 'enable' });
      toast.success(
        what === 'approve' ? `Approved ${p.name || p.email}` :
        what === 'reject' ? `Rejected ${p.name || p.email}` :
        what === 'enable' ? 'Account enabled' : 'Account disabled',
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That did not work.');
    } finally {
      setBusy(null);
    }
  }

  async function reject(p: Person) {
    const ok = await confirm({
      title: `Reject ${p.name || p.email}?`,
      description: 'They will see that their request was not approved. You can approve them later.',
      confirmLabel: 'Reject',
      tone: 'destructive',
    });
    if (ok) await act(p, 'reject');
  }

  async function resetPassword(p: Person) {
    const ok = await confirm({
      title: `Reset password for ${p.name || p.email}?`,
      description: 'Their current password stops working. You will be shown a temporary one to pass on.',
      confirmLabel: 'Reset password',
    });
    if (!ok) return;
    setBusy(p.id);
    try {
      const r = await api.post<{ temporaryPassword: string }>(`/api/people/${p.id}/reset-password`, {});
      setCredentials({ email: p.email, password: r.temporaryPassword, reset: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reset the password.');
    } finally {
      setBusy(null);
    }
  }

  async function signInAs(p: Person) {
    setBusy(p.id);
    try {
      const r = await api.post<{ token: string; user: Parameters<typeof startImpersonation>[1] }>(`/api/people/${p.id}/sign-in-as`, {});
      startImpersonation(r.token, r.user);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not sign in as this person.');
      setBusy(null);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setFormError(null);
    setSaving(true);
    try {
      const r = await api.post<{ person: Person; temporaryPassword: string | null }>('/api/people', {
        name: form.name, email: form.email, phone: form.phone, appRole: form.appRole,
        ...(form.password ? { password: form.password } : {}),
      });
      setCreating(false);
      if (r.temporaryPassword) setCredentials({ email: r.person.email, password: r.temporaryPassword });
      else toast.success(`Created ${r.person.email}`);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create the account.');
    } finally {
      setSaving(false);
    }
  }

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'pending', label: 'Pending approval', count: counts.pending },
    { id: 'teacher', label: 'Teachers', count: counts.teachers },
    { id: 'parent', label: 'Parents', count: counts.parents },
    { id: 'admin', label: 'Admins', count: counts.admins },
  ];

  /** Row actions: shared by the table (wide screens) and the cards (phones). */
  const renderActions = (p: Person) => (
    <>
              {busy === p.id ? (
                <Loader2 className="ml-auto size-4 animate-spin text-muted-foreground" />
              ) : (
                <>
                  {p.kind === 'teacher' && p.appStatus !== 'active' && (
                    <Button size="sm" className="mr-1 h-8" aria-label={`Approve ${p.email}`} onClick={() => act(p, 'approve')}>
                      <Check className="size-4" /> <span className="hidden xl:inline">Approve</span>
                    </Button>
                  )}
                  {p.kind === 'teacher' && p.appStatus === 'pending' && (
                    <Button size="sm" variant="outline" className="mr-1 h-8" aria-label={`Reject ${p.email}`} onClick={() => reject(p)}>
                      <X className="size-4" /> <span className="hidden xl:inline">Reject</span>
                    </Button>
                  )}
                  {p.isActive && (p.kind === 'teacher' || p.kind === 'parent') && (
                    <Button variant="ghost" size="icon" aria-label={`Sign in as ${p.email}`} title="Sign in as this person" onClick={() => signInAs(p)}>
                      <LogIn className="size-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" aria-label={`Reset password for ${p.email}`} title="Reset password" onClick={() => resetPassword(p)}>
                    <KeyRound className="size-4" />
                  </Button>
                  {p.id === me?.id ? null : p.isActive ? (
                    <Button variant="ghost" size="icon" aria-label={`Disable ${p.email}`} title="Disable account" onClick={() => act(p, 'disable')}>
                      <Ban className="size-4 text-destructive" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" aria-label={`Enable ${p.email}`} title="Enable account" onClick={() => act(p, 'enable')}>
                      <RotateCcw className="size-4" />
                    </Button>
                  )}
                </>
              )}
    </>
  );

  if (people === null) return <PageLoading />;

  return (
    <>
      <SEO title="Users" description="Teachers, parents and admins" />

      <AdminPageHeader
        title="Users"
        description="Teachers, parents and admins. Approve sign-ups and manage logins."
        actions={
          <Button onClick={() => { setForm(BLANK); setFormError(null); setCreating(true); }}>
            <Plus className="size-4" /> Add user
          </Button>
        }
      />

      {loadError && (
        <Alert className="mb-5 border-destructive/40 bg-destructive/8">
          <AlertTriangle className="size-4 text-destructive" />
          <AlertTitle>Could not load people</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {counts.pending > 0 && tab !== 'pending' && (
        <Alert className="mb-5">
          <AlertTitle>{counts.pending} teacher{counts.pending === 1 ? '' : 's'} waiting for approval</AlertTitle>
          <AlertDescription>
            <button className="font-medium text-primary hover:underline" onClick={() => setTab('pending')}>Review now</button>
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Filter" className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === t.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t.label}{t.count !== undefined && <span className="ml-1.5 text-xs text-muted-foreground">{t.count}</span>}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {/* Phones: one card per person, with the actions underneath */}
      <ul className="space-y-3 md:hidden" aria-label="People">
        {people.length === 0 && (
          <li className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {tab === 'pending' ? 'Nobody is waiting for approval.' : q ? `Nobody matches “${q}”.` : 'Nobody here yet.'}
          </li>
        )}
        {people.map((p) => (
          <li key={p.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate font-medium">{p.name || '—'}</span>
                <span className="block truncate text-sm text-muted-foreground">{p.email}</span>
              </span>
              <Badge variant={p.kind === 'parent' || p.kind === 'other' ? 'outline' : 'default'} className="shrink-0 capitalize">{p.kind === 'other' ? 'No role yet' : p.kind}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <StatusBadge p={p} />
              {(p.kind === 'teacher' || p.kind === 'parent') && (
                <span>{p.kind === 'teacher' ? `${p.studentCount} student${p.studentCount === 1 ? '' : 's'}` : `${p.childCount} child${p.childCount === 1 ? '' : 'ren'}`}</span>
              )}
              <span>Last sign-in {p.lastLogin ? new Date(p.lastLogin).toLocaleDateString() : 'never'}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-end gap-1 border-t border-border pt-3">{renderActions(p)}</div>
          </li>
        ))}
      </ul>

      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Last sign-in</TableHead>
                <TableHead className="w-0 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-14 text-center">
                    <Users className="mx-auto mb-3 size-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      {tab === 'pending' ? 'Nobody is waiting for approval.' : q ? `Nobody matches “${q}”.` : 'Nobody here yet.'}
                    </p>
                  </TableCell>
                </TableRow>
              )}
              {people.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <span className="block font-medium">{p.name || '—'}</span>
                    <span className="block text-sm text-muted-foreground">{p.email}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.kind === 'parent' || p.kind === 'other' ? 'outline' : 'default'} className="capitalize">{p.kind === 'other' ? 'No role yet' : p.kind}</Badge>
                    {(p.kind === 'teacher' || p.kind === 'parent') && (
                      <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">
                        {p.kind === 'teacher' ? `${p.studentCount} student${p.studentCount === 1 ? '' : 's'}` : `${p.childCount} child${p.childCount === 1 ? '' : 'ren'}`}
                      </span>
                    )}
                  </TableCell>
                  <TableCell><StatusBadge p={p} /></TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {p.lastLogin ? new Date(p.lastLogin).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {renderActions(p)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={creating} onOpenChange={(open) => !open && setCreating(false)}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={create}>
            <DialogHeader>
              <DialogTitle>Add a user</DialogTitle>
              <DialogDescription>Accounts you create are approved straight away. An admin can manage everything, so add them sparingly.</DialogDescription>
            </DialogHeader>

            {formError && (
              <Alert className="my-4 border-destructive/40 bg-destructive/8">
                <AlertTriangle className="size-4 text-destructive" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <FormField label="Role" required>
                <Select value={form.appRole} onValueChange={(v) => setForm({ ...form, appRole: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Name">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </FormField>
              <FormField label="Email" required>
                <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </FormField>
              <FormField label="Phone">
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Password" helper="Leave blank to generate a temporary one you can pass on.">
                  <Input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </FormField>
              </div>
            </div>

            <DialogFooter className="mt-2">
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />} Create account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={credentials !== null} onOpenChange={(open) => !open && setCredentials(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{credentials?.reset ? 'Password reset' : 'Account created'}</DialogTitle>
            <DialogDescription>
              Share this temporary password with {credentials?.email}. It is shown only once.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2.5">
            <code className="min-w-0 flex-1 truncate text-sm">{credentials?.password}</code>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Copy password"
              onClick={() => { void navigator.clipboard?.writeText(credentials?.password ?? ''); toast.success('Copied'); }}
            >
              <Copy className="size-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setCredentials(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
