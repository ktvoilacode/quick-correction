/**
 * Layouts contributed by the AUTH layer.
 *
 * PageRouter derives a route from a file's location: `features/<name>/pages/x`
 * becomes `/<name>/x`, except `main`, which maps to `/`. So everything under
 * features/auth is served at `/auth/...`. Matching the whole prefix needs no
 * list to keep in sync — add `pages/sso.tsx` and it inherits this shell.
 */
import { AuthLayoutRoute } from './AuthLayoutRoute';
import { DashboardLayoutRoute } from './DashboardLayoutRoute';
import type { LayoutEntry } from './layouts';

export const entries: LayoutEntry[] = [
  // Signed-in section. The shell carries the AuthGuard, so every page under
  // /dashboard is protected by one check rather than per-file.
  { match: (p) => p === '/dashboard' || p.startsWith('/dashboard/'), Layout: DashboardLayoutRoute, order: 200 },

  // Auth pages get their own shell because they have nothing to navigate to
  // yet. Wrapping a sign-in form in the main chrome surrounds it with links
  // that bounce straight back to sign-in.
  { match: (p) => p === '/auth' || p.startsWith('/auth/'), Layout: AuthLayoutRoute, order: 210 },
];
