/**
 * Writes docs/content/generated/brief.json: for each chapter, the curated
 * topics (with how often the board asks each) and how many questions of each
 * slot to write so the bank supports about ten distinct papers.
 * Run: node scripts/gen-brief.mjs   (needs tsx for the TS taxonomy: npx tsx scripts/gen-brief.mjs)
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { TOPICS } from '../prisma/seeding/curriculum.data.ts';

const root = new URL('../docs/content/', import.meta.url).pathname;
const knowledge = JSON.parse(readFileSync(root + 'cbse-class10-maths-knowledge.json', 'utf8'));
const rows = [];
for (const y of readdirSync(root + 'tagged')) if (y >= '2023') for (const f of readdirSync(root + 'tagged/' + y)) rows.push(...JSON.parse(readFileSync(`${root}tagged/${y}/${f}`, 'utf8')));
const PAPERS = new Set(rows.map((r) => `${r.year}/${r.series}`)).size;
const SCALE = 10; // distinct papers' worth of questions to write per chapter

const slotOf = (r) => (r.section === 'A' ? (r.type === 'assertion_reason' ? 'A-assertion-reason (1 mark)' : 'A-mcq (1 mark)') : ({ B: 'B-short (2 marks)', C: 'C-short (3 marks)', D: 'D-long (5 marks)', E: 'E-case-study (4 marks, with sub-parts)' })[r.section]);

const chapters = Object.entries(TOPICS).map(([chapter, topics]) => {
  const inCh = rows.filter((r) => r.chapter === chapter);
  const slots = {};
  for (const r of inCh) slots[slotOf(r)] = (slots[slotOf(r)] ?? 0) + 1;
  const quota = Object.fromEntries(Object.entries(slots).map(([k, n]) => [k, Math.max(1, Math.round((n / PAPERS) * SCALE))]));
  const raws = knowledge.chapters.find((c) => c.chapter === chapter).topics;
  return {
    chapter,
    quota,
    totalQuestions: Object.values(quota).reduce((a, b) => a + b, 0),
    topics: topics.map((t) => ({ name: t.name, boardWeight: raws.filter((r) => t.from.includes(r.topic)).reduce((n, r) => n + r.askedInPapers, 0), foldsInto: t.from })),
  };
});
writeFileSync(root + 'generated/brief.json', JSON.stringify({ papersAnalysed: PAPERS, scale: SCALE, chapters }, null, 2));
console.log(chapters.map((c) => `${c.chapter}: ${c.totalQuestions} ${JSON.stringify(c.quota)}`).join('\n'));
console.log('TOTAL', chapters.reduce((n, c) => n + c.totalQuestions, 0));
