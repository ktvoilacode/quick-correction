/**
 * DemoShell — the clickable prototype's chrome.
 *
 * Deliberately NOT behind AuthGuard: the prototype is for walking someone
 * through the Teacher → Parent flow without accounts. "View as" in Settings
 * stands in for signing in as each kind of user.
 *
 * One layout everywhere: a slim top bar (logo left, settings right) and four
 * tabs at the bottom. On desktop the tabs move into the top bar. The
 * homepage (/demo) renders bare. Each role's assistant fills the space
 * between the bars.
 *
 * Everything inside is `print:hidden` except the page body, so a paper opened
 * in the shell prints as a clean question paper.
 */
import * as React from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate, useMatch } from 'react-router-dom';
import { Button, Sheet, SheetContent, SheetTitle, SheetTrigger, useTheme } from '@bloomneo/uikit';
import {
  Settings, IndianRupee, FileText, Sparkles, Users, TrendingUp, ClipboardCheck, RotateCcw, Moon, Sun, House,
  GraduationCap, HeartHandshake,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LogoMark, Wordmark } from '@/shared/Logo';
import { DemoProvider, useDemo, studentById, ME_STUDENT, type Role } from '../data/store';

type Item = { to: string; label: string; icon: LucideIcon; end?: boolean };

const NAV: Record<Role, Item[]> = {
  school: [
    { to: '/demo/school', label: 'Assistant', icon: Sparkles, end: true },
    { to: '/demo/school/papers', label: 'Papers', icon: FileText },
    { to: '/demo/school/students', label: 'Students', icon: Users },
    { to: '/demo/school/earnings', label: 'Earnings', icon: IndianRupee },
  ],
  parent: [
    { to: '/demo/parent', label: 'Assistant', icon: Sparkles, end: true },
    { to: '/demo/parent/papers', label: 'Papers', icon: FileText },
    { to: '/demo/parent/corrections', label: 'Corrections', icon: ClipboardCheck },
    { to: '/demo/parent/progress', label: 'Progress', icon: TrendingUp },
  ],
};

const ROLES: { role: Role; label: string; icon: LucideIcon }[] = [
  { role: 'school', label: 'Teacher', icon: GraduationCap },
  { role: 'parent', label: 'Parent', icon: HeartHandshake },
];

function who(role: Role) {
  const me = studentById(ME_STUDENT);
  if (role === 'school') return { name: 'Ms. Kavya Nair', sub: 'Maths tutor · Class 10' };
  return { name: me.parent, sub: `Parent of ${me.name}` };
}

/* ── settings ───────────────────────────────────────────────────────────── */

/** Two or more options, one picked — used for "View as" and appearance. */
function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T;
  options: { value: T; label: string; icon: LucideIcon }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-flow-col auto-cols-fr gap-1 rounded-xl bg-muted p-1">
      {options.map(({ value: v, label: l, icon: Icon }) => (
        <button
          key={v}
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition ${value === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Icon className="size-4" /> {l}
        </button>
      ))}
    </div>
  );
}

