/**
 * Admin feature routes.
 * @file src/api/features/admin/admin.route.ts
 *
 * - `GET /api/admin/summary` → AdminSummary (dashboard widgets feed)
 * - `GET /api/admin/roles`   → allowed role:level pairs (from env)
 *
 * No writes here — user CRUD lives under /api/user (admin-scoped
 * endpoints there), audit under /api/audit, settings under /api/settings.
 * This feature is the aggregate/meta layer that ties them together for
 * the admin UI.
 *
 * @llm-rule WHEN: Wiring dashboard aggregates or role-picker UIs
 * @llm-rule AVOID: Moving user/audit/settings CRUD here — breaks FBCA separation
 */

import express from 'express';
import { errorClass } from '@bloomneo/appkit/error';
import { authClass } from '@bloomneo/appkit/auth';
import { loggerClass } from '@bloomneo/appkit/logger';
import { adminService } from './admin.service.js';
import { getAllowedRoles } from './admin.roles.js';

const router = express.Router();
const error = errorClass.get();
const auth = authClass.get();
const logger = loggerClass.get('admin-routes');

/**
 * GET /api/admin/summary
 * Admin + moderator. Every widget on the admin home reads from this
 * single endpoint — one network call per dashboard load.
 */
router.get(
  '/summary',
  auth.requireLoginToken(),
  auth.requireUserRoles(['admin.system', 'moderator.manage']),
  error.asyncRoute(async (req, res) => {
    logger.info('GET /api/admin/summary', { actor: req.user?.userId });
    const summary = await adminService.getSummary();
    res.json(summary);
  }),
);

/**
 * GET /api/admin/roles
 * Admin only. Returns the parsed allow-list from ADMIN_USER_ROLES. The
 * user-edit page reads this to build its role dropdown.
 */
router.get(
  '/roles',
  auth.requireLoginToken(),
  auth.requireUserRoles(['admin.system']),
  error.asyncRoute(async (_req, res) => {
    res.json({ items: getAllowedRoles() });
  }),
);

export default router;
