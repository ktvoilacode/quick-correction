/**
 * Aggregates the tagged CBSE Class 10 Maths papers (docs/content/tagged/<year>/*.json)
 * into chapter-wise statistics: docs/content/cbse-class10-maths-observed.json.
 * Run: node scripts/pyq-analyze.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../docs/content/', import.meta.url).pathname;
const dir = join(root, 'tagged');
const CHAPTERS = ['Real Numbers', 'Polynomials', 'Pair of Linear Equations', 'Quadratic Equations', 'Arithmetic Progressions', 'Triangles', 'Coordinate Geometry', 'Trigonometry', 'Circles', 'Areas Related to Circles', 'Surface Areas and Volumes', 'Statistics', 'Probability'];

const rows = [];
const problems = [];
for (const year of readdirSync(dir).sort()) {
  for (const f of readdirSync(join(dir, year)).filter((x) => x.endsWith('.json')).sort()) {
    const data = JSON.parse(readFileSync(join(dir, year, f), 'utf8'));
    for (const r of data) rows.push({ ...r, year: Number(year), paper: `${year}/${f.replace('.json', '')}` });
  }
}
for (const r of rows) {
  if (!CHAPTERS.includes(r.chapter)) problems.push(`${r.paper} Q${r.qno}: unknown chapter "${r.chapter}"`);
}

// 2023-2026 papers are the full 80-mark design; 2022 was a 40-mark Term-2 paper, reported separately.
const papersBy = (y) => new Set(rows.filter((r) => r.year === y).map((r) => r.paper)).size;
const years = [...new Set(rows.map((r) => r.year))].sort();
const full = rows.filter((r) => r.year >= 2023);
const nFull = new Set(full.map((r) => r.paper)).size;
const sum = (a, f) => a.reduce((n, x) => n + f(x), 0);
const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
const tally = (arr, key) => arr.reduce((m, r) => ((m[key(r)] = (m[key(r)] ?? 0) + 1), m), {});

const chapters = CHAPTERS.map((name) => {
  const inCh = full.filter((r) => r.chapter === name);
  const byYear = {};
  for (const y of years.filter((y) => y >= 2023)) {
    const p = papersBy(y);
    const ys = inCh.filter((r) => r.year === y);
    byYear[y] = { avgQuestions: round(ys.length / p), avgMarks: round(sum(ys, (r) => r.marks) / p) };
  }
  const topics = Object.entries(tally(inCh, (r) => r.topic)).sort((a, b) => b[1] - a[1]);
  return {
    name,
    avgMarksPerPaper: round(sum(inCh, (r) => r.marks) / nFull),
    avgQuestionsPerPaper: round(inCh.length / nFull),
    byYear,
    bySection: tally(inCh, (r) => r.section),
    byType: tally(inCh, (r) => r.type),
    byComplexity: tally(inCh, (r) => r.complexity),
    competencyShare: inCh.length ? round(inCh.filter((r) => r.competency).length / inCh.length, 2) : 0,
    internalChoiceShare: inCh.length ? round(inCh.filter((r) => r.internalChoice).length / inCh.length, 2) : 0,
    topics: topics.map(([topic, count]) => ({ topic, count, perPaper: round(count / nFull, 2) })),
  };
});

const out = {
  generatedFrom: `${rows.length} questions in ${new Set(rows.map((r) => r.paper)).size} papers (${years.join(', ')})`,
  fullPapers: { count: nFull, years: years.filter((y) => y >= 2023), papersPerYear: Object.fromEntries(years.map((y) => [y, papersBy(y)])) },
  overall: {
    competencyShare: round(full.filter((r) => r.competency).length / full.length, 2),
    complexity: tally(full, (r) => r.complexity),
    typeBySection: tally(full, (r) => `${r.section}:${r.type}`),
    internalChoiceQuestionsPerPaper: round(full.filter((r) => r.internalChoice).length / nFull),
    withFigureShare: round(full.filter((r) => r.hasFigure).length / full.length, 2),
    lowConfidenceRows: rows.filter((r) => r.confidence === 'low').length,
  },
  chapters,
  term2_2022: {
    papers: papersBy(2022),
    marksByChapter: Object.fromEntries(CHAPTERS.map((c) => [c, round(sum(rows.filter((r) => r.year === 2022 && r.chapter === c), (r) => r.marks) / (papersBy(2022) || 1))])),
  },
  problems,
};
writeFileSync(join(root, 'cbse-class10-maths-observed.json'), JSON.stringify(out, null, 2));
console.log(out.generatedFrom, '| problems:', problems.length);
console.log('chapter'.padEnd(26), 'marks/paper', 'qs/paper', 'compet%', 'choice%');
for (const c of [...chapters].sort((a, b) => b.avgMarksPerPaper - a.avgMarksPerPaper)) {
  console.log(c.name.padEnd(26), String(c.avgMarksPerPaper).padStart(11), String(c.avgQuestionsPerPaper).padStart(8), String(c.competencyShare).padStart(7), String(c.internalChoiceShare).padStart(8));
}
console.log('total marks/paper', round(sum(chapters, (c) => c.avgMarksPerPaper)), 'overall', JSON.stringify(out.overall));

// ── Knowledge base for question generation ────────────────────────────────
// Per chapter and topic: how often it is asked, in which section/marks, how hard,
// and the paraphrased templates seen. Templates are the taggers' own wording,
// not the board's text.
const norm = (t) => String(t).replace(/^NEW:\s*/i, '').trim().toLowerCase();
const knowledge = CHAPTERS.map((name) => {
  const inCh = full.filter((r) => r.chapter === name);
  const topics = {};
  for (const r of inCh) {
    const t = (topics[norm(r.topic)] ??= { topic: norm(r.topic), count: 0, sections: {}, complexity: {}, competency: 0, withFigure: 0, templates: new Map() });
    t.count++;
    t.sections[`${r.section}(${r.marks}m)`] = (t.sections[`${r.section}(${r.marks}m)`] ?? 0) + 1;
    t.complexity[r.complexity] = (t.complexity[r.complexity] ?? 0) + 1;
    if (r.competency) t.competency++;
    if (r.hasFigure) t.withFigure++;
    const key = String(r.template).trim();
    const e = t.templates.get(key) ?? { template: key, section: r.section, marks: r.marks, type: r.type, count: 0, years: new Set() };
    e.count++; e.years.add(r.year);
    t.templates.set(key, e);
  }
  return {
    chapter: name,
    avgMarksPerPaper: chapters.find((c) => c.name === name).avgMarksPerPaper,
    topics: Object.values(topics).sort((a, b) => b.count - a.count).map((t) => ({
      topic: t.topic, askedInPapers: t.count, perPaper: round(t.count / nFull, 2), sections: t.sections, complexity: t.complexity,
      competencyShare: round(t.competency / t.count, 2), figureShare: round(t.withFigure / t.count, 2),
      templates: [...t.templates.values()].sort((a, b) => b.count - a.count).slice(0, 8).map((e) => ({ template: e.template, section: e.section, marks: e.marks, type: e.type, seen: e.count, years: [...e.years].sort() })),
    })),
  };
});
writeFileSync(join(root, 'cbse-class10-maths-knowledge.json'), JSON.stringify({ basedOn: out.generatedFrom, note: 'Templates are paraphrases for generating original questions; do not treat them as board text.', chapters: knowledge }, null, 2));

