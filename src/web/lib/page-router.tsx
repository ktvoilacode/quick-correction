/**
 * Page Router
 *
 * Auto-discovers routes using Vite glob imports and file-based conventions.
 *
 * v1.5.2 production-reliability fixes (originally drafted in 1.5.1 but
 * accidentally landed in @bloomneo/uikit's template instead of bloom's,
 * see CHANGELOG):
 *   • Code-splitting per route via React.lazy + Suspense (was eager).
 *     Pass <PageRouter eager /> to opt back into the eager behavior.
 *   • Default branded 404 page that uses theme tokens. The old debug
 *     message LEAKED THE FULL ROUTE MAP to end users — gone.
 *   • Default error boundary so a single page throwing no longer
 *     white-screens the whole app. Override with errorBoundary prop.
 *
 * Override props:
 *   <PageRouter
 *     notFound={<Custom404 />}             // override default 404
 *     errorBoundary={<CustomError />}      // override default error UI
 *     onError={(err, info) => report(err)} // hook into errors
 *     fallback={<MySpinner />}             // override lazy loading fallback
 *     eager                                // disable code splitting
 *   />
 */

import React, { Component, Suspense, useEffect, useMemo, type ComponentType, type ErrorInfo, type ReactNode } from 'react';
import { Outlet, Routes, Route, useLocation } from 'react-router-dom';

/* -------------------------------------------------------------------------- */
/* Route discovery                                                            */
/* -------------------------------------------------------------------------- */

// `_`-prefixed files (and anything under a `_`-prefixed directory) are private
// co-located components, never routes. Excluding them from the glob keeps them
// out of the route-split bundle as dynamic imports — their consumers import
// them statically — and stops the dormant junk routes the pattern would
// otherwise create for every helper beside a page.
//
// NOTE: import.meta.glob needs a literal argument, so the pattern is inlined.
// The pathSegments `_` check in pathFromFile() is the matching runtime guard.
const lazyPageFiles = import.meta.glob([
  '../features/*/pages/**/*.{tsx,jsx}',
  '!**/_*.{tsx,jsx}',
  '!**/_*/**',
]);

type LoadedModule = { default: React.ComponentType<unknown> };

interface DiscoveredRoute {
  path: string;
  component: React.ComponentType<unknown>;
}

/**
 * Per-feature route base overrides.
 *
 * By default a feature's folder name IS its URL prefix, which forces every
 * page that needs a top-level URL into `main/`. One production app ended up
 * with 120 of its 164 pages in that single folder — the convention that
 * promised feature isolation produced one mega-feature instead.
 *
 * Declare an override here and a feature can own any prefix, including '/':
 *
 *   const ROUTE_BASE: Record<string, string> = {
 *     students: '/',        // features/students/pages/index.tsx  →  /students... no: →  /
 *     billing:  '/account', // features/billing/pages/plan.tsx    →  /account/plan
 *   };
 *
 * `main` defaults to '/' exactly as before, so existing apps are unaffected.
 */
const ROUTE_BASE: Record<string, string> = {
  main: '/',
};

function pathFromFile(filePath: string): string | null {
  const match = filePath.match(/\.\.\/features\/([^/]+)\/pages\/(.+)\.tsx?$/);
  if (!match) return null;

  const [, feature, nestedPath] = match;
  const pathSegments = nestedPath.split('/');

  // Co-location convention: any file or folder starting with `_` is a private
  // helper, not a route (e.g. panels/_shared.tsx). The glob above already
  // filters these; this is the runtime guard that keeps them out if the glob
  // pattern is ever loosened.
  if (pathSegments.some((seg) => seg.startsWith('_'))) return null;

  const segmentToRoute = (segment: string) => {
    if (segment.startsWith('[...') && segment.endsWith(']')) return '*';
    if (segment.startsWith('[') && segment.endsWith(']')) return ':' + segment.slice(1, -1);
    return segment;
  };

  const base = ROUTE_BASE[feature];
  if (base !== undefined) {
    const prefix = base === '/' ? '' : base.replace(/\/$/, '');
    if (pathSegments.length === 1 && pathSegments[0] === 'index') return prefix || '/';
    const rest = pathSegments
      .map((seg) => (seg === 'index' ? '' : seg.toLowerCase()))
      .filter(Boolean)
      .map(segmentToRoute)
      .join('/');
    return `${prefix}/${rest}`.replace(/\/{2,}/g, '/') || '/';
  }

  if (feature === 'main') {
    if (pathSegments.length === 1 && pathSegments[0] === 'index') return '/';
    return '/' + pathSegments
      .map(s => s === 'index' ? '' : s.toLowerCase())
      .filter(Boolean)
      .map(segmentToRoute)
      .join('/');
  }

  const nestedRoute = pathSegments
    .map(s => s === 'index' ? '' : s.toLowerCase())
    .filter(Boolean)
    .map(segmentToRoute)
    .join('/');

  if (pathSegments.length === 1 && pathSegments[0] === 'index') return `/${feature}`;
  return `/${feature}${nestedRoute ? '/' + nestedRoute : ''}`;
}

