import { config } from '../config';
import type { User } from '../types';

/**
 * Where an account lands after signing in. Admins go to the console; teachers
 * and parents go to their own Quick Correction screens; anyone else (an account
 * that has not picked a role yet) falls back to the generic dashboard.
 */
export function homeFor(user: Pick<User, 'role' | 'appRole'> | null | undefined): string {
  if (user?.role === 'admin') return '/admin';
  if (user?.appRole === 'teacher') return '/demo/school';
  if (user?.appRole === 'parent') return '/demo/parent';
  return config.auth.redirects.afterLogin;
}
