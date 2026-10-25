/**
 * Parent routes — /api/parent. /link is open to any signed-in account (it is
 * how an account becomes a parent); everything else needs a parent account.
 * @file src/api/features/parent/parent.route.ts
 */
import express from 'express';
import { errorClass } from '@bloomneo/appkit/error';
import { authClass } from '@bloomneo/appkit/auth';
import { requireAppRole, userIdOf } from '../../lib/qc/app-role.js';
import { readPage, MAX_PAGE_BYTES } from '../../lib/qc/pages.js';
import { parentService } from './parent.service.js';

const router = express.Router();
const error = errorClass.get();
const auth = authClass.get();

router.use(auth.requireLoginToken());

router.post('/link', error.asyncRoute(async (req: any, res) => {
  res.json({ child: await parentService.link(userIdOf(req), req.body?.inviteCode) });
}));

router.use(requireAppRole('parent'));

router.get('/children', error.asyncRoute(async (req, res) => {
  res.json({ children: await parentService.children(userIdOf(req)) });
}));

router.get('/submissions', error.asyncRoute(async (req: any, res) => {
  res.json({ submissions: await parentService.submissions(userIdOf(req), req.query.studentId) });
}));

router.get('/submissions/:id', error.asyncRoute(async (req: any, res) => {
  res.json({ submission: await parentService.submission(userIdOf(req), req.params.id) });
}));

// One photo per request, sent as the raw image body (Content-Type: image/jpeg …).
router.post(
  '/submissions/:id/pages',
  express.raw({ type: 'image/*', limit: MAX_PAGE_BYTES }),
  error.asyncRoute(async (req: any, res) => {
    res.status(201).json(await parentService.addPage(userIdOf(req), req.params.id, req.headers['content-type'], req.body));
  }),
);

router.get('/submissions/:id/pages/:n', async (req, res, next) => {
  try {
    const sub = await parentService.submission(userIdOf(req), req.params.id);
    const key = (sub.pages as string[])[Number(req.params.n)];
    if (!key) throw error.notFound('Page not found');
    const { data, type } = await readPage(key);
    res.type(type).send(data);
  } catch (err) {
    next(err);
  }
});

router.post('/submissions/:id/submit', error.asyncRoute(async (req: any, res) => {
  res.json(await parentService.submit(userIdOf(req), req.params.id));
}));

export default router;
