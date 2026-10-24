/**
 * Dashboard widget preference — which widgets to render on /admin.
 * @file src/web/features/admin/lib/dashboard-widgets.ts
 *
 * Resolution order for the active widget list:
 *   1. localStorage key `adminapp:dashboard-widgets` (user's override)
 *   2. VITE_ADMIN_DASHBOARD_WIDGETS env var (build-time default)
 *   3. Fall-back to the canonical keys: users, signups, activity
 *
 * Values are comma-separated widget keys. Unknown keys are ignored by
 * the dashboard renderer, so typing junk into the setting won't crash
 * the page.
 *
 * TODO: When you add a new widget, register its key here AND add a
 * render function in admin/pages/index.tsx. Keep this list in sync
 * with the dashboard's switch — there's no central registry yet.
 */

/** Every widget key the adminapp knows how to render. */
export const ALL_WIDGET_KEYS = ['users', 'signups', 'activity'] as const;
export type WidgetKey = (typeof ALL_WIDGET_KEYS)[number];

const STORAGE_KEY = 'adminapp:dashboard-widgets';

const ENV_DEFAULT =
  (import.meta as unknown as { env: Record<string, string> }).env
    .VITE_ADMIN_DASHBOARD_WIDGETS ?? ALL_WIDGET_KEYS.join(',');

function parse(raw: string): WidgetKey[] {
  const allowed = new Set<string>(ALL_WIDGET_KEYS);
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is WidgetKey => allowed.has(s));
}

/** Read the active widget list. Safe to call on the server (returns env). */
export function readDashboardWidgets(): WidgetKey[] {
  if (typeof window === 'undefined') return parse(ENV_DEFAULT);
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === null) return parse(ENV_DEFAULT);
  const picks = parse(stored);
  // Defensive fallback: if the user saved an empty list, show the
  // defaults rather than a blank dashboard.
  return picks.length > 0 ? picks : parse(ENV_DEFAULT);
}

/** Persist the user's widget choice. Empty list resets to defaults. */
export function writeDashboardWidgets(keys: WidgetKey[]): void {
  if (typeof window === 'undefined') return;
  if (keys.length === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, keys.join(','));
  }
  // Fire a storage event for any other open tab. `storage` events don't
  // fire in the same window, so we also dispatch a custom one the
  // dashboard listens for.
  window.dispatchEvent(new CustomEvent('adminapp:widgets-changed'));
}
