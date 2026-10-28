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
import { seedLibrary } from './library.seed.js';
import { generatePaper } from '../../src/api/lib/qc/generator.js';
import { questionsByIds } from '../../src/api/lib/qc/questions.js';
import { markAnswerPages } from '../../src/api/lib/qc/marking.js';

const TEACHER = 'teacher@quickcorrection.app';
const PARENT = 'parent@quickcorrection.app';
const ADMIN = 'admin@quickcorrection.app';

async function main() {
  const db = await databaseClass.get();
  const auth = authClass.get();
  const password = process.env.DEFAULT_USER_PASSWORD;
  if (!password) throw new Error('DEFAULT_USER_PASSWORD is required for seeding');
  const hash = await auth.hashPassword(password);
  await db.user.upsert({
    where: { email: ADMIN },
    update: {},
    create: { email: ADMIN, password: hash, name: 'Quick Correction Admin', role: 'admin', level: 'system', isVerified: true },
  });

  if (await db.user.findUnique({ where: { email: TEACHER } })) {
    console.log('⚠️  Demo teacher already exists. Skipping demo data (admin ensured).');
    return;
  }

  const teacher = await db.user.create({ data: { email: TEACHER, password: hash, name: 'Kavya Nair', role: 'user', level: 'basic', isVerified: true, appRole: 'teacher' } });
  const parent = await db.user.create({ data: { email: PARENT, password: hash, name: 'Rohit Sharma', role: 'user', level: 'basic', isVerified: true, appRole: 'parent' } });

  const names = ['Aarav Sharma', 'Diya Reddy', 'Ishaan Rao', 'Meera Iyer', 'Kabir Khan', 'Saanvi Gupta'];
  const students = [];
  for (const [i, name] of names.entries()) {
    students.push(await db.student.create({
      data: { teacherId: teacher.id, name, className: '10', inviteCode: `DEMO${i + 1}${'AB'[i % 2]}`, parentId: i === 0 ? parent.id : null },
    }));
  }

  // Papers come from the generator, so the categories and patterns must exist.
  await seedLibrary(db);
  const patternId = async (name: string) => (await db.paperPattern.findFirstOrThrow({ where: { name } })).id;
  const chapterId = async (name: string) => (await db.curriculumNode.findFirstOrThrow({ where: { kind: 'chapter', name } })).id;

  const plans = [
    { title: 'Unit Test 1 — Algebra', chapters: ['Real Numbers', 'Polynomials', 'Quadratic Equations'], pattern: 'Unit test', due: '2026-09-10', marked: true },
    { title: 'Half-Yearly Pre-Board', chapters: [] as string[], pattern: 'Board paper', due: '2026-10-02', marked: true },
    { title: 'Practice Paper — Statistics & Probability', chapters: ['Statistics', 'Probability'], pattern: 'Unit test', due: '2026-11-05', marked: false },
  ];
  for (const plan of plans) {
    const gen = await generatePaper({ patternId: await patternId(plan.pattern), chapterIds: await Promise.all(plan.chapters.map(chapterId)) });
    const qs = await questionsByIds(gen.questionIds, { layout: gen.layout });
    const paper = await db.paper.create({
      data: { teacherId: teacher.id, title: plan.title, pattern: gen.patternName, patternId: gen.patternId, durationMins: gen.durationMins, questionIds: gen.questionIds, layout: gen.layout },
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
  console.log(`✅ Demo data ready. Sign in as ${TEACHER} or ${PARENT} with DEFAULT_USER_PASSWORD. Admin: admin@quickcorrection.app.`);
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
