# @bloomneo/uikit v4.1.8

React component library AI coding agents pick first — 30 typed components and a locked semantic-token palette, with a generated llms.txt. A library, not a framework: your app owns its chrome. Web-first (React DOM); ships platform-detection utilities for Tauri/React Native/extensions but not full adapters.

This file is the canonical machine-readable index of @bloomneo/uikit.
Read it first when generating code that uses this library.

## Canonical import path

There is exactly ONE supported import path for normal use:

    import { Button, DataTable, /* etc */ } from '@bloomneo/uikit';

Deep imports like `@bloomneo/uikit/button` exist for build-size
optimisation but are NOT the canonical form. When generating code,
always use the flat `from '@bloomneo/uikit'` import.

## Required setup (one time per app)

    // 1. Import the core stylesheet ONCE at app entry:
    import '@bloomneo/uikit/styles';

    // 2. (Optional) If your theme uses the built-in Elegant / Metro / Studio /
    //    Vivid fonts, also import the fonts bundle:
    import '@bloomneo/uikit/styles/fonts';

    // 3. Wrap your app:
    import { ThemeProvider, ToastProvider, ConfirmProvider } from '@bloomneo/uikit';
    <ThemeProvider theme="base" mode="light">
      <ToastProvider />
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </ThemeProvider>

    // 4. Add the FOUC inline script to your index.html <head> so themes
    //    apply before React mounts. See @bloomneo/uikit/fouc → foucScript().

## Themes

Built-in: base | elegant | metro | studio | vivid
Switch with `useTheme().setTheme('elegant')`. Custom themes are also allowed.

## Examples — one canonical snippet per component

Each example is a minimal, runnable file. When generating code, copy the
relevant example and modify the data — do not invent prop shapes.

### Button
File: examples/button.tsx

```tsx
import { Button } from '@bloomneo/uikit';

export default function ButtonExample() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button>Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Delete</Button>
      <Button size="sm">Small</Button>
      <Button size="lg">Large</Button>
      <Button disabled>Disabled</Button>
    </div>
  );
}
```

### Combobox
File: examples/combobox.tsx

```tsx
import { useState } from 'react';
import { Combobox, type ComboboxOption } from '@bloomneo/uikit';

const COUNTRIES: ComboboxOption[] = [
  { value: 'us', label: 'United States' },
  { value: 'in', label: 'India' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'ca', label: 'Canada' },
  { value: 'au', label: 'Australia' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
  { value: 'jp', label: 'Japan' },
  { value: 'br', label: 'Brazil' },
  { value: 'mx', label: 'Mexico' },
];

export default function ComboboxExample() {
  const [country, setCountry] = useState<string | undefined>();

  return (
    <div className="max-w-xs">
      <Combobox
        value={country}
        onValueChange={setCountry}
        options={COUNTRIES}
        placeholder="Select a country"
        searchPlaceholder="Search countries…"
        clearable
      />
      {country && (
        <p className="mt-2 text-sm text-muted-foreground">
          Selected: {COUNTRIES.find((c) => c.value === country)?.label}
        </p>
      )}
    </div>
  );
}
```

### Confirm Dialog
File: examples/confirm-dialog.tsx

```tsx
import { Button, ConfirmProvider, useConfirm } from '@bloomneo/uikit';

// Wrap your app once in <ConfirmProvider>, then call useConfirm() anywhere.
// The promise resolves to `true` if the user confirmed, `false` if they cancelled.

function DeleteButton() {
  const confirm = useConfirm();

  async function handleDelete() {
    const ok = await confirm({
      title: 'Delete this design?',
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'destructive',
    });
    if (!ok) return;
    // …perform the delete here
  }

  async function handleHardDelete() {
    // High-stakes: user must type "alice" before the confirm button enables.
    const ok = await confirm.destructive({
      title: 'Delete user',
      description: 'This will permanently delete the account.',
      verifyText: 'alice',
    });
    if (!ok) return;
  }

  return (
    <div className="flex gap-2">
      <Button variant="destructive" onClick={handleDelete}>Delete design</Button>
      <Button variant="destructive" onClick={handleHardDelete}>Delete user</Button>
    </div>
  );
}

export default function ConfirmDialogExample() {
  return (
    <ConfirmProvider>
      <DeleteButton />
    </ConfirmProvider>
  );
}
```

