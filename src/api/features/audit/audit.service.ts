/**
 * Audit log service — fire-and-forget write path + filtered read path.
 * @file src/api/features/audit/audit.service.ts
 *
 * Design principles (do not change without thinking hard):
 *
 * 1. `logAudit()` NEVER throws and NEVER awaits the DB on the caller's
 *    critical path. If Postgres is down, or the write is malformed, the
 *    main request flow still completes. Audit is an observability tool,
 *    not a transaction participant. The write is fired with `.catch()`
 *    so unhandled rejections don't bubble up into the server process.
 *
 * 2. If `ADMIN_ENABLE_AUDIT_LOG=false` in the env, every `logAudit()`
 *    call is a no-op. Useful for local dev / unit tests where you don't
 *    want a second DB write for every mutation.
 *
 * 3. The read path (`listAudit`) IS allowed to throw — it's driven by an
 *    admin page which needs to surface errors to the operator.
 *
 * TODO: When the log table gets large, add a scheduled purge (e.g. keep
 * the last 90 days) via a separate cron feature. The `@@index([createdAt])`
 * in the schema is there for that query.
 *
 * @see ../../../../docs/admin-patterns.md §6 auditing mutations
 * @see https://dev.bloomneo.com/adminapp/audit
 *
 * @llm-rule WHEN: Any admin mutation (user/setting/role change, login events) needs an audit trail
 * @llm-rule AVOID: `await auditService.logAudit(...)` — defeats the fire-and-forget guarantee; if Postgres hiccups the caller's request fails too
 * @llm-rule AVOID: Passing secrets (passwords, API keys, tokens) in `oldValue`/`newValue` — the service does no sanitization. Redact at the call site
 * @llm-rule NOTE: Action strings follow `<feature>.<verb>` convention (user.create, auth.login.failure) so the audit page filter stays predictable
 */

import { databaseClass } from '@bloomneo/appkit/database';
import { loggerClass } from '@bloomneo/appkit/logger';
import type {
  AuditLogEntry,
  ListAuditFilters,
  LogAuditInput,
} from './audit.types.js';

const logger = loggerClass.get('audit-service');

/**
 * Master switch — flip with ADMIN_ENABLE_AUDIT_LOG=false in .env.
 * Read lazily so tests can mutate process.env without requiring a
 * module re-import.
 */
function isAuditEnabled(): boolean {
  // Default to enabled — audit is cheap and valuable.
  const raw = process.env.ADMIN_ENABLE_AUDIT_LOG;
  if (raw === undefined) return true;
  return raw.toLowerCase() !== 'false';
}

/**
 * Fire-and-forget audit write.
 *
 * Call this from any mutation you want tracked (user.create, settings.update,
 * login.failure, etc.). Never await the result. Never rely on the write
 * having happened before you return a response.
 *
 * Return value is `void` on purpose — callers that accidentally `await` it
 * still complete without error, but they also can't branch on success.
 *
 * @example
 *   // Inside a route handler, after a successful mutation:
 *   auditService.logAudit({
 *     actorId: req.user.userId,
 *     actorType: 'admin',
 *     action: 'settings.update',
 *     entityType: 'setting',
 *     entityId: key,
 *     oldValue: { value: previous.value },
 *     newValue: { value: nextValue },
 *     ipAddress: req.ip,
 *   });
 */
export const auditService = {
  logAudit(input: LogAuditInput): void {
    if (!isAuditEnabled()) return;

    // Mutations to process.env are the only external side effect we read
    // eagerly — everything else is deferred into the promise below.
    Promise.resolve()
      .then(async () => {
        const db = await databaseClass.get();
        await db.auditLog.create({
          data: {
            actorId: input.actorId ?? null,
            actorType: input.actorType ?? 'user',
            action: input.action,
            entityType: input.entityType ?? null,
            entityId: input.entityId ?? null,
            oldValue: input.oldValue ?? null,
            newValue: input.newValue ?? null,
            description: input.description ?? null,
            ipAddress: input.ipAddress ?? null,
            userAgent: input.userAgent ?? null,
          },
        });
      })
      .catch((err) => {
        // Swallow — but log at warn level so the operator sees it.
        // Throwing here would be a footgun (callers expect fire-and-forget).
        logger.warn('audit log write failed (non-fatal)', {
          error: err instanceof Error ? err.message : String(err),
          action: input.action,
        });
      });
  },

  /**
   * Read + filter audit rows. Powers `GET /api/audit/list` (admin-only).
   * Filters combine with AND semantics; missing filters are not applied.
   *
   * TODO: Add a `moderator.manage` scoping rule here if you want some
   * actions (e.g. billing.*) hidden from moderators. The rrdplanners
   * reference filtered by `action NOT IN (financial.*)` at this layer.
   */
  async listAudit(filters: ListAuditFilters): Promise<AuditLogEntry[]> {
    const db = await databaseClass.get();

    const where: Record<string, unknown> = {};
    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.from || filters.to) {
      where.createdAt = {
        ...(filters.from ? { gte: new Date(filters.from) } : {}),
        ...(filters.to ? { lte: new Date(filters.to) } : {}),
      };
    }

    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 500);
    const offset = Math.max(filters.offset ?? 0, 0);

    const rows = await db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Denormalize actor → {name, email}. The schema intentionally has no
    // Prisma relation on AuditLog.actorId (audit rows must survive even
    // if the user is later deleted), so we resolve here with one extra
    // query. Cheap: `users` is indexed on id, and the set of unique
    // actorIds in a page of 50 is small.
    type ActorRow = {
      id: string;
      name: string | null;
      email: string;
    };
    type AuditRow = AuditLogEntry & { actorId: string | null };

    const auditRows = rows as AuditRow[];

    const actorIds = Array.from(
      new Set(
        auditRows
          .map((r) => r.actorId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    );

    const actors: ActorRow[] = actorIds.length
      ? ((await db.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true, email: true },
        })) as ActorRow[])
      : [];

    const actorMap = new Map<string, Pick<ActorRow, 'name' | 'email'>>(
      actors.map((a) => [a.id, { name: a.name, email: a.email }]),
    );

    return auditRows.map((row) => {
      const actor = row.actorId ? actorMap.get(row.actorId) : undefined;
      return {
        ...row,
        actorName: actor?.name ?? null,
        actorEmail: actor?.email ?? null,
      } as AuditLogEntry;
    });
  },
};
