/**
 * Audit log types — shared between the service, the route, and (via a
 * manual copy or a zod schema if you want typed client/server shapes) the
 * admin audit page on the web side.
 *
 * The shape mirrors the AuditLog Prisma model exactly so service functions
 * can return raw Prisma results without mapping. If you extend the model
 * (e.g. add a correlationId), add the field here too and the type will
 * flow through.
 *
 * @file src/api/features/audit/audit.types.ts
 */

/**
 * What actor initiated the event. Useful for filtering the admin audit
 * page ("show only things the system did automatically").
 */
export type AuditActorType = 'user' | 'admin' | 'system';

/**
 * One audit row as stored in Postgres + returned to the admin audit page.
 * Dates are serialized ISO strings over HTTP; the route hands raw Prisma
 * Date objects to res.json() and Express takes care of the conversion.
 *
 * `actorName` / `actorEmail` are DENORMALIZED on read — the audit table
 * stores only `actorId` (no Prisma relation) so the list endpoint does a
 * single follow-up query resolving ids to display values. Both are
 * optional: a system-initiated event or a deleted user leaves them null.
 */
export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  actorType: AuditActorType;
  action: string;
  entityType: string | null;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  description: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

/**
 * Input shape for `auditService.logAudit()`. Everything except `action` is
 * optional — if you only know what happened, logging the action alone is
 * still useful. `actorType` defaults to 'user' in the service.
 */
export interface LogAuditInput {
  actorId?: string | null;
  actorType?: AuditActorType;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Filters accepted by `GET /api/audit/list`. Every field is optional and
 * combines additively (AND semantics). Empty query string returns the
 * most recent `limit` rows.
 */
export interface ListAuditFilters {
  actorId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  /** ISO date string — returns rows with createdAt >= from. */
  from?: string;
  /** ISO date string — returns rows with createdAt <= to. */
  to?: string;
  /** Default 50, max 500. */
  limit?: number;
  /** Default 0. Page via limit + offset. */
  offset?: number;
}
