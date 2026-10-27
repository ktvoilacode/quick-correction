/**
 * Skill library starter: CBSE > Class 10 > Mathematics (Standard) with the
 * thirteen chapters the paper generator already knows. Safe to re-run — it
 * only adds what is missing.
 * Run: npm run db:seed:library
 */
import 'dotenv/config';
import { databaseClass } from '@bloomneo/appkit/database';
import { CHAPTERS } from '../../src/api/lib/qc/question-bank.js';

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
  console.log('✅ Skill library ready (CBSE › Class 10 › Mathematics (Standard)).');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
