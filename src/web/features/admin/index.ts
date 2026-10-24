/**
 * @file src/web/features/admin/index.ts
 *
 * Barrel export for the admin web feature. Pages under `./pages/` are
 * auto-discovered by the PageRouter (no explicit routes needed); other
 * features import the route-level layout + the per-page header from
 * here.
 */

export { AdminPageHeader } from './components/AdminPageHeader';