const md = ['# CBSE Class 10 Maths (Standard): what the board asks', '',
  `Built from ${out.generatedFrom}. Generated by \`scripts/pyq-analyze.mjs\`; do not edit by hand.`, '',
  '## Chapter weight (average marks per 80-mark paper, 2023–2026)', '',
  '| Chapter | Marks | Questions | Application share | Internal choice |', '|---|---|---|---|---|',
  ...[...chapters].sort((a, b) => b.avgMarksPerPaper - a.avgMarksPerPaper).map((c) => `| ${c.name} | ${c.avgMarksPerPaper} | ${c.avgQuestionsPerPaper} | ${Math.round(c.competencyShare * 100)}% | ${Math.round(c.internalChoiceShare * 100)}% |`), ''];
for (const k of knowledge) {
  md.push(`## ${k.chapter} (${k.avgMarksPerPaper} marks per paper)`, '');
  for (const t of k.topics.slice(0, 8)) {
    md.push(`- **${t.topic}**: asked ${t.askedInPapers} times (${t.perPaper} per paper); slots ${Object.entries(t.sections).map(([s, n]) => `${s}×${n}`).join(', ')}; ${Object.entries(t.complexity).map(([s, n]) => `${s} ${n}`).join(', ')}`);
    for (const e of t.templates.slice(0, 2)) md.push(`  - e.g. ${e.template} (${e.section}, ${e.marks}m, seen ${e.seen}×)`);
  }
  md.push('');
}
writeFileSync(join(root, 'cbse-class10-maths-knowledge.md'), md.join('\n'));
console.log('knowledge written:', knowledge.reduce((n, k) => n + k.topics.length, 0), 'topics');
