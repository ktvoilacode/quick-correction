/**
 * Layouts contributed by the ADMIN layer.
 *
 * One entry. The console reuses the auth layer's <Shell> and differs only in
 * its guard — see AdminLayoutRoute.
 *
 * order 100 puts it above /dashboard (200) purely for readability; the two
 * matchers do not overlap, so the relative order does not actually matter here.
 */
import { AdminLayoutRoute } from './AdminLayoutRoute';
import type { LayoutEntry } from './layouts';

export const entries: LayoutEntry[] = [
  { match: (p) => p === '/admin' || p.startsWith('/admin/'), Layout: AdminLayoutRoute, order: 100 },
];
