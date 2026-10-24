/**
 * Welcome Feature Routes - Express endpoints with AppKit integration
 * @module bloomneo/welcome-routes
 * @file bloomneo/src/api/features/{featureName}/{featureName}.route.ts
 *
 * @llm-rule WHEN: Need HTTP endpoints for welcome feature with error handling
 * @llm-rule AVOID: Adding routes without asyncRoute wrapper - breaks error handling
 * @llm-rule NOTE: Auto-discovered by api-router.ts using FBCA pattern, exports default Express router
 */

import express from 'express';
import { errorClass } from '@bloomneo/appkit/error';
import { welcomeService } from './welcome.service.js';

const router = express.Router();
const error = errorClass.get();

/*
 * ── On logging inside a route ─────────────────────────────────────────────
 *
 * These handlers used to open with a line announcing that the request had
 * arrived. Two reasons that is gone, and both generalise to any feature you
 * add:
 *
 *   It was already logged. server.ts records every request on completion,
 *   with the real path, the status and the duration. An arrival line is the
 *   same event told worse — it cannot know how the request ended.
 *
 *   It named the route "/api/{featureName}". That is the scaffold's own
 *   placeholder, left in a runtime string, so the log confidently reported an
 *   endpoint that does not exist. A log that lies is worse than a log that is
 *   quiet, and worst of all for a reader — human or agent — trying to work out
 *   which route actually ran.
 *
 * Log decisions and failures. Narration is the request line's job.
 */

// GET /api/welcome — replies "hello"
router.get('/', error.asyncRoute(async (_req, res) => {
  const result = await welcomeService.getHello();
  res.json(result);
}));

// GET /api/welcome/:name — replies "hello :name"
router.get('/:name', error.asyncRoute(async (req, res) => {
  const name = req.params.name;
  const result = await welcomeService.getHelloWithName(name);
  res.json(result);
}));

/**
 * Deliberately public: this is the scaffold's demo endpoint, and a new
 * project should be able to curl it before any user exists.
 */
export const isPublic = true;

export default router;