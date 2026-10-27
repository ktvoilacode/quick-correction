/**
 * Skill library starter: CBSE > Class 10 > Mathematics (Standard) with the
 * thirteen chapters the paper generator already knows. Safe to re-run — it
 * only adds what is missing.
 * Run: npm run db:seed:library
 */
import 'dotenv/config';
import { databaseClass } from '@bloomneo/appkit/database';
import { CHAPTERS, SECTIONS } from '../../src/api/lib/qc/question-bank.js';

async function node(db: any, kind: string, name: string, parentId: string | null, position: number) {
  const found = await db.curriculumNode.findFirst({ where: { parentId, name } });
  return found ?? db.curriculumNode.create({ data: { kind, name, parentId, position } });
}

async function main() {
  const db = await databaseClass.get();
  const board = await node(db, 'board', 'CBSE', null, 0);
  const cls = await node(db, 'class', 'Class 10', board.id, 0);
  const subject = await node(db, 'subject', 'Mathematics (Standard)', cls.id, 0);
  for (const [i, name] of CHAPTERS.entries()) await node(db, 'chapter', name, subject.id, i);

  // The two layouts the generator has always used, now as editable patterns.
  const type = { A: 'mcq', B: 'short', C: 'short', D: 'long', E: 'case' } as const;
  const sectionsFor = (div: number) => (Object.keys(SECTIONS) as (keyof typeof SECTIONS)[]).map((k) => ({
    title: SECTIONS[k].title, type: type[k], count: Math.ceil(SECTIONS[k].count / div), marksEach: SECTIONS[k].marks, note: SECTIONS[k].note,
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
  console.log('✅ Skill library ready (CBSE › Class 10 › Mathematics (Standard)).');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
