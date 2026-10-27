/**
 * Quick Correction's two sides. An account is a 'teacher' or a 'parent'
 * (User.appRole), chosen on first sign-in. Route guards read it from the
 * database rather than the JWT, so switching takes effect immediately.
 */
import { databaseClass } from '@bloomneo/appkit/database';
import { authClass } from '@bloomneo/appkit/auth';
import { errorClass } from '@bloomneo/appkit/error';

export type AppRole = 'teacher' | 'parent';

const auth = authClass.get();
const error = errorClass.get();

/** The signed-in user's id. Use after auth.requireLoginToken(). */
export function userIdOf(req: unknown): string {
  const user = auth.getUser(req as any);
  if (!user?.userId) throw error.unauthorized('Sign in required');
  return String(user.userId);
}

/** Express middleware: only accounts with this appRole get through. */
export function requireAppRole(role: AppRole) {
  return error.asyncRoute(async (req: any, _res: any, next: any) => {
    const db = await databaseClass.get();
    const me = await db.user.findUnique({ where: { id: userIdOf(req) }, select: { appRole: true, appStatus: true, isActive: true } });
    if (me?.appRole !== role) throw error.forbidden(`This needs a ${role} account`);
    if (!me.isActive) throw error.forbidden('This account is deactivated');
    if (me.appStatus === 'pending') throw error.forbidden('Your account is waiting for admin approval');
    if (me.appStatus === 'rejected') throw error.forbidden('Your account request was not approved');
    next();
  });
}

/**
 * Set appRole the first time; refuse to silently flip an existing one.
 * Claiming 'teacher' never grants access by itself: it files a request
 * (appStatus 'pending') that an admin approves in /admin/people.
 */
export async function claimAppRole(userId: string, role: AppRole) {
  const db = await databaseClass.get();
  const me = await db.user.findUnique({ where: { id: userId }, select: { appRole: true } });
  if (me?.appRole && me.appRole !== role) throw error.conflict(`This account is already set up as a ${me.appRole}`);
  if (!me?.appRole) {
    await db.user.update({ where: { id: userId }, data: { appRole: role, appStatus: role === 'teacher' ? 'pending' : 'active' } });
  }
}
