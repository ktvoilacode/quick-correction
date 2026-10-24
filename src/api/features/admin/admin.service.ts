/**
 * Admin dashboard summary service.
 * @file src/api/features/admin/admin.service.ts
 *
 * Backing for `GET /api/admin/summary`. Every widget on the admin home
 * page reads from this single endpoint so the page makes one network
 * call, not N (one per widget). When you add a widget, add a field here
 * first, then render it in `src/web/features/admin/pages/dashboard.tsx`.
 *
 * Widgets currently shipped:
 *   - users          → total user count (isActive only)
 *   - signups        → signups in the last 30 days
 *   - activity       → most-recent 5 audit events (action + actor + time)
 *
 * Which widgets render is controlled by the ADMIN_DASHBOARD_WIDGETS env
 * var. The server still computes every widget (cheap — all indexed
 * queries) and the client decides which to show. That keeps the backend
 * free of per-deploy conditional logic.
 *
 * @llm-rule WHEN: Adding a new dashboard widget
 * @llm-rule PREFER: New field in AdminSummary + single-query aggregate
 * @llm-rule AVOID: Per-widget endpoints — N+1 network chatter
 */

import { databaseClass } from '@bloomneo/appkit/database';
import type { AuditLogEntry } from '../audit/audit.types.js';

export interface AdminSummary {
  users: {
    total: number;
    /** Breakdown by role — useful for the roles-donut widget. */
    byRole: Array<{ role: string; level: string; count: number }>;
  };
  signups: {
    /** Signups in the last 30 days. */
    last30d: number;
    /** Timeseries for a mini-chart: one row per day, last 30 days. */
    daily: Array<{ day: string; count: number }>;
  };
  activity: {
    /** Most recent audit events — drives the "Recent activity" widget. */
    recent: AuditLogEntry[];
  };
}

export const adminService = {
  async getSummary(): Promise<AdminSummary> {
    const db = await databaseClass.get();

    // 30-day cutoff used by both signups.last30d and signups.daily.
    // Local to this function so you can parameterize later without
    // plumbing it through the whole service.
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const [totalUsers, usersByRole, signupsLast30d, recentAudit] =
      await Promise.all([
        db.user.count({ where: { isActive: true } }),
        // Group-by for the roles widget. Falls back to empty if no users.
        db.user.groupBy({
          by: ['role', 'level'],
          _count: { _all: true },
          orderBy: { role: 'asc' },
        }),
        db.user.count({
          where: { isActive: true, createdAt: { gte: cutoff } },
        }),
        db.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

    // Build the daily signups series in JS — cheaper than a group-by on
    // date_trunc and avoids a raw-SQL dependency on the Postgres version.
    const daily = buildDailySignupBuckets(
      await db.user.findMany({
        where: { isActive: true, createdAt: { gte: cutoff } },
        select: { createdAt: true },
      }),
    );

    // Resolve the 5 recent-audit actorIds to names/emails so the
    // dashboard "Recent activity" widget can show human labels
    // instead of cuids. Same denormalization pattern as listAudit.
    type ActorRow = {
      id: string;
      name: string | null;
      email: string;
    };
    type RawAudit = AuditLogEntry & { actorId: string | null };
    const rawRecent = recentAudit as RawAudit[];
    const recentActorIds = Array.from(
      new Set(
        rawRecent
          .map((r) => r.actorId)
          .filter(
            (id): id is string => typeof id === 'string' && id.length > 0,
          ),
      ),
    );
    const recentActors: ActorRow[] = recentActorIds.length
      ? ((await db.user.findMany({
          where: { id: { in: recentActorIds } },
          select: { id: true, name: true, email: true },
        })) as ActorRow[])
      : [];
    const recentActorMap = new Map<string, Pick<ActorRow, 'name' | 'email'>>(
      recentActors.map((a) => [a.id, { name: a.name, email: a.email }]),
    );
    const recentEnriched: AuditLogEntry[] = rawRecent.map((row) => {
      const actor = row.actorId ? recentActorMap.get(row.actorId) : undefined;
      return {
        ...row,
        actorName: actor?.name ?? null,
        actorEmail: actor?.email ?? null,
      } as AuditLogEntry;
    });

    return {
      users: {
        total: totalUsers,
        byRole: (usersByRole as Array<{
          role: string;
          level: string;
          _count: { _all: number };
        }>).map((r) => ({
          role: r.role,
          level: r.level,
          count: r._count._all,
        })),
      },
      signups: {
        last30d: signupsLast30d,
        daily,
      },
      activity: {
        recent: recentEnriched,
      },
    };
  },
};

/**
 * Bucket an array of Dates into a "one row per day for the last 30 days"
 * series. Fills zero for days with no signups so the chart doesn't have
 * missing bars.
 */
function buildDailySignupBuckets(
  rows: Array<{ createdAt: Date }>,
): Array<{ day: string; count: number }> {
  const buckets = new Map<string, number>();

  // Prime 30 zero-entries so every day shows up in the result even if
  // there were no signups that day.
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10); // YYYY-MM-DD
    buckets.set(iso, 0);
  }

  for (const { createdAt } of rows) {
    const iso = createdAt.toISOString().slice(0, 10);
    if (buckets.has(iso)) {
      buckets.set(iso, (buckets.get(iso) ?? 0) + 1);
    }
  }

  return Array.from(buckets.entries()).map(([day, count]) => ({ day, count }));
}
