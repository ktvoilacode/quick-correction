/**
 * Paper pattern routes — /api/patterns. Admin only.
 * @file src/api/features/patterns/patterns.route.ts
 */
import express from 'express';
import { errorClass } from '@bloomneo/appkit/error';
import { authClass } from '@bloomneo/appkit/auth';
import { userIdOf } from '../../lib/qc/app-role.js';
import { patternsService } from './patterns.service.js';

const router = express.Router();
const error = errorClass.get();
const auth = authClass.get();

router.use(auth.requireLoginToken());
router.use(auth.requireUserRoles(['admin.system']));

router.get('/', error.asyncRoute(async (_req, res) => {
  res.json(await patternsService.list());
}));

router.post('/', error.asyncRoute(async (req, res) => {
  res.status(201).json({ pattern: await patternsService.create(userIdOf(req), req.body ?? {}) });
}));

router.patch('/:id', error.asyncRoute(async (req, res) => {
  res.json({ pattern: await patternsService.update(userIdOf(req), req.params.id, req.body ?? {}) });
}));

router.delete('/:id', error.asyncRoute(async (req, res) => {
  res.json(await patternsService.remove(userIdOf(req), req.params.id));
}));

export default router;
