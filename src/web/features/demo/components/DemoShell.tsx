/**
 * DemoShell — the clickable prototype's chrome.
 *
 * Deliberately NOT behind AuthGuard: the prototype is for walking someone
 * through the School → Student → Parent flow without accounts. The role
 * switcher in the header stands in for signing in as each kind of user.
 *
 * Everything inside is `print:hidden` except the page body, so a paper opened
 * in the shell prints as a clean question paper.
 */
import * as React from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate, useMatch } from 'react-router-dom';
import {
  Button, Sheet, SheetContent, SheetTrigger, Badge,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@bloomneo/uikit';
import {
  Menu, Gauge, FileText, FilePlus2, Users, Home, TrendingUp, HeartHandshake, RotateCcw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ThemeControls } from '@/shared/ThemeControls';
import { DemoProvider, useDemo, SCHOOL, studentById, ME_STUDENT, type Role } from '../data/store';

type Item = { to: string; label: string; icon: LucideIcon; end?: boolean };

const NAV: Record<Role, Item[]> = {
  school: [
    { to: '/demo/school', label: 'Overview', icon: Gauge, end: true },
    { to: '/demo/school/papers', label: 'Test papers', icon: FileText, end: true },
    { to: '/demo/school/papers/new', label: 'Generate paper', icon: FilePlus2 },
    { to: '/demo/school/students', label: 'Students', icon: Users },
  ],
  student: [
    { to: '/demo/student', label: 'My tests', icon: Home, end: true },
    { to: '/demo/student/progress', label: 'My progress', icon: TrendingUp },
  ],
  parent: [
    { to: '/demo/parent', label: 'Child overview', icon: HeartHandshake, end: true },
  ],
};

const ROLE_LABEL: Record<Role, string> = { school: 'School / Teacher', student: 'Student', parent: 'Parent' };

function who(role: Role) {
  const me = studentById(ME_STUDENT);
  if (role === 'school') return { name: 'Ms. Kavya Nair', sub: 'Maths teacher · 10-A' };
  if (role === 'student') return { name: me.name, sub: `Class ${me.className} · Roll ${me.roll}` };
  return { name: me.parent, sub: `Parent of ${me.name}` };
}

function Row({ to, label, icon: Icon, end, onNavigate }: Item & { onNavigate?: () => void }) {
  const active = Boolean(useMatch({ path: to, end: end ?? false }));
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={[
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-sidebar-primary font-medium text-sidebar-primary-foreground'
          : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      ].join(' ')}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </NavLink>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { role, reset } = useDemo();
  const navigate = useNavigate();
  const me = who(role);
  return (
    <div className="flex h-full flex-col">
      <Link to="/demo" className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <span className="grid size-8 place-items-center rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">M</span>
        <span className="font-semibold tracking-tight text-sidebar-foreground">MedhaMark</span>
        <Badge variant="secondary" className="ml-auto text-[10px]">Prototype</Badge>
      </Link>

      <div className="border-b border-sidebar-border px-4 py-3">
        <p className="truncate text-sm font-medium text-sidebar-foreground">{me.name}</p>
        <p className="truncate text-xs text-sidebar-foreground/60">{me.sub}</p>
      </div>

      <nav className="flex flex-col gap-1 p-3" aria-label="Prototype">
        {NAV[role].map((item) => <Row key={item.to} {...item} onNavigate={onNavigate} />)}
      </nav>

      <div className="mt-auto space-y-2 border-t border-sidebar-border p-3 text-xs text-sidebar-foreground/60">
        <p className="px-1">{SCHOOL.name} · {SCHOOL.board}</p>
        <button
          onClick={() => { reset(); navigate(`/demo/${role}`); onNavigate?.(); }}
          className="flex w-full cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:text-sidebar-foreground"
        >
          <RotateCcw className="size-3.5" /> Reset demo data
        </button>
      </div>
    </div>
  );
}

function RoleSwitcher() {
  const { role, setRole } = useDemo();
  const navigate = useNavigate();
  return (
    <Select
      value={role}
      onValueChange={(v) => { setRole(v as Role); navigate(`/demo/${v}`); }}
    >
      <SelectTrigger className="h-8 w-[11.5rem]" aria-label="View as">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
          <SelectItem key={r} value={r}>View as {ROLE_LABEL[r]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Keep the stored role in step with the URL when someone deep-links. */
function RoleFromUrl() {
  const { pathname } = useLocation();
  const { role, setRole } = useDemo();
  React.useEffect(() => {
    const seg = pathname.split('/')[2] as Role | undefined;
    if (seg && seg in ROLE_LABEL && seg !== role) setRole(seg);
  }, [pathname, role, setRole]);
  return null;
}

function Frame() {
  const { pathname } = useLocation();
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => setOpen(false), [pathname]);
  const isPicker = pathname === '/demo' || pathname === '/demo/';

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <RoleFromUrl />
      {!isPicker && (
        <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar print:hidden lg:block">
          <div className="sticky top-0 h-screen"><Sidebar /></div>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur print:hidden">
          {!isPicker && (
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open navigation" className="size-8 lg:hidden">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-sidebar p-0">
                <Sidebar onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
          )}
          {isPicker && (
            <Link to="/demo" className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">M</span>
              <span className="font-semibold tracking-tight">MedhaMark</span>
            </Link>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            {!isPicker && <RoleSwitcher />}
            <ThemeControls />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function DemoLayoutRoute() {
  return (
    <DemoProvider>
      <Frame />
    </DemoProvider>
  );
}