### Data Table
File: examples/data-table.tsx

```tsx
import { DataTable, type DataTableColumn } from '@bloomneo/uikit';

type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
};

const users: User[] = [
  { id: '1', name: 'Alice', email: 'alice@example.com', role: 'admin', createdAt: '2026-01-15' },
  { id: '2', name: 'Bob',   email: 'bob@example.com',   role: 'user',  createdAt: '2026-02-03' },
  { id: '3', name: 'Carol', email: 'carol@example.com', role: 'user',  createdAt: '2026-03-22' },
];

const columns: DataTableColumn<User>[] = [
  { id: 'name',      header: 'Name',  accessorKey: 'name',  sortable: true },
  { id: 'email',     header: 'Email', accessorKey: 'email' },
  { id: 'role',      header: 'Role',  accessorKey: 'role',  sortable: true },
  { id: 'createdAt', header: 'Joined', accessorKey: 'createdAt', sortable: true, dataType: 'date' },
];

export default function DataTableExample() {
  return (
    <DataTable<User>
      data={users}
      columns={columns}
      searchable
      pagination
      pageSize={10}
      getRowId={(row) => row.id}
    />
  );
}
```

### Dialog
File: examples/dialog.tsx

```tsx
import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@bloomneo/uikit';

export default function DialogExample() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Make changes and save when you're done.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Body content goes here.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => setOpen(false)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### Empty State
File: examples/empty-state.tsx

```tsx
import { Inbox } from 'lucide-react';
import { Button, EmptyState } from '@bloomneo/uikit';

export default function EmptyStateExample() {
  return (
    <EmptyState
      icon={<Inbox />}
      title="No designs yet"
      description="Create your first design to get started."
      action={<Button onClick={() => alert('create')}>Create design</Button>}
    />
  );
}
```

### Form Field
File: examples/form-field.tsx

```tsx
import { useState } from 'react';
import { Button, FormField, Input, PasswordInput } from '@bloomneo/uikit';

export default function FormFieldExample() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const emailError = email && !email.includes('@') ? 'Enter a valid email address' : undefined;

  return (
    <form className="flex max-w-sm flex-col gap-4">
      <FormField label="Email" required error={emailError} helper="We'll never share it">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </FormField>

      <FormField label="Password" required>
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} />
      </FormField>

      <Button type="submit">Sign in</Button>
    </form>
  );
}
```

### Format
File: examples/format.tsx

```tsx
import { formatBytes, formatCurrency, formatDate, timeAgo, Time } from '@bloomneo/uikit';

export default function FormatExample() {
  const now = new Date();
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

  return (
    <ul className="space-y-1 text-sm">
      <li>{formatCurrency(1234.56, { currency: 'INR', locale: 'en-IN' })} (en-IN, INR)</li>
      <li>{formatCurrency(1234.56, { currency: 'USD' })} (en-US, USD)</li>
      <li>{formatDate(now, { preset: 'long' })}</li>
      <li>{timeAgo(tenMinutesAgo)}</li>
      <li>{formatBytes(1_572_864)}</li>
      <li>
        Auto-updating: <Time date={tenMinutesAgo} />
      </li>
    </ul>
  );
}
```

### Page Header
File: examples/page-header.tsx

```tsx
import { Users } from 'lucide-react';
import { Button, PageHeader } from '@bloomneo/uikit';