function sortRoutes(routes: DiscoveredRoute[]): DiscoveredRoute[] {
  return routes.sort((a, b) => {
    if (a.path === '/') return 1;
    if (b.path === '/') return -1;
    return b.path.length - a.path.length;
  });
}

function generateLazyRoutes(): DiscoveredRoute[] {
  const routes: DiscoveredRoute[] = [];
  Object.entries(lazyPageFiles).forEach(([filePath, importer]) => {
    const path = pathFromFile(filePath);
    if (!path) return;
    routes.push({
      path,
      component: React.lazy(importer as () => Promise<LoadedModule>),
    });
  });
  return sortRoutes(routes);
}

/* -------------------------------------------------------------------------- */
/* Default 404                                                                */
/* -------------------------------------------------------------------------- */

const DefaultNotFound: React.FC = () => (
  <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
    <p className="text-sm font-medium text-muted-foreground">404</p>
    <h1 className="text-3xl font-semibold tracking-tight text-foreground">Page not found</h1>
    <p className="max-w-md text-sm text-muted-foreground">
      The page you're looking for doesn't exist or has moved.
    </p>
    <a
      href="/"
      className="mt-2 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      Back to home
    </a>
  </div>
);

/* -------------------------------------------------------------------------- */
/* Default error boundary                                                     */
/* -------------------------------------------------------------------------- */

interface ErrorBoundaryProps {
  fallback: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class RouteErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[PageRouter] Page threw:', error, info);
    }
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

const DefaultErrorElement: React.FC = () => (
  <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
    <p className="text-sm font-medium text-destructive">Something went wrong</p>
    <h1 className="text-3xl font-semibold tracking-tight text-foreground">An error occurred</h1>
    <p className="max-w-md text-sm text-muted-foreground">
      Please refresh the page. If the problem persists, contact support.
    </p>
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="mt-2 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      Reload page
    </button>
  </div>
);

const DefaultLazyFallback: React.FC = () => (
  <div className="flex min-h-[30vh] items-center justify-center" aria-label="Loading">
    <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
  </div>
);

/* -------------------------------------------------------------------------- */
/* ScrollToTop                                                                */
/* -------------------------------------------------------------------------- */

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

/* -------------------------------------------------------------------------- */
/* PageRouter                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * A layout group — pages whose path matches `match` render inside
 * `Layout`. The layout is mounted once and stays mounted as the user
 * navigates between matching routes; only the `<Outlet />` inside the
 * layout swaps. This eliminates the "header flashes on every navigation"
 * problem that comes from each page wrapping itself in a shell.
 *
 * Layouts are evaluated in array order; the FIRST match wins. Keep
 * more-specific matchers (e.g. `/admin`) before broader ones (e.g. `/`).
 *
 * The layout itself MUST render <Outlet /> somewhere inside its chrome
 * (commonly wrapped in a local <Suspense> so lazy chunk loads only
 * swap the content area, not the whole page).
 */
export interface RouteLayout {
  /** Which discovered paths belong to this layout. */
  match: (path: string) => boolean;
  /** Component that renders <Outlet /> for matching child routes. */
  Layout: ComponentType;
}

