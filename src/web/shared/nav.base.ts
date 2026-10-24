/**
 * Navigation contributed by the AUTH layer.
 *
 * ── Why a registry rather than one list ───────────────────────────────────
 * Every layer that adds signed-in pages also needs to add sidebar entries for
 * them. The obvious approach — one NAV array in the shell — means each new
 * layer must edit the shell, and a layer cannot edit a file it does not own
 * without shipping a whole copy of it. That is how this codebase briefly ended
 * up with two 340-line copies of the same shell kept in sync by hand.
 *
 * Instead each layer drops a `nav.<layer>.ts` here exporting its own items.
 * AppShell globs them at BUILD time and merges. Adding a layer is adding one
 * small file; the shell is never touched and cannot drift.
 */
import { LayoutDashboard, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Exact-match the route. Needed for index routes like /dashboard. */
  end?: boolean;
  /** Hide from anyone without this role. Presentation only — see AppShell. */
  role?: string;
  /** Starts a labelled group above this item. */
  section?: string;
  /** Ascending. Leave gaps so a later layer can slot between without renumbering. */
  order?: number;
};

export const items: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true, order: 10 },
  { to: '/dashboard/profile', label: 'Profile', icon: User, order: 20 },
];
