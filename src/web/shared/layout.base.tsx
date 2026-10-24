/**
 * Layouts contributed by the BASE app.
 *
 * Just the catch-all. It sits at order 1000 so every layer's more specific
 * matcher lands above it; PageRouter takes the first match, so anything after
 * a `() => true` would never be reached.
 */
import { AppLayoutRoute } from './AppLayoutRoute';
import type { LayoutEntry } from './layouts';

export const entries: LayoutEntry[] = [
  { match: () => true, Layout: AppLayoutRoute, order: 1000 },
];
