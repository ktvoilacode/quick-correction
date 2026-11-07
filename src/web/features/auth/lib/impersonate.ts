import { config } from '../config';
import { homeFor } from './home';
import type { User } from '../types';

/** The admin's own session, parked here while they are signed in as someone else. */
export const ADMIN_BACKUP_KEY = 'qc_admin_session';

/**
 * Swap the stored session for the person's and park the admin's, then reload so
 * the auth context starts from the new session. sessionStorage, not
 * localStorage: closing the tab ends "sign in as" instead of leaving the admin
 * stuck in someone else's account.
 */
export function startImpersonation(token: string, user: User) {
  const adminToken = localStorage.getItem(config.auth.storage.token);
  const adminUser = localStorage.getItem(config.auth.storage.user);
  if (adminToken && adminUser) {
    sessionStorage.setItem(ADMIN_BACKUP_KEY, JSON.stringify({ token: adminToken, user: adminUser }));
  }
  localStorage.setItem(config.auth.storage.token, token);
  localStorage.setItem(config.auth.storage.user, JSON.stringify(user));
  window.location.assign(homeFor(user));
}

export function readImpersonation(): { name: string } | null {
  try {
    if (!sessionStorage.getItem(ADMIN_BACKUP_KEY)) return null;
    const u = JSON.parse(localStorage.getItem(config.auth.storage.user) ?? 'null');
    return { name: u?.name || u?.email || 'this person' };
  } catch {
    return null;
  }
}

export function stopImpersonation() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(ADMIN_BACKUP_KEY) ?? 'null');
    sessionStorage.removeItem(ADMIN_BACKUP_KEY);
    if (saved) {
      localStorage.setItem(config.auth.storage.token, saved.token);
      localStorage.setItem(config.auth.storage.user, saved.user);
    }
  } finally {
    window.location.assign('/admin/people');
  }
}