function SettingsSheet() {
  const [open, setOpen] = React.useState(false);
  const { role, setRole, reset } = useDemo();
  const { mode, setMode } = useTheme();
  const navigate = useNavigate();
  const me = who(role);
  const initials = me.name.replace(/^Ms\.\s*/, '').split(' ').map((w) => w[0]).join('').slice(0, 2);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="size-10 rounded-full" aria-label="Settings">
          <Settings className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 max-w-[85vw] p-0">
        <div className="flex h-full flex-col gap-6 overflow-y-auto p-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <SheetTitle className="text-lg">Settings</SheetTitle>

          <div className="flex items-center gap-3">
            <span className="mm-gradient grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold">{initials}</span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{me.name}</span>
              <span className="block truncate text-sm text-muted-foreground">{me.sub}</span>
            </span>
          </div>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">View as</h3>
            <Segmented
              label="View as"
              value={role}
              options={ROLES.map((r) => ({ value: r.role, label: r.label, icon: r.icon }))}
              onChange={(r) => { setRole(r); navigate(`/demo/${r}`); setOpen(false); }}
            />
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Appearance</h3>
            <Segmented
              label="Appearance"
              value={mode === 'dark' ? 'dark' : 'light'}
              options={[{ value: 'light', label: 'Light', icon: Sun }, { value: 'dark', label: 'Dark', icon: Moon }]}
              onChange={(m) => setMode(m)}
            />
          </section>

          <section className="space-y-1">
            <button
              onClick={() => { reset(); navigate(`/demo/${role}`); setOpen(false); }}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-sm hover:bg-accent"
            >
              <RotateCcw className="size-4 text-muted-foreground" /> Reset demo data
            </button>
            <Link to="/demo" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm hover:bg-accent">
              <House className="size-4 text-muted-foreground" /> Back to home page
            </Link>
          </section>

          <p className="mt-auto text-center text-xs text-muted-foreground">Prototype · sample data · AI is simulated</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ── bars ───────────────────────────────────────────────────────────────── */

function TopTab({ to, label, icon: Icon, end }: Item) {
  const active = Boolean(useMatch({ path: to, end: end ?? false }));
  return (
    <NavLink
      to={to}
      end={end}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${active ? 'bg-secondary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
    >
      <Icon className="size-4" /> {label}
    </NavLink>
  );
}

function TopBar({ overMesh = false }: { overMesh?: boolean }) {
  const { role } = useDemo();
  return (
    <header
      className={`sticky top-0 z-20 shrink-0 pt-[env(safe-area-inset-top)] print:hidden ${overMesh ? '' : 'border-b border-border bg-background/90 backdrop-blur'}`}
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4">
        <Link to={`/demo/${role}`} className="flex items-center gap-2.5" aria-label="Quick Correction">
          <LogoMark className="size-8" />
          <Wordmark className="text-[17px]" />
        </Link>
        <nav aria-label="Sections" className="mx-auto hidden items-center gap-1 lg:flex">
          {NAV[role].map((item) => <TopTab key={item.to} {...item} />)}
        </nav>
        <span className="ml-auto lg:ml-0"><SettingsSheet /></span>
      </div>
    </header>
  );
}

function BottomTab({ to, label, icon: Icon, end }: Item) {
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
      {label}
    </NavLink>
  );
}

/** Phone navigation: the role's four sections. */
function BottomNav() {
  const { role } = useDemo();
  return (
    <nav
      aria-label="Sections"
      className="qc-tabbar fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur print:hidden lg:hidden"
    >
      {NAV[role].map((item) => <BottomTab key={item.to} {...item} />)}
    </nav>
  );
}

/** Keep the stored role in step with the URL when someone deep-links. */
function RoleFromUrl() {
  const { pathname } = useLocation();
  const { role, setRole } = useDemo();
  React.useEffect(() => {
    const seg = pathname.split('/')[2] as Role | undefined;
    if (seg && ROLES.some((r) => r.role === seg) && seg !== role) setRole(seg);
  }, [pathname, role, setRole]);
  return null;
}

function Frame() {
  const { pathname } = useLocation();
  React.useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  const path = pathname.replace(/\/$/, '');

  if (path === '/demo') return <Outlet />;

  // Each role's assistant is a full-height chat between the two bars.
  if (path === '/demo/school' || path === '/demo/parent') {
    return (
      <>
        <RoleFromUrl />
        <div className="mm-mesh flex h-dvh flex-col">
          <TopBar overMesh />
          <div className="min-h-0 flex-1">
            <Outlet />
          </div>
        </div>
        <BottomNav />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <RoleFromUrl />
      <TopBar />
      <main className="mx-auto w-full max-w-6xl p-4 pb-24 md:p-6 md:pb-24 lg:pb-8 print:p-0">
        <Outlet />
      </main>
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
