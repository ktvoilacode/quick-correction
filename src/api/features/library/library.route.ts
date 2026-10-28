/**
 * Categories routes — /api/library. Admin only.
 * @file src/api/features/library/library.route.ts
 */
import express from 'express';
import { errorClass } from '@bloomneo/appkit/error';
import { authClass } from '@bloomneo/appkit/auth';
import { userIdOf } from '../../lib/qc/app-role.js';
import { libraryService } from './library.service.js';

const router = express.Router();
const error = errorClass.get();
const auth = authClass.get();

router.use(auth.requireLoginToken());
router.use(auth.requireUserRoles(['admin.system']));

router.get('/', error.asyncRoute(async (_req, res) => {
  res.json(await libraryService.tree());
}));

router.post('/', error.asyncRoute(async (req, res) => {
  res.status(201).json({ node: await libraryService.create(userIdOf(req), req.body ?? {}) });
}));

router.patch('/:id', error.asyncRoute(async (req, res) => {
  res.json({ node: await libraryService.update(userIdOf(req), req.params.id, req.body ?? {}) });
}));

router.delete('/:id', error.asyncRoute(async (req, res) => {
  res.json(await libraryService.remove(userIdOf(req), req.params.id));
}));

export default router;
