/**
 * FacultyShell — the signed-in faculty member's frame: a slim top bar. Gated
 * here: signed-out visitors go to sign-in, anyone who is not faculty goes home.
 */
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@bloomneo/uikit';
import { LogOut, Loader2 } from 'lucide-react';
import { LogoMark } from '@/shared/Logo';
import { ThemeControls } from '@/shared/ThemeControls';
import { useAuth } from '@/features/auth/hooks';
import { homeFor } from '@/features/auth/lib/home';

export function FacultyLayoutRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  if (isLoading) return <div className="grid min-h-screen place-items-center"><Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading" /></div>;
  if (!isAuthenticated) return <Navigate to="/auth/login" state={{ from: location }} replace />;
  if (user?.appRole !== 'faculty' || user.isActive === false) return <Navigate to={homeFor(user)} replace />;
  const name = user.name || user.email;
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur print:hidden">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link to="/faculty" className="flex items-center gap-2 font-semibold" aria-label="Quick Correction faculty home">
            <LogoMark className="size-7" />
            <span className="truncate">Quick Correction <span className="font-normal text-muted-foreground">· Faculty</span></span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <span className="mr-1 hidden max-w-40 truncate text-sm text-muted-foreground sm:inline">{name}</span>
            <ThemeControls />
            <Button asChild variant="ghost" size="icon" aria-label="Sign out" title="Sign out"><Link to="/auth/logout"><LogOut className="size-4" /></Link></Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 print:max-w-none print:p-0"><Outlet /></main>
    </div>
  );
}