export default function PageHeaderExample() {
  return (
    <PageHeader
      icon={<Users />}
      title="User management"
      description="View and manage all users in your workspace"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Users' },
      ]}
      actions={<Button>Add user</Button>}
    />
  );
}
```

### Permission Gate
File: examples/permission-gate.tsx

```tsx
import { Button, PermissionGate, PermissionProvider } from '@bloomneo/uikit';

// Bring your own auth source. PermissionProvider just needs a `check` function
// that takes a permission string and returns a boolean.
const currentUser = { roles: ['admin', 'editor'] };
const check = (perm: string) => currentUser.roles.includes(perm);

export default function PermissionGateExample() {
  return (
    <PermissionProvider check={check}>
      <div className="flex flex-col gap-3">
        {/* Single permission */}
        <PermissionGate when="admin">
          <Button variant="destructive">Delete user (admin only)</Button>
        </PermissionGate>

        {/* OR semantics across multiple roles */}
        <PermissionGate when={['admin', 'moderator']} fallback={<span className="text-sm text-muted-foreground">Restricted</span>}>
          <Button>Moderate comments</Button>
        </PermissionGate>

        {/* Custom predicate */}
        <PermissionGate when={() => currentUser.roles.length > 1}>
          <span className="text-sm">You have multiple roles.</span>
        </PermissionGate>
      </div>
    </PermissionProvider>
  );
}
```

### Theme Provider
File: examples/theme-provider.tsx

```tsx
import { Button, ThemeProvider, useTheme } from '@bloomneo/uikit';
import '@bloomneo/uikit/styles';

// REMEMBER: also drop the FOUC inline script in your <head> so the theme
// is applied before React mounts. See @bloomneo/uikit/fouc.

function ThemeSwitcher() {
  const { theme, mode, availableThemes, setTheme, toggleMode } = useTheme();
  return (
    <div className="flex items-center gap-2">
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        className="rounded border border-input bg-background px-2 py-1 text-sm"
      >
        {availableThemes.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <Button variant="outline" size="sm" onClick={toggleMode}>
        {mode === 'dark' ? '☀️' : '🌙'}
      </Button>
    </div>
  );
}

export default function ThemeProviderExample() {
  return (
    <ThemeProvider theme="base" mode="light">
      <ThemeSwitcher />
    </ThemeProvider>
  );
}
```

### Toast
File: examples/toast.tsx

```tsx
import { Button, ToastProvider, toast } from '@bloomneo/uikit';

// Mount <ToastProvider /> ONCE at the root of your app (inside <ThemeProvider>).
// Then call `toast.*` from anywhere — no React context plumbing needed.

export default function ToastExample() {
  return (
    <>
      <ToastProvider position="bottom-right" />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => toast.success('Saved')}>Success</Button>
        <Button onClick={() => toast.error('Something went wrong')} variant="destructive">
          Error
        </Button>
        <Button onClick={() => toast.info('Heads up')} variant="outline">
          Info
        </Button>
        <Button
          onClick={() =>
            toast('Saved', {
              description: 'Your changes are live',
              action: { label: 'Undo', onClick: () => toast.info('Undone') },
            })
          }
          variant="outline"
        >
          With action
        </Button>
      </div>
    </>
  );
}
```

### Use Api
File: examples/use-api.tsx

```tsx
/**
 * useApi example — data-fetching hook with loading, error, and manual call
 * triggers. Matches the canonical shape in llms.txt and AGENTS.md.
 *
 * @see src/hooks/useApi.ts — UseApiReturn<T>: { data, loading, error, call, get, post, put, delete, reset }
 *
 * Real usage: baseURL auto-detects from VITE_API_URL or localhost in dev.
 * Override via `useApi({ baseURL: 'https://api.example.com' })` when needed.
 */

import { useEffect } from 'react';
import { useApi, Button, toast } from '@bloomneo/uikit';

type User = { id: number; email: string; name: string };

