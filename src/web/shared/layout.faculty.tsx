/**
 * Layout for the signed-in faculty member's screens (/faculty/*). The guard
 * lives in the layout, so every page added under features/faculty inherits it.
 */
import { FacultyLayoutRoute } from '@/features/faculty/components/FacultyShell';
import type { LayoutEntry } from './layouts';

export const entries: LayoutEntry[] = [
  { match: (p) => p === '/faculty' || p.startsWith('/faculty/'), Layout: FacultyLayoutRoute, order: 125 },
];
