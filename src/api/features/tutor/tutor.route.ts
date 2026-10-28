/**
 * Tutor routes — /api/tutor. Approved teacher accounts only, except /onboard, which
 * files a teacher request (pending until an admin approves it).
 * @file src/api/features/tutor/tutor.route.ts
 */
import express from 'express';
import { errorClass } from '@bloomneo/appkit/error';
import { authClass } from '@bloomneo/appkit/auth';
import { requireAppRole, claimAppRole, userIdOf } from '../../lib/qc/app-role.js';
import { readPage, MAX_PAGE_BYTES } from '../../lib/qc/pages.js';
import { tutorService } from './tutor.service.js';

const router = express.Router();
const error = errorClass.get();
const auth = authClass.get();

router.use(auth.requireLoginToken());

router.post('/onboard', error.asyncRoute(async (req, res) => {
  await claimAppRole(userIdOf(req), 'teacher');
  res.json({ ok: true, appRole: 'teacher', appStatus: 'pending' });
}));

router.use(requireAppRole('teacher'));

router.get('/setup', error.asyncRoute(async (_req, res) => {
  res.json(await tutorService.setup());
}));

router.get('/chapters', error.asyncRoute(async (_req, res) => {
  res.json({ chapters: await tutorService.chapters() });
}));

router.get('/students', error.asyncRoute(async (req, res) => {
  res.json({ students: await tutorService.listStudents(userIdOf(req)) });
}));

router.post('/students', error.asyncRoute(async (req: any, res) => {
  res.status(201).json({ student: await tutorService.addStudent(userIdOf(req), req.body ?? {}) });
}));

router.get('/papers', error.asyncRoute(async (req, res) => {
  res.json({ papers: await tutorService.listPapers(userIdOf(req)) });
}));

router.post('/papers', error.asyncRoute(async (req: any, res) => {
  res.status(201).json({ paper: await tutorService.createPaper(userIdOf(req), req.body ?? {}) });
}));

router.get('/papers/:id', error.asyncRoute(async (req: any, res) => {
  res.json({ paper: await tutorService.getPaper(userIdOf(req), req.params.id) });
}));

router.delete('/papers/:id', error.asyncRoute(async (req: any, res) => {
  res.json(await tutorService.deletePaper(userIdOf(req), req.params.id));
}));

router.post('/papers/:id/assign', error.asyncRoute(async (req: any, res) => {
  res.json(await tutorService.assignPaper(userIdOf(req), req.params.id, req.body ?? {}));
}));

router.get('/review', error.asyncRoute(async (req, res) => {
  res.json({ submissions: await tutorService.toReview(userIdOf(req)) });
}));

router.get('/submissions/:id', error.asyncRoute(async (req: any, res) => {
  res.json({ submission: await tutorService.getSubmission(userIdOf(req), req.params.id) });
}));

router.get('/submissions/:id/pages/:n', async (req, res, next) => {
  try {
    const sub = await tutorService.getSubmission(userIdOf(req), req.params.id);
    const key = (sub.pages as string[])[Number(req.params.n)];
    if (!key) throw error.notFound('Page not found');
    const { data, type } = await readPage(key);
    res.type(type).send(data);
  } catch (err) {
    next(err);
  }
});

// One photo per request, sent as the raw image body (Content-Type: image/jpeg ...).
router.post(
  '/submissions/:id/pages',
  express.raw({ type: 'image/*', limit: MAX_PAGE_BYTES }),
  error.asyncRoute(async (req: any, res) => {
    res.status(201).json(await tutorService.addPage(userIdOf(req), req.params.id, req.headers['content-type'], req.body));
  }),
);

router.post('/submissions/:id/submit', error.asyncRoute(async (req: any, res) => {
  res.json(await tutorService.submit(userIdOf(req), req.params.id));
}));

router.post('/submissions/:id/remark', error.asyncRoute(async (req: any, res) => {
  res.json(await tutorService.remark(userIdOf(req), req.params.id));
}));

router.post('/submissions/:id/approve', error.asyncRoute(async (req: any, res) => {
  res.json(await tutorService.approve(userIdOf(req), req.params.id));
}));

router.patch('/submissions/:id/results', error.asyncRoute(async (req: any, res) => {
  res.json(await tutorService.correctMarks(userIdOf(req), req.params.id, req.body?.results));
}));

export default router;
