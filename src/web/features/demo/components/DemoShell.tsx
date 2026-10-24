/**
 * DemoShell — the clickable prototype's chrome.
 *
 * Deliberately NOT behind AuthGuard: the prototype is for walking someone
 * through the Teacher → Parent flow without accounts. The role
 * switcher in the header stands in for signing in as each kind of user.
 *
 * Phone first: below `lg` the sidebar becomes a bottom tab bar, so every
 * section is one thumb-tap away. The homepage (/demo) and the teacher's chat
 * assistant (/demo/school) render bare — each has its own header.
 *
 * Everything inside is `print:hidden` except the page body, so a paper opened
 * in the shell prints as a clean question paper.
 */
import * as React from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate, useMatch } from 'react-router-dom';
import {
  Button, Sheet, SheetContent, SheetTrigger, Badge, useTheme,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@bloomneo/uikit';
import {
  Menu, Gauge, FileText, Sparkles, Users, Home, TrendingUp, RotateCcw, Moon, Sun,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LogoMark, Wordmark } from '@/shared/Logo';
import { DemoProvider, useDemo, SCHOOL, studentById, ME_STUDENT, type Role } from '../data/store';

type Item = { to: string; label: string; short: string; icon: LucideIcon; end?: boolean };

const NAV: Record<Role, Item[]> = {
  school: [
    { to: '/demo/school', label: 'Assistant', short: 'Assistant', icon: Sparkles, end: true },
    { to: '/demo/school/papers', label: 'Test papers', short: 'Papers', icon: FileText },
    { to: '/demo/school/students', label: 'Students', short: 'Students', icon: Users },
    { to: '/demo/school/insights', label: 'Insights', short: 'Insights', icon: Gauge },
  ],
  parent: [
    { to: '/demo/parent', label: 'Home', short: 'Home', icon: Home, end: true },
    { to: '/demo/parent/progress', label: 'Progress', short: 'Progress', icon: TrendingUp },
  ],
};

const ROLE_LABEL: Record<Role, string> = { school: 'Teacher', parent: 'Parent' };

function who(role: Role) {
  const me = studentById(ME_STUDENT);
  if (role === 'school') return { name: 'Ms. Kavya Nair', sub: 'Maths teacher · 10-A' };
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

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { role, reset } = useDemo();
  const navigate = useNavigate();
  const me = who(role);
  return (
    <div className="flex h-full flex-col">
      <Link to="/demo" className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <LogoMark className="size-8" />
        <Wordmark className="text-sidebar-foreground" />
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

/** Phone navigation: the role's sections as a bottom tab bar. */
function BottomTab({ to, short, icon: Icon, end }: Item) {
  const active = Boolean(useMatch({ path: to, end: end ?? false }));
  return (
    <NavLink
      to={to}
      end={end}
      className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}
    >
      <span className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${active ? 'bg-secondary' : ''}`}>
        <Icon className="size-5" />
      </span>
      {short}
    </NavLink>
  );
}

function BottomNav() {
  const { role } = useDemo();
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur print:hidden lg:hidden"
    >
      {NAV[role].map((item) => <BottomTab key={item.to} {...item} />)}
    </nav>
  );
}

export function RoleSwitcher() {
  const { role, setRole } = useDemo();
  const navigate = useNavigate();
  return (
    <Select
      value={role}
      onValueChange={(v) => { setRole(v as Role); navigate(`/demo/${v}`); }}
    >
      <SelectTrigger className="h-9 w-[8.5rem] rounded-full sm:w-[10rem]" aria-label="View as">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
          <SelectItem key={r} value={r}>{ROLE_LABEL[r]} view</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ModeToggle() {
  const { mode, setMode } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9 rounded-full"
      aria-label={mode === 'dark' ? 'Light mode' : 'Dark mode'}
      onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
    >
      {mode === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
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
  React.useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  if (pathname === '/demo' || pathname === '/demo/') return <Outlet />;
  // The teacher's assistant is a full-screen chat with its own slim top bar.
  if (pathname === '/demo/school' || pathname === '/demo/school/') return <><RoleFromUrl /><Outlet /></>;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <RoleFromUrl />
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar print:hidden lg:block">
        <div className="sticky top-0 h-screen"><Sidebar /></div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur print:hidden sm:px-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" className="size-9 lg:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <Sidebar onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <Link to="/demo" className="flex items-center gap-2 lg:hidden" aria-label="MedhaMark home">
            <LogoMark className="size-7" />
            <Wordmark className="hidden min-[400px]:inline" />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <RoleSwitcher />
            <ModeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-24 lg:pb-6 print:p-0">
          <Outlet />
        </main>
      </div>
      <BottomNav />
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
