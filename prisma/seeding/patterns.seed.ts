/**
 * Loads the question patterns and the tagged board history.
 *
 *   docs/content/question-patterns/*.json  -> question_patterns, and questions.patternId
 *   docs/content/board-history.json        -> board_questions
 *
 * Adds topics the patterns name that Categories doesn't have yet, and marks
 * assertion-reason questions with their own type. Safe to re-run.
 * Run: npm run db:seed:patterns
 */
import 'dotenv/config';
import { readdirSync, readFileSync } from 'node:fs';
import { databaseClass } from '@bloomneo/appkit/database';

const dir = new URL('../../docs/content/question-patterns/', import.meta.url);
const history = new URL('../../docs/content/board-history.json', import.meta.url);

type P = { id: string; pattern: string; sample: string; slot: string; targets: { easy?: number; medium?: number; hard?: number }; figure: boolean; competency: boolean; seenOnBoard: number; seenIn: string[]; existingIds: string[] };
type T = { name: string; scope: string; scopeNote?: string; patterns: P[] };

/** The id a tagged row's paper has in pyq-sources.json. */
const paperIdOf = (r: any) => {
  const code = String(r.series ?? 'unknown').replace(/\//g, '-').replace(/[()]/g, '').replace(/^0+/, '');
  return `${r.year}-${r.exam}-std-${code}`;
};

async function main() {
  const db = await databaseClass.get();
  const subject = await db.curriculumNode.findFirst({ where: { kind: 'subject', name: 'Mathematics (Standard)' } });
  if (!subject) throw new Error('Run npm run db:seed:library first');

  let patterns = 0, linked = 0, topicsAdded = 0;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort()) {
    const data = JSON.parse(readFileSync(new URL(file, dir), 'utf8')) as { chapter: string; topics: T[] };
    const chapter = await db.curriculumNode.findFirst({ where: { kind: 'chapter', name: data.chapter, parentId: subject.id } });
    if (!chapter) throw new Error(`No chapter "${data.chapter}" in Categories`);
    for (const t of data.topics) {
      let topic = await db.curriculumNode.findFirst({ where: { kind: 'topic', name: t.name, parentId: chapter.id } });
      if (!topic) {
        const last = await db.curriculumNode.aggregate({ where: { parentId: chapter.id }, _max: { position: true } });
        topic = await db.curriculumNode.create({ data: { kind: 'topic', name: t.name, parentId: chapter.id, position: (last._max.position ?? 0) + 1 } });
        topicsAdded++;
      }
      for (const p of t.patterns) {
        const years = p.seenIn.map((s) => Number(s.split(' ')[0]));
        const row = {
          topicId: topic.id, slot: p.slot, pattern: p.pattern, sample: p.sample,
          targetEasy: p.targets.easy ?? 0, targetMedium: p.targets.medium ?? 0, targetHard: p.targets.hard ?? 0,
          needsFigure: !!p.figure, competency: !!p.competency, scope: t.scope, scopeNote: t.scopeNote || null,
          timesAsked: p.seenOnBoard, seenIn: p.seenIn, lastAsked: years.length ? Math.max(...years) : null,
        };
        await db.questionPattern.upsert({ where: { id: p.id }, create: { id: p.id, ...row }, update: row });
        patterns++;
        if (p.existingIds.length) linked += (await db.question.updateMany({ where: { id: { in: p.existingIds } }, data: { patternId: p.id } })).count;
      }
    }
  }

  // Assertion-reason questions were stored as multiple choice.
  const ar = await db.question.updateMany({ where: { type: 'mcq', text: { contains: 'Assertion' } }, data: { type: 'assertion_reason' } });

  const rows = JSON.parse(readFileSync(history, 'utf8')) as any[];
  let board = 0;
  for (const r of rows) {
    const paperId = r.paperId ?? paperIdOf(r);
    const qno = String(r.qno);
    const data = {
      paperId, year: r.year, exam: r.exam, series: r.series ?? null, qno, section: String(r.section), marks: r.marks, type: r.type,
      chapter: r.chapter, topic: r.topic, complexity: r.complexity, competency: !!r.competency, internalChoice: !!r.internalChoice,
      hasFigure: !!r.hasFigure, legacySyllabus: !!r.legacySyllabus, summary: r.summary ?? null, template: r.template ?? null,
      parts: r.parts ?? undefined, confidence: r.confidence ?? null, patternId: r.patternId ?? null,
    };
    await db.boardQuestion.upsert({ where: { paperId_qno: { paperId, qno } }, create: data, update: data });
    board++;
  }

  // Board layouts offer a choice in B, C and D (2 each); a unit test in D only.
  for (const p of await db.paperPattern.findMany({ where: { subjectId: subject.id } })) {
    const board = /board/i.test(p.name);
    const sections = (p.sections as any[]).map((s) => {
      if (s.choices !== undefined) return s;
      if (board && ['short', 'long'].includes(s.type)) return { ...s, choices: 2 };
      if (!board && s.type === 'long') return { ...s, choices: 1 };
      return s;
    });
    await db.paperPattern.update({ where: { id: p.id }, data: { sections } });
  }

  console.log(`Patterns ${patterns}, questions linked ${linked}, topics added ${topicsAdded}, assertion-reason ${ar.count}, board questions ${board}.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