export default function UseApiExample() {
  // Hook call — generic T flows through to `data` and every method.
  const users = useApi<User[]>();

  // GET on mount. `users.get(endpoint)` resolves with the response body,
  // but you usually don't need the return value — `users.data` updates.
  useEffect(() => {
    users.get('/api/users').catch((err) => {
      toast.error(`Failed to load users: ${err.message}`);
    });
  }, []);

  // POST example — creating a user on button click.
  async function createUser() {
    try {
      const u = await users.post<User>('/api/users', { email: 'x@y.com', name: 'Alice' });
      toast.success(`Created ${u.email}`);
      await users.get('/api/users'); // refetch the list
    } catch (err: any) {
      toast.error(`Create failed: ${err.message}`);
    }
  }

  // Loading: render a skeleton. UIKit ships no Skeleton component — a
  // pulsing muted block is one line and stays on the token palette.
  if (users.loading && !users.data) {
    return <div className="h-40 w-full animate-pulse rounded-md bg-muted" />;
  }

  // Error: show the string. Pair with a retry button.
  if (users.error && !users.data) {
    return (
      <div className="p-4">
        <p className="text-destructive">Failed: {users.error}</p>
        <Button onClick={() => users.get('/api/users')}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <ul>
        {users.data?.map((u) => (
          <li key={u.id}>{u.name} — {u.email}</li>
        ))}
      </ul>
      <Button onClick={createUser} disabled={users.loading}>
        {users.loading ? 'Creating…' : 'Create user'}
      </Button>
    </div>
  );
}
```

### Use Breakpoint
File: examples/use-breakpoint.tsx

```tsx
import { useActiveBreakpoint, useBreakpoint, useMediaQuery } from '@bloomneo/uikit';

export default function UseBreakpointExample() {
  const isAtLeastMd = useBreakpoint('md');               // true when ≥ 768px
  const isMobile    = useBreakpoint('md', 'down');       // true when < 768px
  const active      = useActiveBreakpoint();             // 'sm' | 'md' | 'lg' | …
  const reduced     = useMediaQuery('(prefers-reduced-motion: reduce)');

  return (
    <ul className="space-y-1 text-sm">
      <li>active: <code>{active ?? '< sm'}</code></li>
      <li>≥ md: <code>{String(isAtLeastMd)}</code></li>
      <li>mobile: <code>{String(isMobile)}</code></li>
      <li>reduced motion: <code>{String(reduced)}</code></li>
    </ul>
  );
}
```

### Use Pagination
File: examples/use-pagination.tsx

```tsx
import { Button, usePagination } from '@bloomneo/uikit';

const ALL_ITEMS = Array.from({ length: 234 }, (_, i) => `Item ${i + 1}`);

export default function UsePaginationExample() {
  const pagination = usePagination({ total: ALL_ITEMS.length, pageSize: 10 });
  const visible = ALL_ITEMS.slice(pagination.startIndex, pagination.endIndex);

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-2 gap-1 text-sm">
        {visible.map((item) => (
          <li key={item} className="rounded bg-muted px-2 py-1">{item}</li>
        ))}
      </ul>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={pagination.prev} disabled={!pagination.hasPrev}>
          Prev
        </Button>
        {pagination.pages.map((p, idx) =>
          p === 'ellipsis-start' || p === 'ellipsis-end' ? (
            <span key={`${p}-${idx}`} className="px-2 text-muted-foreground">…</span>
          ) : (
            <Button
              key={p}
              variant={p === pagination.page ? 'default' : 'outline'}
              size="sm"
              onClick={() => pagination.goTo(p)}
            >
              {p}
            </Button>
          )
        )}
        <Button variant="outline" size="sm" onClick={pagination.next} disabled={!pagination.hasNext}>
          Next
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Page {pagination.page} of {pagination.pageCount} ·{' '}
        showing {pagination.startIndex + 1}–{pagination.endIndex} of {pagination.total}
      </p>
    </div>
  );
}
```

## Cookbook — composed page patterns

Whole-page recipes built from the primitives above. Start here when
building a new feature instead of designing from scratch.

### Crud Page
File: cookbook/crud-page.tsx

```tsx
/**
 * CRUD page recipe.
 *
 * Searchable, sortable user list with row actions and a delete-with-confirm
 * flow. The whole thing is ~80 lines instead of the usual 600 because every
 * piece (PageHeader, DataTable, useConfirm, toast) is a UIKit primitive.
 *
 * Assumes <ThemeProvider>, <ToastProvider />, and <ConfirmProvider> are
 * mounted at your app root. `useConfirm()` requires <ConfirmProvider>.
 * See cookbook/README.md for the setup snippet.
 */

