/**
 * Layout for the homepage (/) and the clickable prototype at /demo — no sign-in required.
 */
import { DemoLayoutRoute } from '@/features/demo/components/DemoShell';
import type { LayoutEntry } from './layouts';

export const entries: LayoutEntry[] = [
  { match: (p) => p === '/' || p === '/demo' || p.startsWith('/demo/'), Layout: DemoLayoutRoute, order: 150 },
];
