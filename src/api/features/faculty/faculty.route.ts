/**
 * Faculty routes — /api/faculty. Accounts an admin created with the faculty
 * role: set a board-format paper, preview it, download it. Nothing is stored.
 * @file src/api/features/faculty/faculty.route.ts
 */
import express from 'express';
import { errorClass } from '@bloomneo/appkit/error';
import { authClass } from '@bloomneo/appkit/auth';
import { requireAppRole } from '../../lib/qc/app-role.js';
import { facultyService } from './faculty.service.js';

const router = express.Router();
const error = errorClass.get();
const auth = authClass.get();

router.use(auth.requireLoginToken());
router.use(requireAppRole('faculty'));

router.get('/setup', error.asyncRoute(async (_req, res) => {
  res.json(await facultyService.setup());
}));

router.post('/preview', error.asyncRoute(async (req: any, res) => {
  res.json({ paper: await facultyService.preview(req.body ?? {}) });
}));

export default router;