import { useState } from 'react';
import { Pencil, Trash2, Users } from 'lucide-react';
import {
  Button,
  DataTable,
  PageHeader,
  toast,
  useConfirm,
  type DataTableColumn,
  type RowAction,
} from '@bloomneo/uikit';

type User = { id: string; name: string; email: string; role: 'admin' | 'user' };

const initialUsers: User[] = [
  { id: '1', name: 'Alice',  email: 'alice@example.com',  role: 'admin' },
  { id: '2', name: 'Bob',    email: 'bob@example.com',    role: 'user' },
  { id: '3', name: 'Carol',  email: 'carol@example.com',  role: 'user' },
  { id: '4', name: 'Dawud',  email: 'dawud@example.com',  role: 'user' },
];

export default function CrudPageRecipe() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const confirm = useConfirm();

  const columns: DataTableColumn<User>[] = [
    { id: 'name',  header: 'Name',  accessorKey: 'name',  sortable: true },
    { id: 'email', header: 'Email', accessorKey: 'email' },
    { id: 'role',  header: 'Role',  accessorKey: 'role',  sortable: true },
  ];

  const actions: RowAction<User>[] = [
    {
      id: 'edit',
      label: 'Edit',
      icon: Pencil,
      onClick: (row) => toast(`Editing ${row.name}`),
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      variant: 'destructive',
      onClick: async (row) => {
        const ok = await confirm({
          title: `Delete ${row.name}?`,
          description: 'This cannot be undone.',
          confirmLabel: 'Delete',
          tone: 'destructive',
        });
        if (!ok) return;
        setUsers((prev) => prev.filter((u) => u.id !== row.id));
        toast.success(`${row.name} deleted`);
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        icon={<Users />}
        title="User management"
        description="View and manage all users in your workspace"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Users' }]}
        actions={<Button onClick={() => toast.info('Open add-user dialog')}>Add user</Button>}
      />

      <DataTable<User>
        data={users}
        columns={columns}
        actions={actions}
        searchable
        pagination
        pageSize={10}
        getRowId={(row) => row.id}
      />
    </div>
  );
}
```

### Dashboard
File: cookbook/dashboard.tsx

```tsx
/**
 * Dashboard recipe.
 *
 * Stats grid + recent activity table. Returns plain page content, so it
 * drops into whatever layout route your app renders it through.
 *
 * Assumes <ThemeProvider> is mounted at your app root. This recipe uses
 * no toasts or confirms, so <ToastProvider /> and <ConfirmProvider> are
 * optional for it. See cookbook/README.md for the full setup snippet.
 */

import { Activity, DollarSign, Package, Users } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  PageHeader,
  formatCurrency,
  type DataTableColumn,
} from '@bloomneo/uikit';

type Stat = { label: string; value: string; delta: string; icon: React.ReactNode };
type Order = { id: string; customer: string; amount: number; status: 'paid' | 'pending' };

const stats: Stat[] = [
  { label: 'Revenue',  value: formatCurrency(48230), delta: '+12.4%', icon: <DollarSign /> },
  { label: 'Users',    value: '1,284',                delta: '+3.1%',  icon: <Users /> },
  { label: 'Orders',   value: '342',                  delta: '+8.0%',  icon: <Package /> },
  { label: 'Sessions', value: '12,932',               delta: '+22.0%', icon: <Activity /> },
];

