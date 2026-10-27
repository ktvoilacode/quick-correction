/**
 * People service — the admin's view of teachers and parents.
 * @file src/api/features/people/people.service.ts
 *
 * Accounts are `User` rows; `appRole` says teacher or parent and `appStatus`
 * says whether a teacher has been approved. Everything here runs after the
 * route has checked the caller is an admin.
 */
import { randomBytes } from 'node:crypto';
import { databaseClass } from '@bloomneo/appkit/database';
import { authClass } from '@bloomneo/appkit/auth';
import { errorClass } from '@bloomneo/appkit/error';
import { auditService } from '../audit/audit.service.js';

const error = errorClass.get();
const auth = authClass.get();

export type PersonRole = 'teacher' | 'parent';
export type PersonStatus = 'active' | 'pending' | 'rejected';

const SELECT = {
  id: true, name: true, email: true, phone: true,
  appRole: true, appStatus: true, isActive: true, lastLogin: true, createdAt: true,
  _count: { select: { students: true, children: true } },
} as const;

function shape(u: any) {
  const { _count, ...rest } = u;
  return { ...rest, studentCount: _count.students, childCount: _count.children };
}

const tempPassword = () => randomBytes(9).toString('base64url') + 'Aa1!';

export const peopleService = {
  async me(userId: string) {
    const db = await databaseClass.get();
    const u = await db.user.findUnique({ where: { id: userId }, select: { appRole: true, appStatus: true, isActive: true } });
    if (!u) throw error.notFound('Account not found');
    return u;
  },

  async list(filters: { appRole?: string; status?: string; q?: string }) {
    const db = await databaseClass.get();
    const where: any = { appRole: { in: ['teacher', 'parent'] } };
    if (filters.appRole === 'teacher' || filters.appRole === 'parent') where.appRole = filters.appRole;
    if (filters.status) where.appStatus = filters.status;
    const q = filters.q?.trim();
    if (q) where.OR = [{ name: { contains: q } }, { email: { contains: q } }];

    const [rows, pending, teachers, parents] = await Promise.all([
      db.user.findMany({ where, select: SELECT, orderBy: [{ createdAt: 'desc' }] }),
      db.user.count({ where: { appRole: 'teacher', appStatus: 'pending' } }),
      db.user.count({ where: { appRole: 'teacher' } }),
      db.user.count({ where: { appRole: 'parent' } }),
    ]);
    return { people: rows.map(shape), counts: { pending, teachers, parents } };
  },

  async create(actorId: string, data: { name?: string; email?: string; phone?: string; appRole?: string; password?: string }) {
    const email = data.email?.trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw error.badRequest('A valid email is required');
    if (data.appRole !== 'teacher' && data.appRole !== 'parent') throw error.badRequest('Choose teacher or parent');
    if (data.password && data.password.length < 8) throw error.badRequest('Password must be at least 8 characters');

    const db = await databaseClass.get();
    if (await db.user.findUnique({ where: { email } })) throw error.badRequest('An account with this email already exists');

    // Shown to the admin once so they can pass it on; only the hash is stored.
    const password = data.password || tempPassword();
    const user = await db.user.create({
      data: {
        email, name: data.name?.trim() || null, phone: data.phone?.trim() || null,
        password: await auth.hashPassword(password),
        role: 'user', level: 'basic', isVerified: true, isActive: true,
        appRole: data.appRole, appStatus: 'active',
      },
      select: SELECT,
    });
    auditService.logAudit({ actorId, actorType: 'admin', action: 'people.create', entityType: 'user', entityId: user.id, newValue: { email, appRole: data.appRole } });
    return { person: shape(user), temporaryPassword: data.password ? null : password };
  },

  async setStatus(actorId: string, id: string, status: 'active' | 'rejected') {
    const db = await databaseClass.get();
    const existing = await db.user.findUnique({ where: { id }, select: { appRole: true, appStatus: true } });
    if (!existing?.appRole) throw error.notFound('Person not found');
    const user = await db.user.update({ where: { id }, data: { appStatus: status }, select: SELECT });
    auditService.logAudit({
      actorId, actorType: 'admin', action: status === 'active' ? 'people.approve' : 'people.reject',
      entityType: 'user', entityId: id, oldValue: { appStatus: existing.appStatus }, newValue: { appStatus: status },
    });
    return shape(user);
  },

  async setActive(actorId: string, id: string, isActive: boolean) {
    if (id === actorId) throw error.badRequest('You cannot deactivate your own account');
    const db = await databaseClass.get();
    const existing = await db.user.findUnique({ where: { id }, select: { appRole: true } });
    if (!existing?.appRole) throw error.notFound('Person not found');
    const user = await db.user.update({ where: { id }, data: { isActive }, select: SELECT });
    auditService.logAudit({ actorId, actorType: 'admin', action: isActive ? 'people.enable' : 'people.disable', entityType: 'user', entityId: id });
    return shape(user);
  },

  async resetPassword(actorId: string, id: string) {
    const db = await databaseClass.get();
    const existing = await db.user.findUnique({ where: { id }, select: { appRole: true } });
    if (!existing?.appRole) throw error.notFound('Person not found');
    const password = tempPassword();
    await db.user.update({ where: { id }, data: { password: await auth.hashPassword(password) } });
    auditService.logAudit({ actorId, actorType: 'admin', action: 'people.password_reset', entityType: 'user', entityId: id });
    return { temporaryPassword: password };
  },
};
