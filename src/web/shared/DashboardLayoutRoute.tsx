/**
 * DashboardLayoutRoute — the shell for everything behind sign-in.
 *
 * Sidebar owning the full height, no bar above it. That is what makes a screen
 * read as an application rather than a website with a menu.
 *
 * ── The guard lives here, not in each page ────────────────────────────────
 * <AuthGuard> wraps the <Outlet />, so every page under /dashboard is
 * protected by one check. Put it in the pages instead and each new file is a
 * chance to forget — the kind of omission nothing catches until it is public.
 *
 * Because this is a ROUTE, the shell mounts once: sidebar state and any
 * provider mounted here survive navigation between dashboard pages.
 */
import * as React from 'react';
import { NavLink, Outlet, useLocation, useMatch, Link } from 'react-router-dom';
import {
  Button, Sheet, SheetContent, SheetTrigger,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  Tooltip, TooltipTrigger, TooltipContent,
} from '@bloomneo/uikit';
import { LogOut, Menu, ChevronDown, PanelLeft } from 'lucide-react';
import { brand } from './brand';
import { ThemeControls } from './ThemeControls';
import { AuthGuard } from '@/features/auth/components';
import { useAuth } from '@/features/auth/hooks';
import type { NavItem } from './nav.base';

/*
 * Nav is COLLECTED, not declared here.
 *
 * `import.meta.glob` with `eager` is resolved by Vite at BUILD time, so this
 * is a static import list by the time it runs — no runtime lookup, and a layer
 * that is not installed contributes nothing because its file does not exist.
 *
 * Sorting by `order` keeps the sidebar stable regardless of the order the
 * bundler happens to hand back the modules, which is not guaranteed.
 */
const navModules = import.meta.glob<{ items?: NavItem[] }>('./nav.*.ts', { eager: true });

const NAV: NavItem[] = Object.keys(navModules)
  .sort()
  .flatMap((k) => navModules[k].items ?? [])
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

/*
 * Collapsed state persists per browser.
 *
 * Someone who narrows the sidebar means it — reopening it on every navigation
 * or every visit turns a preference into a chore. Read lazily inside useState
 * so this touches localStorage once per mount rather than once per render, and
 * guard `window` so the module stays importable if this is ever pre-rendered.
 */
const COLLAPSE_KEY = 'sidebar:collapsed';

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(COLLAPSE_KEY) === '1';
  });

  const toggle = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        // Private mode / storage disabled — the toggle still works for this
        // session, it just will not be remembered. Not worth surfacing.
      }
      return next;
    });
  }, []);

  return { collapsed, toggle };
}

/**
 * h-14 matches the main header exactly, so the divider under the logo
 * continues the one under the topbar as a single unbroken line. This was
 * `py-4`, which made the block 65px against the header's 56px — a 9px step
 * visible all the way down the screen.
 */
function SidebarBrand({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link
      to="/dashboard"
      className={[
        'flex h-14 items-center border-b border-sidebar-border',
        collapsed ? 'justify-center px-0' : 'gap-2.5 px-4',
      ].join(' ')}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
        {brand.shortName.charAt(0)}
      </span>
      {!collapsed && (
        <span className="truncate font-semibold tracking-tight text-sidebar-foreground">
          {brand.name}
        </span>
      )}
    </Link>
  );
}

/**
 * One row of the sidebar.
 *
 * When collapsed the label is removed from the DOM rather than hidden with
 * CSS, so it cannot be read out twice — the Tooltip carries the accessible
 * name instead. `title` is deliberately not used: it duplicates the tooltip
 * and appears after a browser-controlled delay nobody can style.
 *
 * ── Why className is a string, never NavLink's ({ isActive }) => … form ──
 * Collapsed, this row is wrapped in <TooltipTrigger asChild>, and Radix's Slot
 * merges props by CONCATENATING className values. A function does not survive
 * that: it is stringified, so the anchor renders
 *   class="({ isActive })=>[ 'flex items-center …"
 * and not one class matches. The row loses `flex`, the icon sits flush-left,
 * and every collapsed icon is 12px off the rail's centre.
 *
 * Nothing throws and nothing type-errors — the failure is purely visual, and
 * only in the collapsed state, which is why it survived so long. useMatch gives
 * the same active flag without handing a function to Slot.
 */
