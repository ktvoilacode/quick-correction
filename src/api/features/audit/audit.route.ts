/**
 * Audit log routes — admin-only read endpoint.
 * @file src/api/features/audit/audit.route.ts
 *
 * No write endpoint is exposed over HTTP on purpose — audit rows are
 * written in-process by `auditService.logAudit()` from other features,
 * not by external callers. Exposing a POST would let a compromised
 * client forge "admin deleted record X" events.
 *
 * @llm-rule WHEN: Powering the admin audit page
 * @llm-rule AVOID: Exposing POST /api/audit — writes are server-side only
 * @llm-rule NOTE: Auto-discovered by api-router.ts via FBCA pattern
 */

import express from 'express';
import { errorClass } from '@bloomneo/appkit/error';
import { authClass } from '@bloomneo/appkit/auth';
import { loggerClass } from '@bloomneo/appkit/logger';
import { auditService } from './audit.service.js';
import type { ListAuditFilters } from './audit.types.js';

const router = express.Router();
const error = errorClass.get();
const auth = authClass.get();
const logger = loggerClass.get('audit-routes');

/**
 * GET /api/audit/list
 *
 * Query params (all optional; see audit.types.ts → ListAuditFilters):
 *   actorId, action, entityType, entityId, from, to, limit, offset
 *
 * Response: `{ items: AuditLogEntry[], limit, offset }`.
 */
router.get(
  '/list',
  auth.requireLoginToken(),
  auth.requireUserRoles(['admin.system', 'moderator.manage']),
  error.asyncRoute(async (req, res) => {
    const filters: ListAuditFilters = {
      actorId: req.query.actorId as string | undefined,
      action: req.query.action as string | undefined,
      entityType: req.query.entityType as string | undefined,
      entityId: req.query.entityId as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    };

    logger.info('GET /api/audit/list', {
      actor: req.user?.userId,
      filters,
    });

    const items = await auditService.listAudit(filters);
    res.json({
      items,
      limit: filters.limit ?? 50,
      offset: filters.offset ?? 0,
    });
  }),
);

export default router;