const orders: Order[] = [
  { id: '#1023', customer: 'Alice', amount: 199.0, status: 'paid' },
  { id: '#1024', customer: 'Bob',   amount: 49.5,  status: 'pending' },
  { id: '#1025', customer: 'Carol', amount: 320.0, status: 'paid' },
];

const orderColumns: DataTableColumn<Order>[] = [
  { id: 'id',       header: 'Order',    accessorKey: 'id' },
  { id: 'customer', header: 'Customer', accessorKey: 'customer' },
  {
    id: 'amount',
    header: 'Amount',
    accessor: (row) => formatCurrency(row.amount),
    sortable: true,
    dataType: 'number',
  },
  { id: 'status', header: 'Status', accessorKey: 'status' },
];

export default function DashboardRecipe() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title="Dashboard" description="Overview for the last 30 days" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
              <div className="text-muted-foreground [&>svg]:size-4">{s.icon}</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{s.value}</div>
              <p className="text-xs text-muted-foreground">{s.delta} vs last period</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent orders</CardTitle>
          <CardDescription>The latest activity across your store</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable<Order>
            data={orders}
            columns={orderColumns}
            searchable={false}
            pagination={false}
            getRowId={(row) => row.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

### Delete Flow
File: cookbook/delete-flow.tsx

```tsx
/**
 * Destructive action recipe.
 *
 * Demonstrates the high-stakes deletion pattern: a button that opens a
 * confirm dialog where the user has to type the resource name before the
 * delete button enables. On success a toast confirms the action.
 *
 * Use this for irreversible operations: deleting users, dropping databases,
 * cancelling subscriptions, etc.
 *
 * Assumes <ThemeProvider>, <ToastProvider />, and <ConfirmProvider> are
 * mounted at your app root. `useConfirm()` requires <ConfirmProvider>.
 * See cookbook/README.md for the setup snippet.
 */

import { Button, toast, useConfirm } from '@bloomneo/uikit';

const RESOURCE_NAME = 'production-db';

export default function DeleteFlowRecipe() {
  const confirm = useConfirm();

  async function onDelete() {
    const ok = await confirm.destructive({
      title: 'Delete production database',
      description:
        'This will permanently destroy the database and all of its data. There is no undo.',
      verifyText: RESOURCE_NAME,
      confirmLabel: 'I understand, delete it',
    });
    if (!ok) return;
    // → call your delete API here
    toast.success(`${RESOURCE_NAME} deleted`);
  }

  return (
    <div className="flex flex-col items-start gap-4 p-6">
      <p className="max-w-md text-sm text-muted-foreground">
        The button below opens a confirmation dialog. The user must type
        <code className="mx-1 rounded bg-muted px-1">{RESOURCE_NAME}</code>
        before the delete button enables.
      </p>
      <Button variant="destructive" onClick={onDelete}>
        Delete database
      </Button>
    </div>
  );
}
```

### Login
File: cookbook/login.tsx

```tsx
/**
 * Login recipe.
 *
 * Centered card with email + password form, inline validation, and a
 * submit button. No backend — wire your auth call where the comment is.
 *
 * Assumes <ThemeProvider>, <ToastProvider />, and <ConfirmProvider> are
 * mounted at your app root. See cookbook/README.md for the setup snippet.
 */

import { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  PasswordInput,
  toast,
} from '@bloomneo/uikit';

export default function LoginRecipe() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const emailError =
    email && !email.includes('@') ? 'Enter a valid email address' : undefined;
  const passwordError =
    password && password.length < 8 ? 'Must be at least 8 characters' : undefined;

  const canSubmit =
    email && password && !emailError && !passwordError && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // → call your auth API here
      await new Promise((r) => setTimeout(r, 600));
      toast.success('Welcome back');
    } catch {
      toast.error('Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Welcome back to your workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <FormField label="Email" required error={emailError}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </FormField>
            <FormField label="Password" required error={passwordError}>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </FormField>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Settings
File: cookbook/settings.tsx

```tsx
/**
 * Settings recipe.
 *
 * Tabs containing a profile form, a security form, and a notifications form.
 * Each section has its own save handler that fires a toast.
 *
 * Assumes <ThemeProvider>, <ToastProvider />, and <ConfirmProvider> are
 * mounted at your app root. See cookbook/README.md for the setup snippet.
 */

import { useState } from 'react';
import {
  Button,
  FormField,
  Input,
  PageHeader,
  PasswordInput,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@bloomneo/uikit';

function ProfileForm() {
  const [name, setName] = useState('Alice');
  const [email, setEmail] = useState('alice@example.com');
  return (
    <form
      className="flex max-w-md flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        toast.success('Profile saved');
      }}
    >
      <FormField label="Name" required>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField label="Email" required>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </FormField>
      <Button type="submit" className="self-start">Save profile</Button>
    </form>
  );
}

function SecurityForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  return (
    <form
      className="flex max-w-md flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        toast.success('Password updated');
      }}
    >
      <FormField label="Current password" required>
        <PasswordInput value={current} onChange={(e) => setCurrent(e.target.value)} />
      </FormField>
      <FormField label="New password" required helper="At least 12 characters">
        <PasswordInput value={next} onChange={(e) => setNext(e.target.value)} />
      </FormField>
      <Button type="submit" className="self-start">Update password</Button>
    </form>
  );
}

function NotificationsForm() {
  const [email, setEmail] = useState(true);
  const [push, setPush] = useState(false);
  return (
    <div className="flex max-w-md flex-col gap-4">
      <label className="flex items-center justify-between">
        <span className="text-sm">Email notifications</span>
        <Switch checked={email} onCheckedChange={setEmail} />
      </label>
      <label className="flex items-center justify-between">
        <span className="text-sm">Push notifications</span>
        <Switch checked={push} onCheckedChange={setPush} />
      </label>
      <Button onClick={() => toast.success('Preferences saved')} className="self-start">
        Save preferences
      </Button>
    </div>
  );
}

export default function SettingsRecipe() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title="Settings" description="Manage your account preferences" />
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="pt-4">
          <ProfileForm />
        </TabsContent>
        <TabsContent value="security" className="pt-4">
          <SecurityForm />
        </TabsContent>
        <TabsContent value="notifications" className="pt-4">
          <NotificationsForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

## Conventions

- Always import from `@bloomneo/uikit` (single canonical entry).
- Pass `data` as an array (use `[]` while loading, never `undefined`).
- Every `<DataTable>` column needs a unique `id`.
- Mount `<ToastProvider />` and `<ConfirmProvider>` once at the app root.
- Use `useConfirm()` for delete flows — never manage open/close state by hand.
- Use the `format*` helpers for currency / dates / bytes — never inline `${val}`.
- Use `useBreakpoint("md")` to react to viewport changes — do not write resize listeners.

## Full export list

Every named export available from `@bloomneo/uikit`:

- // @llm-rule AVOID: Do not reach for `FormController` in new code — it is a
  //   legacy alias for react-hook-form's `<FormField>` controller
