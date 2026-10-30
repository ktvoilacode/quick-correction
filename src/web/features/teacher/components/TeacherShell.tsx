/**
 * TeacherShell — the signed-in teacher's frame: a top bar on wide screens and
 * a tab bar along the bottom on phones. Gated here, so every page under
 * /teacher inherits it: signed-out visitors go to sign-in, teachers waiting
 * for approval go to the holding page, anyone else goes to their own home.
 */
import * as React from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@bloomneo/uikit';
import { Home, FileText, Users, ClipboardCheck, LogOut, Loader2 } from 'lucide-react';
import { LogoMark } from '@/shared/Logo';
import { ThemeControls } from '@/shared/ThemeControls';
import { api } from '@/shared/api';
import { useAuth } from '@/features/auth/hooks';
import { homeFor } from '@/features/auth/lib/home';

const TABS = [
  { to: '/teacher', label: 'Home', icon: Home, end: true },
  { to: '/teacher/papers', label: 'Papers', icon: FileText, end: false },
  { to: '/teacher/students', label: 'Students', icon: Users, end: false },
  { to: '/teacher/review', label: 'Review', icon: ClipboardCheck, end: false },
] as const;

function useReviewCount() {
  const [n, setN] = React.useState(0);
  const { pathname } = useLocation();
  React.useEffect(() => {
    api.get<{ submissions: unknown[] }>('/api/tutor/review').then((r) => setN(r.submissions.length)).catch(() => setN(0));
  }, [pathname]);
  return n;
}

export function TeacherLayoutRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading" /></div>;
  }
  if (!isAuthenticated) return <Navigate to="/auth/login" state={{ from: location }} replace />;
  if (user?.appRole !== 'teacher' || user.appStatus !== 'active') return <Navigate to={homeFor(user)} replace />;
  return <Shell name={user.name || user.email} />;
}

function Shell({ name }: { name: string }) {
  const review = useReviewCount();
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <Link to="/teacher" className="flex items-center gap-2 font-semibold" aria-label="Quick Correction home">
            <LogoMark className="size-7" />
            <span className="truncate">Quick Correction</span>
          </Link>
          <nav className="ml-2 hidden items-center gap-1 md:flex" aria-label="Teacher">
            {TABS.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={link}>
                <Icon className="size-4" /> {label}
                {label === 'Review' && review > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{review}</span>}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <span className="mr-1 hidden max-w-40 truncate text-sm text-muted-foreground sm:inline">{name}</span>
            <ThemeControls />
            <Button asChild variant="ghost" size="icon" aria-label="Sign out" title="Sign out">
              <Link to="/auth/logout"><LogOut className="size-4" /></Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6"><Outlet /></main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-background/95 backdrop-blur md:hidden" aria-label="Teacher">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `relative flex flex-col items-center gap-0.5 py-2 text-xs ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
            <Icon className="size-5" /> {label}
            {label === 'Review' && review > 0 && <span className="absolute right-[28%] top-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{review}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
