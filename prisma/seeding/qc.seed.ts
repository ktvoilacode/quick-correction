/**
 * Quick Correction demo data: one teacher, one parent, six students, three
 * papers. Two papers are already marked; the newest is assigned and waiting
 * for answers, so every screen has something to show.
 *
 * Passwords come from DEFAULT_USER_PASSWORD, like the other seeds.
 * Run: npm run db:seed:qc   (skips if the teacher account already exists)
 */
import 'dotenv/config';
import { databaseClass } from '@bloomneo/appkit/database';
import { authClass } from '@bloomneo/appkit/auth';
import { buildPaper, CHAPTERS } from '../../src/api/lib/qc/question-bank.js';
import { markAnswerPages } from '../../src/api/lib/qc/marking.js';

const TEACHER = 'teacher@quickcorrection.app';
const PARENT = 'parent@quickcorrection.app';

async function main() {
  const db = await databaseClass.get();
  const auth = authClass.get();
  if (await db.user.findUnique({ where: { email: TEACHER } })) {
    console.log('⚠️  Demo teacher already exists. Skipping.');
    return;
  }
  const password = process.env.DEFAULT_USER_PASSWORD;
  if (!password) throw new Error('DEFAULT_USER_PASSWORD is required for seeding');
  const hash = await auth.hashPassword(password);

  const teacher = await db.user.create({ data: { email: TEACHER, password: hash, name: 'Kavya Nair', role: 'user', level: 'basic', isVerified: true, appRole: 'teacher' } });
  const parent = await db.user.create({ data: { email: PARENT, password: hash, name: 'Rohit Sharma', role: 'user', level: 'basic', isVerified: true, appRole: 'parent' } });

  const names = ['Aarav Sharma', 'Diya Reddy', 'Ishaan Rao', 'Meera Iyer', 'Kabir Khan', 'Saanvi Gupta'];
  const students = [];
  for (const [i, name] of names.entries()) {
    students.push(await db.student.create({
      data: { teacherId: teacher.id, name, className: '10', inviteCode: `DEMO${i + 1}${'AB'[i % 2]}`, parentId: i === 0 ? parent.id : null },
    }));
  }

  const plans = [
    { title: 'Unit Test 1 — Algebra', chapters: ['Real Numbers', 'Polynomials', 'Quadratic Equations'], pattern: 'unit' as const, due: '2026-09-10', marked: true },
    { title: 'Half-Yearly Pre-Board', chapters: [...CHAPTERS], pattern: 'board' as const, due: '2026-10-02', marked: true },
    { title: 'Practice Paper — Statistics & Probability', chapters: ['Statistics', 'Probability'], pattern: 'unit' as const, due: '2026-11-05', marked: false },
  ];
  for (const plan of plans) {
    const qs = buildPaper(plan.chapters, plan.pattern);
    const paper = await db.paper.create({
      data: { teacherId: teacher.id, title: plan.title, pattern: plan.pattern, durationMins: plan.pattern === 'board' ? 180 : 60, questionIds: qs.map((q) => q.id) },
    });
    for (const s of students) {
      const base = { paperId: paper.id, studentId: s.id, dueDate: new Date(plan.due) };
      if (!plan.marked) {
        await db.submission.create({ data: base });
        continue;
      }
      const out = await markAnswerPages(qs, [], `${paper.id}-${s.id}`);
      await db.submission.create({
        data: { ...base, status: 'evaluated', submittedAt: new Date(plan.due), results: out.results, score: out.score, max: out.max, summary: out.summary, reviewed: s !== students[2] },
      });
    }
  }
  console.log(`✅ Demo data ready. Sign in as ${TEACHER} or ${PARENT} with DEFAULT_USER_PASSWORD.`);
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
