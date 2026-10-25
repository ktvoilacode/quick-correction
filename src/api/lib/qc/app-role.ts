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
    const me = await db.user.findUnique({ where: { id: userIdOf(req) }, select: { appRole: true } });
    if (me?.appRole !== role) throw error.forbidden(`This needs a ${role} account`);
    next();
  });
}

/** Set appRole the first time; refuse to silently flip an existing one. */
export async function claimAppRole(userId: string, role: AppRole) {
  const db = await databaseClass.get();
  const me = await db.user.findUnique({ where: { id: userId }, select: { appRole: true } });
  if (me?.appRole && me.appRole !== role) throw error.conflict(`This account is already set up as a ${me.appRole}`);
  if (!me?.appRole) await db.user.update({ where: { id: userId }, data: { appRole: role } });
}
