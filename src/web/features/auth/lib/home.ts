import { config } from '../config';
import type { User } from '../types';

/**
 * Where an account lands after signing in. Admins go to the console; a teacher
 * still waiting for approval goes to the holding page; approved teachers go to their own
 * screens (/teacher) and parents to the parent prototype; anyone else (an account
 * that has not picked a role yet) falls back to the generic dashboard.
 */
export function homeFor(user: Pick<User, 'role' | 'appRole' | 'appStatus'> | null | undefined): string {
  if (user?.role === 'admin') return '/admin';
  if (user?.appRole === 'teacher' && user.appStatus && user.appStatus !== 'active') return '/auth/pending';
  if (user?.appRole === 'teacher') return '/teacher';
  if (user?.appRole === 'parent') return '/demo/parent';
  return config.auth.redirects.afterLogin;
}
