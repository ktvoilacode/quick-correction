/**
 * Layout for the signed-in parent's own screens (/parent/*). The guard lives
 * in the layout, so every page added under features/parent inherits it.
 */
import { ParentLayoutRoute } from '@/features/parent/components/ParentShell';
import type { LayoutEntry } from './layouts';

export const entries: LayoutEntry[] = [
  { match: (p) => p === '/parent' || p.startsWith('/parent/'), Layout: ParentLayoutRoute, order: 125 },
];
