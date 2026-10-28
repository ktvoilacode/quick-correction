/**
 * Navigation contributed by the ADMIN layer.
 *
 * This file is the layer's ENTIRE contribution to the sidebar. It does not
 * import, wrap or copy AppShell — the shell discovers this file by glob and
 * merges it. See nav.base.ts for why.
 *
 * `role` hides these from non-admins, which is presentation only. The gates
 * that matter are AdminLayoutRoute's role check on /admin and the API's own
 * check on every /admin endpoint.
 */
import { Gauge, Users, Library, ClipboardList, FileQuestion, ScrollText, Settings } from 'lucide-react';
import type { NavItem } from './nav.base';

export const items: NavItem[] = [
  { to: '/admin', label: 'Overview', icon: Gauge, end: true, role: 'admin', order: 100 },
  { to: '/admin/library', label: 'Skill library', icon: Library, role: 'admin', order: 107 },
  { to: '/admin/patterns', label: 'Paper patterns', icon: ClipboardList, role: 'admin', order: 108 },
  { to: '/admin/questions', label: 'Question bank', icon: FileQuestion, role: 'admin', order: 109 },
  { to: '/admin/users', label: 'Users', icon: Users, role: 'admin', order: 105 },
  { to: '/admin/audit', label: 'Audit log', icon: ScrollText, role: 'admin', order: 120 },
  { to: '/admin/settings', label: 'Settings', icon: Settings, role: 'admin', order: 130 },
];
