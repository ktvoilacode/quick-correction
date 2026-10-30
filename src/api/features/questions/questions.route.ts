/**
 * Question bank routes — /api/questions. Admin only.
 * @file src/api/features/questions/questions.route.ts
 */
import express from 'express';
import { errorClass } from '@bloomneo/appkit/error';
import { authClass } from '@bloomneo/appkit/auth';
import { userIdOf } from '../../lib/qc/app-role.js';
import { questionsService } from './questions.service.js';

const router = express.Router();
const error = errorClass.get();
const auth = authClass.get();

router.use(auth.requireLoginToken());
router.use(auth.requireUserRoles(['admin.system']));

router.get('/', error.asyncRoute(async (req, res) => {
  const q = req.query as Record<string, string | undefined>;
  res.json(await questionsService.list({ ...q, page: q.page ? Number(q.page) : 1 }));
}));

router.post('/', error.asyncRoute(async (req, res) => {
  res.status(201).json({ question: await questionsService.create(userIdOf(req), req.body ?? {}) });
}));

router.post('/review', error.asyncRoute(async (req, res) => {
  const { ids, status, note } = req.body ?? {};
  res.json(await questionsService.review(userIdOf(req), ids, status, note));
}));

router.patch('/:id', error.asyncRoute(async (req, res) => {
  res.json({ question: await questionsService.update(userIdOf(req), req.params.id, req.body ?? {}) });
}));

router.delete('/:id', error.asyncRoute(async (req, res) => {
  res.json(await questionsService.remove(userIdOf(req), req.params.id));
}));

export default router;