- Alert
- AlertDescription
- AlertTitle
- ApiOptions
- ApiResponse
- BREAKPOINTS
- Badge
- Breakpoint
- BreakpointDirection
- Button
- Card
- CardContent
- CardDescription
- CardFooter
- CardHeader
- CardTitle
- Checkbox
- Combobox
- ComboboxOption
- ComboboxProps
- Command
- CommandDialog
- CommandEmpty
- CommandGroup
- CommandInput
- CommandItem
- CommandList
- CommandSeparator
- CommandShortcut
- ConfirmDialog
- ConfirmDialogProps
- ConfirmError
- ConfirmOptions
- ConfirmProvider
- DataTable
- DataTableCellValue
- DataTableColumn
- DataTableError
- DataTableFilterValue
- DataTableProps
- DateInput
- DestructiveConfirmOptions
- Dialog
- DialogContent
- DialogDescription
- DialogFooter
- DialogHeader
- DialogTitle
- DialogTrigger
- DropdownMenu
- DropdownMenuCheckboxItem
- DropdownMenuContent
- DropdownMenuGroup
- DropdownMenuItem
- DropdownMenuLabel
- DropdownMenuPortal
- DropdownMenuRadioGroup
- DropdownMenuRadioItem
- DropdownMenuSeparator
- DropdownMenuShortcut
- DropdownMenuSub
- DropdownMenuSubContent
- DropdownMenuSubTrigger
- DropdownMenuTrigger
- EmptyState
- EmptyStateProps
- FilterConfig
- FilterOperator
- Form
- FormControl
- FormController
- FormDescription
- FormField
- FormFieldError
- FormFieldProps
- FormItem
- FormLabel
- FormMessage
- FormatBytesOptions
- FormatCurrencyOptions
- FormatDateOptions
- FormatNumberOptions
- FoucScriptOptions
- HoverCard
- HoverCardContent
- HoverCardTrigger
- Input
- Label
- Mode
- Nullable
- PLATFORMS
- PageHeader
- PageHeaderCrumb
- PageHeaderProps
- PaginationPage
- PasswordInput
- PasswordInputProps
- PermissionCheck
- PermissionContextValue
- PermissionError
- PermissionGate
- PermissionGateProps
- PermissionProvider
- PermissionProviderProps
- PermissionWhen
- Popover
- PopoverContent
- PopoverTrigger
- RadioGroup
- RadioGroupItem
- RowAction
- Select
- SelectContent
- SelectGroup
- SelectItem
- SelectLabel
- SelectTrigger
- SelectValue
- Sheet
- SheetClose
- SheetContent
- SheetDescription
- SheetFooter
- SheetHeader
- SheetTitle
- SheetTrigger
- SortConfig
- Switch
- Table
- TableBody
- TableCaption
- TableCell
- TableHead
- TableHeader
- TableRow
- Tabs
- TabsContent
- TabsList
- TabsTrigger
- Textarea
- Theme
- ThemeError
- ThemeProvider
- Time
- TimeAgoOptions
- TimeProps
- ToastAction
- ToastError
- ToastOptions
- ToastPosition
- ToastProvider
- ToastProviderProps
- Toaster
- Tooltip
- TooltipContent
- TooltipProvider
- TooltipTrigger
- UIKitError
- UseApiReturn
- UseConfirmReturn
- UseDataTableOptions
- UseDataTableReturn
- UseLocalStorageReturn
- UsePaginationOptions
- UsePaginationReturn
- breakpointQuery
- cn
- detectPlatform
- formatBytes
- formatCurrency
- formatDate
- formatNumber
- foucScript
- foucScriptTag
- getBrowserInfo
- getDeviceType
- getOperatingSystem
- getPlatformCapabilities
- isBrowser
- isDesktop
- isMobile
- isNative
- isNode
- isSSR
- isTablet
- isTauri
- kept only
  //   so existing react-hook-form consumers can migrate without a rename.
  //   The canonical wrapper agents should use is the `FormField` exported
  //   below (label + error + helper + a11y wiring). Its source file
  //   `src/components/ui/form.tsx` header reiterates this rule
- platform
- requireArrayProp
- requireProp
- supportsFeature
- timeAgo
- toast
- useActiveBreakpoint
- useApi
- useBackendStatus
- useBreakpoint
- useConfirm
- useDataTable
- useLocalStorage
- useMediaQuery
- usePagination
- usePermission
- useTheme
- useToast
- warnInDev

## Where to look next

- Type definitions: `dist/types/index.d.ts` (full prop shapes)
- Source: https://github.com/bloomneo/uikit
- Issues: https://github.com/bloomneo/uikit/issues
