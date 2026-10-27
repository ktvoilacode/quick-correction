/**
 * People routes — /api/people. Admin management of teacher and parent
 * accounts. Only /me is open to any signed-in account (the "waiting for
 * approval" screen polls it).
 * @file src/api/features/people/people.route.ts
 */
import express from 'express';
import { errorClass } from '@bloomneo/appkit/error';
import { authClass } from '@bloomneo/appkit/auth';
import { userIdOf } from '../../lib/qc/app-role.js';
import { peopleService } from './people.service.js';

const router = express.Router();
const error = errorClass.get();
const auth = authClass.get();

router.use(auth.requireLoginToken());

router.get('/me', error.asyncRoute(async (req, res) => {
  res.json(await peopleService.me(userIdOf(req)));
}));

router.use(auth.requireUserRoles(['admin.system']));

router.get('/', error.asyncRoute(async (req, res) => {
  const { appRole, status, q } = req.query as Record<string, string | undefined>;
  res.json(await peopleService.list({ appRole, status, q }));
}));

router.post('/', error.asyncRoute(async (req, res) => {
  res.status(201).json(await peopleService.create(userIdOf(req), req.body ?? {}));
}));

router.post('/:id/approve', error.asyncRoute(async (req, res) => {
  res.json({ person: await peopleService.setStatus(userIdOf(req), req.params.id, 'active') });
}));

router.post('/:id/reject', error.asyncRoute(async (req, res) => {
  res.json({ person: await peopleService.setStatus(userIdOf(req), req.params.id, 'rejected') });
}));

router.post('/:id/active', error.asyncRoute(async (req, res) => {
  res.json({ person: await peopleService.setActive(userIdOf(req), req.params.id, Boolean(req.body?.isActive)) });
}));

router.post('/:id/reset-password', error.asyncRoute(async (req, res) => {
  res.json(await peopleService.resetPassword(userIdOf(req), req.params.id));
}));

export default router;