export interface PageRouterProps {
  /** Custom 404 element. Defaults to a branded theme-aware 404 page. */
  notFound?: ReactNode;
  /** Custom error boundary fallback element. */
  errorBoundary?: ReactNode;
  /** Called when any page throws. Useful for Sentry / observability. */
  onError?: (error: Error, info: ErrorInfo) => void;
  /** Loading fallback shown while a lazy route chunk is fetched.
   *  Only used for routes that don't belong to a layout group — a layout
   *  is expected to manage its own Suspense boundary around <Outlet />. */
  fallback?: ReactNode;
  /**
   * Retained for API compatibility; code splitting is now always on.
   * True eager loading meant a second `{ eager: true }` glob that statically
   * imported EVERY page, forcing all routes into the entry chunk and defeating
   * the React.lazy splitting below — a multi-MB first load on every page.
   * @deprecated no longer has any effect
   */
  eager?: boolean;
  /** Layout groups. Pages whose path matches a layout's `match` render
   *  as nested routes inside that layout, sharing its chrome across
   *  navigations. Non-matching pages render bare. */
  layouts?: RouteLayout[];
}

export const PageRouter: React.FC<PageRouterProps> = ({
  notFound,
  errorBoundary,
  onError,
  fallback,
  eager: _eager = false,   // accepted for API compatibility; no longer used
  layouts = [],
}) => {
  // Memoize so routes aren't regenerated on every render. The discovered set
  // is static (it's resolved at build time by Vite's glob), so empty deps are safe.
  const routes = useMemo(
    () => generateLazyRoutes(),
    []
  );

  // Dev-only one-shot log so devs can see what got discovered, without
  // re-logging on every render.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('🚀 Auto-discovered routes:', routes.map((r) => r.path));
    }
  }, [routes]);

  const errorElement = errorBoundary ?? <DefaultErrorElement />;
  const notFoundElement = notFound ?? <DefaultNotFound />;
  const lazyFallback = fallback ?? <DefaultLazyFallback />;

  // Bucket each discovered route by its layout (or "bare" for pages with
  // no matching layout). First-match wins so callers can put the most
  // specific matcher first.
  const { grouped, bare } = useMemo(() => {
    const bucketed = new Map<RouteLayout, DiscoveredRoute[]>();
    const unlayered: DiscoveredRoute[] = [];
    for (const route of routes) {
      const layout = layouts.find((l) => l.match(route.path));
      if (layout) {
        const list = bucketed.get(layout) ?? [];
        list.push(route);
        bucketed.set(layout, list);
      } else {
        unlayered.push(route);
      }
    }
    return { grouped: bucketed, bare: unlayered };
  }, [routes, layouts]);

  return (
    <RouteErrorBoundary fallback={errorElement} onError={onError}>
      <ScrollToTop />
      <Routes>
        {/* Grouped routes — each layout renders <Outlet /> for its
            children; the layout is expected to own its own Suspense
            boundary (see e.g. AdminShell + MarketingLayout). The
            layout stays mounted while child routes swap. */}
        {Array.from(grouped.entries()).map(([layout, layoutRoutes], i) => (
          <Route key={`layout-${i}`} element={<layout.Layout />}>
            {layoutRoutes.map(({ path, component: Component }) => (
              // Every page is React.lazy, so each needs a Suspense boundary
              // above it. This used to be left to the layout ("the layout is
              // expected to own its own Suspense"), and when a layout omitted
              // one the page suspended with no boundary in the tree: React
              // committed nothing and the app rendered a blank white screen
              // with no error in the console. A convention that fails silently
              // is not a convention — so the router guarantees it here. A
              // layout that already has its own Suspense still works; nesting
              // boundaries is harmless.
              <Route
                key={path}
                path={path}
                element={
                  <Suspense fallback={lazyFallback}>
                    <Component />
                  </Suspense>
                }
              />
            ))}
          </Route>
        ))}
        {/* Bare routes — no shared layout. Kept inside one Suspense
            so lazy loads work. */}
        {bare.length > 0 && (
          <Route
            element={
              <Suspense fallback={lazyFallback}>
                <BareOutlet />
              </Suspense>
            }
          >
            {bare.map(({ path, component: Component }) => (
              <Route key={path} path={path} element={<Component />} />
            ))}
          </Route>
        )}
        <Route path="*" element={notFoundElement} />
      </Routes>
    </RouteErrorBoundary>
  );
};

// Tiny wrapper so the bare-routes Suspense boundary can render
// <Outlet /> declaratively in the Routes tree above.
function BareOutlet() {
  return <Outlet />;
}
