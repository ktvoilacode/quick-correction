/**
 * AppLayoutRoute — the application shell.
 *
 * This is a ROUTE, not a wrapper component, and the distinction matters:
 *
 *   <Route element={<AppLayoutRoute />}>      ← mounts once
 *     <Route path="/" element={<Home />} />   ← swaps inside <Outlet />
 *   </Route>
 *
 * Because the shell mounts once and survives navigation, anything it holds
 * survives too: scroll position, an open menu, a websocket, a data cache. A
 * wrapper component re-mounts on every route change and loses all of it.
 *
 * ── Why this file exists rather than a <PageLayout> from the library ──
 *
 * UIKit 4.0 removed its layout components. Not because they were broken —
 * because every application built on them replaced them within weeks. App
 * chrome is where product identity lives, and a generic header is the first
 * thing anyone rewrites. So the shell is yours: roughly 90 lines, all of it
 * readable, none of it fighting a library's assumptions.
 *
 * Pages render through <Outlet /> and own their own <PageHeader>. Do not add
 * a page title here — the page knows its title, the shell does not.
 *
 * ── Auth-aware version (shipped by the --auth layer) ──────────────────────
 * The header swaps its actions on session state: signed out shows Sign in and
 * Create account; signed in shows Dashboard and Sign out. `isLoading` is
 * rendered as a neutral placeholder rather than the signed-out state, so the
 * header does not flash "Sign in" at someone who is already signed in while
 * the session resolves.
 */
import * as React from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { Button, Sheet, SheetContent, SheetTrigger } from '@bloomneo/uikit';
import { Menu, LayoutDashboard, LogOut, LogIn, UserPlus } from 'lucide-react';
import { brand } from './brand';
import { ThemeControls } from './ThemeControls';
import { useAuth } from '@/features/auth/hooks';

function Logo({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 ${className}`}>
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
        {brand.shortName.charAt(0)}
      </span>
      <span className="font-semibold tracking-tight">{brand.name}</span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {brand.nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            [
              // h-8 so nav links and the icon buttons share one height —
              // otherwise their hover backgrounds sit 2px out of line.
              'inline-flex h-8 items-center rounded-md px-3 text-sm transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            ].join(' ')
          }
        >
          {item.label}
        </NavLink>
      ))}
    </>
  );
}

/** Session-dependent links. Shared by the desktop header and the slide-over. */
function AuthNav({ onNavigate }: { onNavigate?: () => void }) {
  const { isAuthenticated, isLoading, logout } = useAuth();

  // Reserve the space while the session resolves rather than rendering the
  // signed-out links and swapping them a moment later.
  if (isLoading) return <span className="h-8 w-32" aria-hidden />;

  if (isAuthenticated) {
    return (
      <>
        <Button variant="ghost" size="sm" className="h-8" asChild onClick={onNavigate}>
          <Link to="/dashboard"><LayoutDashboard className="size-4" /> Dashboard</Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => { onNavigate?.(); logout(); }}
        >
          <LogOut className="size-4" /> Sign out
        </Button>
      </>
    );
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="h-8" asChild onClick={onNavigate}>
        <Link to="/auth/login"><LogIn className="size-4" /> Sign in</Link>
      </Button>
      <Button size="sm" className="h-8" asChild onClick={onNavigate}>
        <Link to="/auth/register"><UserPlus className="size-4" /> Create account</Link>
      </Button>
    </>
  );
}

export function AppLayoutRoute() {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Logo />

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                [
                  'inline-flex h-8 items-center rounded-md px-3 text-sm transition-colors',
                  isActive
                    ? 'bg-accent font-medium text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                ].join(' ')
              }
            >
              Home
            </NavLink>
            <NavLinks />
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <div className="hidden items-center gap-1 md:flex">
              <AuthNav />
            </div>
            <ThemeControls />

            {/* The same navigation becomes a slide-over below md. One source,
                two presentations — not two hand-maintained menus. Nothing to
                show when nav is empty, so the trigger disappears with it. */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu" className="size-8 md:hidden">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <nav className="mt-8 flex flex-col gap-1" aria-label="Mobile">
                  <NavLink
                    to="/"
                    end
                    onClick={() => setMenuOpen(false)}
                    className="inline-flex h-9 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    Home
                  </NavLink>
                  <NavLinks onNavigate={() => setMenuOpen(false)} />
                  <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                    <AuthNav onNavigate={() => setMenuOpen(false)} />
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Pages render here. They return plain content and own their header. */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          {brand.footer.length > 0 && (
            <div className="mb-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <Logo />
                <p className="mt-3 max-w-xs text-sm text-muted-foreground">{brand.tagline}</p>
              </div>
              {brand.footer.map((col) => (
                <div key={col.heading}>
                  <h2 className="text-sm font-medium">{col.heading}</h2>
                  <ul className="mt-3 space-y-2">
                    {col.links.map((l) => (
                      <li key={l.label}>
                        <Link to={l.to} className="text-sm text-muted-foreground hover:text-foreground">
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} {brand.name}</span>
            <span>{brand.tagline}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
