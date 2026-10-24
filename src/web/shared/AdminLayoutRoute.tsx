/**
 * AdminLayoutRoute — the console routes, in the shared application shell.
 *
 * There is no separate admin chrome. Both /dashboard and /admin render inside
 * the SAME <Shell>, with one sidebar listing every destination the signed-in
 * person can reach; the admin entries simply sit under an "Admin" heading and
 * are hidden from anyone without the role.
 *
 * Two shells was the arrangement inherited from the old templates, where
 * `userapp` and `adminapp` shipped as separate applications and each needed
 * its own chrome. Composed into one app that split stops paying for itself:
 * it produced two sidebars, two "Users" pages against one endpoint, and a
 * switch the user had to learn.
 *
 * What differs between the two areas is not the chrome — it is the GUARD, and
 * that is the whole of this file.
 */
import { Shell } from './DashboardLayoutRoute';
import { AuthGuard } from '@/features/auth/components';

/*
 * The console is gated HERE, not per page.
 *
 * `requiredRoles` uses AuthGuard's `role.level` form, and this list is the
 * same one the API enforces on /api/user/admin/* and /api/admin/*. Both sides
 * check: the client gate is so an unauthorised person sees a clean refusal
 * instead of a shell full of failing requests, and the server gate is the one
 * that actually protects the data — a client check is a courtesy, never a
 * control.
 *
 * Because the gate wraps the shell, a page added under features/admin/pages
 * later inherits it. There is nothing to remember and nothing to forget.
 */
const ADMIN_ROLES = ['admin.tenant', 'admin.org', 'admin.system'];

export function AdminLayoutRoute() {
  return (
    <AuthGuard requiredRoles={ADMIN_ROLES}>
      <Shell />
    </AuthGuard>
  );
}
