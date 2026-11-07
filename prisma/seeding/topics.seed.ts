/**
 * Seeds the curated topics under each chapter of CBSE › Class 10 ›
 * Mathematics (Standard), with question types, complexity and usual marks
 * taken from the tagged board papers. Safe to re-run: it only adds topics
 * that are missing and never overwrites what an admin has edited.
 * Run: npm run db:seed:topics   (after db:seed:library)
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { databaseClass } from '@bloomneo/appkit/database';
import { TOPICS } from './curriculum.data.js';

type Raw = { topic: string; askedInPapers: number; sections: Record<string, number>; complexity: Record<string, number> };

const TYPE_OF: Record<string, string> = { A: 'mcq', B: 'short', C: 'short', D: 'long', E: 'case' };
const MARKS_OF: Record<string, number> = { A: 1, B: 2, C: 3, D: 5, E: 4 };

const modal = (counts: Record<string, number>) => Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];

async function main() {
  const db = await databaseClass.get();
  const knowledge = JSON.parse(readFileSync(new URL('../../docs/content/cbse-class10-maths-knowledge.json', import.meta.url), 'utf8'));
  const subject = await db.curriculumNode.findFirst({ where: { kind: 'subject', name: 'Mathematics (Standard)' } });
  if (!subject) throw new Error('Run npm run db:seed:library first');

  let created = 0;
  for (const [chapterName, topics] of Object.entries(TOPICS)) {
    const chapter = await db.curriculumNode.findFirst({ where: { kind: 'chapter', name: chapterName, parentId: subject.id } });
    if (!chapter) { console.warn(`No chapter "${chapterName}" in the library; skipped`); continue; }
    const raws: Raw[] = knowledge.chapters.find((c: any) => c.chapter === chapterName)?.topics ?? [];
    const existing = await db.curriculumNode.count({ where: { parentId: chapter.id } });

    for (const [i, t] of topics.entries()) {
      if (await db.curriculumNode.findFirst({ where: { parentId: chapter.id, name: t.name } })) continue;
      const folded = raws.filter((r) => t.from.includes(r.topic));
      const sections: Record<string, number> = {};
      const complexity: Record<string, number> = {};
      const marks: Record<string, number> = {};
      for (const r of folded) {
        for (const [s, n] of Object.entries(r.sections)) {
          const letter = s[0];
          sections[letter] = (sections[letter] ?? 0) + n;
          marks[String(MARKS_OF[letter])] = (marks[String(MARKS_OF[letter])] ?? 0) + n;
        }
        for (const [c, n] of Object.entries(r.complexity)) complexity[c] = (complexity[c] ?? 0) + n;
      }
      const types = [...new Set(Object.keys(sections).map((s) => TYPE_OF[s]).filter(Boolean))];
      await db.curriculumNode.create({
        data: {
          kind: 'topic', name: t.name, parentId: chapter.id, position: existing + i,
          questionTypes: types.length ? types : undefined,
          complexity: modal(complexity) ?? undefined,
          marks: marks && Object.keys(marks).length ? Number(modal(marks)) : undefined,
        },
      });
      created++;
    }
  }
  console.log(`✅ Topics ready: ${created} added.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
