/**
 * Layout for the signed-in teacher's own screens (/teacher/*). The guard lives
 * in the layout, so every page added under features/teacher inherits it.
 */
import { TeacherLayoutRoute } from '@/features/teacher/components/TeacherShell';
import type { LayoutEntry } from './layouts';

export const entries: LayoutEntry[] = [
  { match: (p) => p === '/teacher' || p.startsWith('/teacher/'), Layout: TeacherLayoutRoute, order: 120 },
];