function NavRow({
  to, label, icon: Icon, end, collapsed, onNavigate,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const isActive = Boolean(useMatch({ path: to, end: end ?? false }));

  const row = (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      aria-label={collapsed ? label : undefined}
      className={[
        'flex items-center rounded-md py-2 text-sm transition-colors',
        collapsed ? 'w-full justify-center px-0' : 'gap-3 px-3',
        isActive
          ? 'bg-sidebar-primary font-medium text-sidebar-primary-foreground'
          : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      ].join(' ')}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && label}
    </NavLink>
  );

  if (!collapsed) return row;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{row}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function SidebarNav({
  collapsed, onNavigate,
}: { collapsed?: boolean; onNavigate?: () => void }) {
  const { logout, user } = useAuth();
  const visible = NAV.filter((item) => !item.role || item.role === user?.role);

  const signOut = (
    <button
      onClick={() => logout()}
      aria-label={collapsed ? 'Sign out' : undefined}
      className={[
        'flex w-full cursor-pointer items-center rounded-md py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        collapsed ? 'justify-center px-0' : 'gap-3 px-3',
      ].join(' ')}
    >
      <LogOut className="size-4 shrink-0" />
      {!collapsed && 'Sign out'}
    </button>
  );

  return (
    <div className="flex h-[calc(100%-3.5rem)] flex-col">
      <nav className="flex flex-col gap-1 p-3" aria-label="Dashboard">
        {visible.map(({ to, label, icon: Icon, end, section }) => (
          <React.Fragment key={to}>
            {section && !collapsed && (
              <span className="mt-4 px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/45">
                {section}
              </span>
            )}
            {/* Collapsed, the heading becomes a hairline: the grouping stays
                legible without a label there is no room for. */}
            {section && collapsed && (
              <span aria-hidden className="mx-2 mt-3 mb-1 border-t border-sidebar-border" />
            )}
            <NavRow
              to={to}
              label={label}
              icon={Icon}
              end={end}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          </React.Fragment>
        ))}
      </nav>

      {/* Sign out sits at the bottom, away from navigation — it is a different
          kind of action and should not be one slip from "Users". */}
      <div className="mt-auto border-t border-sidebar-border p-3">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>{signOut}</TooltipTrigger>
            <TooltipContent side="right">Sign out</TooltipContent>
          </Tooltip>
        ) : (
          signOut
        )}
      </div>
    </div>
  );
}

export function Shell() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { collapsed, toggle } = useSidebarCollapsed();

  // The shell persists across navigation, so this would otherwise stay open
  // behind the new page.
  React.useEffect(() => setMobileOpen(false), [pathname]);

  const initials = (user?.name ?? user?.email ?? 'U').slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/*
        * Width is the only thing that changes on collapse, and it transitions —
        * an instant jump reads as a layout bug rather than a deliberate move.
        * The main column is flex-1, so it reflows on its own with no second
        * measurement and nothing to keep in sync.
        */}
      <aside
        className={[
          'hidden shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out lg:block',
          collapsed ? 'w-16' : 'w-60',
        ].join(' ')}
      >
        <div className="sticky top-0 h-screen">
          <SidebarBrand collapsed={collapsed} />
          <SidebarNav collapsed={collapsed} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur">
          {/* Below lg the sidebar is a Sheet, so the same corner carries the
              hamburger. Only one of these two is ever visible. */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation" className="size-8 lg:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-0">
              {/* Never collapsed: on a phone the sidebar is already a modal
                  the user opened on purpose, and a rail of unlabelled icons
                  would be strictly worse than the list they asked for. */}
              <SidebarBrand />
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-pressed={collapsed}
                className="hidden size-8 lg:inline-flex"
              >
                <PanelLeft className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</TooltipContent>
          </Tooltip>

          <div className="ml-auto flex items-center gap-1.5">
            <ThemeControls />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 gap-2 pl-1.5">
                  <span className="grid size-6 place-items-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground">
                    {initials}
                  </span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                  {user?.email ?? 'Signed in'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/dashboard/profile">Profile</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/">Back to site</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function DashboardLayoutRoute() {
  // One guard for every page in the section.
  return (
    <AuthGuard>
      <Shell />
    </AuthGuard>
  );
}
