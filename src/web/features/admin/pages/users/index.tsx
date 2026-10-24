/**
 * User management — `/admin/users`.
 *
 * The whole CRUD lives on one route. The pre-4.0 template spread this across
 * four pages (`index`, `create`, `edit`, `show`), which meant a full route
 * transition and a refetch to change someone's role. Editing a row is not a
 * destination; it is a modal over the list you are already looking at.
 *
 * Data comes from the auth layer's `/api/user/admin/*` endpoints — this layer
 * adds no API of its own for users, it only adds the console.
 */
import * as React from 'react';
import {
  Button, Input, FormField, Badge, Card, CardContent,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Switch, Label, Alert, AlertTitle, AlertDescription,
  toast, useConfirm,
} from '@bloomneo/uikit';
import { Plus, Search, Pencil, Trash2, Loader2, AlertTriangle, UserPlus } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { PageLoading } from '../../components/PageLoading';
import { adminFetch, adminFetchJson } from '../../lib/admin-api';

type User = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  level: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
};

/* The API takes `role` and `level` as separate fields; roles are namespaced
 * (`admin.system`) while levels are flat (`basic`). Keeping the option lists
 * here — rather than deriving them from whatever the rows happen to contain —
 * means an empty table still offers the full set. */
const ROLES = ['user', 'moderator', 'admin'];
const LEVELS = ['basic', 'pro', 'max', 'tenant', 'org', 'system'];

const BLANK = {
  name: '', email: '', phone: '', password: '',
  role: 'user', level: 'basic', isActive: true, isVerified: false,
};

function roleTone(role: string): 'default' | 'secondary' | 'outline' {
  if (role.startsWith('admin')) return 'default';
  if (role.startsWith('moderator')) return 'secondary';
  return 'outline';
}

export default function AdminUsersPage() {
  const confirm = useConfirm();
  const [users, setUsers] = React.useState<User[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [q, setQ] = React.useState('');

  // `null` = closed. A string id = editing that user. 'new' = creating one.
  const [editing, setEditing] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(BLANK);
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoadError(null);
    try {
      const data = await adminFetchJson<{ users: User[] }>('/api/user/admin/users');
      setUsers(data.users ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load users.');
      setUsers([]);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const filtered = React.useMemo(() => {
    if (!users) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((u) =>
      [u.name, u.email, u.role].some((f) => f?.toLowerCase().includes(needle)),
    );
  }, [users, q]);

  function openCreate() {
    setForm(BLANK);
    setFormError(null);
    setEditing('new');
  }

  function openEdit(u: User) {
    // Password is deliberately not pre-filled — it is never sent to the client,
    // and an empty field here means "leave it alone" on submit.
    setForm({
      name: u.name ?? '', email: u.email, phone: u.phone ?? '', password: '',
      role: u.role, level: u.level, isActive: u.isActive, isVerified: u.isVerified,
    });
    setFormError(null);
    setEditing(u.id);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setFormError(null);
    setSaving(true);
    try {
      if (editing === 'new') {
        await adminFetchJson('/api/user/admin/create', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        toast.success(`Created ${form.email}`);
      } else {
        const { password, ...rest } = form;
        await adminFetchJson(`/api/user/admin/users/${editing}`, {
          method: 'PUT',
          body: JSON.stringify(rest),
        });
        // Password lives behind its own endpoint so that a routine profile
        // edit cannot reset someone's credentials by accident.
        if (password) {
          await adminFetchJson(`/api/user/admin/users/${editing}/password`, {
            method: 'PUT',
            body: JSON.stringify({ password }),
          });
        }
        toast.success('Changes saved');
      }
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(u: User) {
    const ok = await confirm({
      title: `Delete ${u.name || u.email}?`,
      description: 'This removes the account and cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'destructive',
    });
    if (!ok) return;
    try {
      const res = await adminFetch(`/api/user/admin/users/${u.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      toast.success('User deleted');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete.');
    }
  }

  if (users === null) return <PageLoading />;

  return (
    <>
      <SEO title="Users" description="Manage user accounts, roles and access" />

      <AdminPageHeader
        title="Users"
        description={`${users.length} account${users.length === 1 ? '' : 's'}`}
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> New user
          </Button>
        }
      />

      {loadError && (
        <Alert className="mb-5 border-destructive/40 bg-destructive/8">
          <AlertTriangle className="size-4 text-destructive" />
          <AlertTitle>Could not load users</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <div className="mb-4 relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search name, email or role…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-0 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-14 text-center">
                    <UserPlus className="mx-auto mb-3 size-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      {q ? `No users match “${q}”.` : 'No users yet.'}
                    </p>
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <span className="block font-medium">{u.name || '—'}</span>
                    <span className="block text-sm text-muted-foreground">{u.email}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleTone(u.role)}>{u.role}</Badge>
                    <span className="ml-2 text-xs text-muted-foreground">{u.level}</span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 text-sm">
                      <span
                        aria-hidden
                        className={`size-1.5 rounded-full ${u.isActive ? 'bg-success' : 'bg-muted-foreground/40'}`}
                      />
                      {u.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${u.email}`} onClick={() => openEdit(u)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${u.email}`} onClick={() => remove(u)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* One dialog serves both create and edit — the fields are identical and
          the only difference is which endpoint `save` calls. */}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={save}>
            <DialogHeader>
              <DialogTitle>{editing === 'new' ? 'New user' : 'Edit user'}</DialogTitle>
              <DialogDescription>
                {editing === 'new'
                  ? 'Create an account. They can change their own details after signing in.'
                  : 'Leave the password blank to keep the current one.'}
              </DialogDescription>
            </DialogHeader>

            {formError && (
              <Alert className="my-4 border-destructive/40 bg-destructive/8">
                <AlertTriangle className="size-4 text-destructive" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <FormField label="Name">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </FormField>
              <FormField label="Email" required>
                <Input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </FormField>
              <FormField label="Phone">
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </FormField>
              <FormField
                label="Password"
                required={editing === 'new'}
                helper={editing === 'new' ? 'At least 8 characters.' : 'Blank leaves it unchanged.'}
              >
                <Input
                  type="password"
                  autoComplete="new-password"
                  required={editing === 'new'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </FormField>
              <FormField label="Role">
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Level">
                <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="flex flex-wrap gap-6 border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
                <Label htmlFor="isActive" className="font-normal">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="isVerified"
                  checked={form.isVerified}
                  onCheckedChange={(v) => setForm({ ...form, isVerified: v })}
                />
                <Label htmlFor="isVerified" className="font-normal">Email verified</Label>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                {editing === 'new' ? 'Create user' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
