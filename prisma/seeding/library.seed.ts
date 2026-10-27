/**
 * Skill library starter: CBSE > Class 10 > Mathematics (Standard) with its
 * thirteen chapters, a "General" topic in each, the board and unit-test paper
 * patterns, and the starter question bank tagged to those topics.
 * Safe to re-run: it only adds what is missing.
 * Run: npm run db:seed:library
 */
import 'dotenv/config';
import { databaseClass } from '@bloomneo/appkit/database';
import { CHAPTERS, SECTIONS, QUESTION_BANK } from './question-bank.data.js';

async function node(db: any, kind: string, name: string, parentId: string | null, position: number) {
  const found = await db.curriculumNode.findFirst({ where: { parentId, name } });
  return found ?? db.curriculumNode.create({ data: { kind, name, parentId, position } });
}

const TYPE = { A: 'mcq', B: 'short', C: 'short', D: 'long', E: 'case' } as const;

export async function seedLibrary(db: any) {
  const board = await node(db, 'board', 'CBSE', null, 0);
  const cls = await node(db, 'class', 'Class 10', board.id, 0);
  const subject = await node(db, 'subject', 'Mathematics (Standard)', cls.id, 0);

  const topicByChapter = new Map<string, string>();
  for (const [i, name] of CHAPTERS.entries()) {
    const chapter = await node(db, 'chapter', name, subject.id, i);
    const topic = await node(db, 'topic', 'General', chapter.id, 0);
    topicByChapter.set(name, topic.id);
  }

  // The two layouts the generator has always used, now as editable patterns.
  const sectionsFor = (div: number) => (Object.keys(SECTIONS) as (keyof typeof SECTIONS)[]).map((k) => ({
    title: SECTIONS[k].title, type: TYPE[k], count: Math.ceil(SECTIONS[k].count / div), marksEach: SECTIONS[k].marks, note: SECTIONS[k].note,
  }));
  const patterns = [
    { name: 'Board paper', description: 'Full 80-mark CBSE board layout.', durationMins: 180, sections: sectionsFor(1) },
    { name: 'Unit test', description: 'A third of the board layout, for one or a few chapters.', durationMins: 60, sections: sectionsFor(3) },
  ];
  for (const [i, p] of patterns.entries()) {
    if (!(await db.paperPattern.findFirst({ where: { subjectId: subject.id, name: p.name } }))) {
      await db.paperPattern.create({ data: { ...p, subjectId: subject.id, position: i } });
    }
  }

  // Keep the original ids (a1, b3 …) so papers made before the bank moved to
  // the database still resolve.
  for (const q of QUESTION_BANK) {
    if (await db.question.findUnique({ where: { id: q.id } })) continue;
    await db.question.create({
      data: { id: q.id, topicId: topicByChapter.get(q.chapter)!, type: TYPE[q.section], complexity: 'medium', marks: q.marks, text: q.text, options: q.options ?? undefined, source: 'seed' },
    });
  }
}

async function main() {
  const db = await databaseClass.get();
  await seedLibrary(db);
  console.log('✅ Skill library ready (CBSE › Class 10 › Mathematics (Standard)): chapters, patterns and questions.');
}

if (process.argv[1]?.endsWith('library.seed.ts')) {
  main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
