/**
 * Accuracy check for the AI marker: does it give the marks you would?
 *
 *   npm run eval:marking -- init --paper <paperId> --name <case>   make a case for a paper
 *   npm run eval:marking -- check                                   validate your cases, call nothing
 *   npm run eval:marking -- run [--runs 2] [--model <id>] [--only <case>]
 *
 * A case is a folder under evals/marking/cases/ with
 *   case.json   the paper's questions and marking schemes (made by `init`)
 *   marks.csv   your marks, one row per question (made by `init`, you fill the teacher_marks column)
 *   page-1.jpg, page-2.jpg ...   photos of the student's handwritten answers, in order
 *
 * `run` sends each sheet through the same marker the app uses and writes a report to
 * evals/marking/results/. Cases hold students' work, so they are git-ignored. See
 * evals/marking/README.md.
 */
import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join, resolve } from 'node:path';
import { databaseClass } from '@bloomneo/appkit/database';
import { aiMarkerEnabled, checkPage, markPages, MarkerError, type PageImage, type Usage } from '../src/api/lib/qc/ai-marker.js';
import { questionsByIds, type LayoutSection, type Question } from '../src/api/lib/qc/questions.js';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const CASES = join(ROOT, 'evals/marking/cases');
const RESULTS = join(ROOT, 'evals/marking/results');

/* ── case files ─────────────────────────────────────────────────────────── */

type CaseFile = {
  name: string;
  paper: { id: string; title: string };
  questions: { n: number; id: string; marks: number; type: string; chapter: string; topic: string; text: string; options?: (string | number)[]; answer?: string }[];
};

/** $ per million tokens (input, output), from the published price list. Unknown models are not costed. */
const PRICES: Record<string, [number, number]> = {
  'claude-opus-5-5': [4, 20], 'claude-opus-5': [5, 25], 'claude-sonnet-5-5': [2, 10], 'claude-sonnet-5': [2, 10],
  'claude-haiku-5-5': [0.1, 0.5], 'claude-fable-5-1': [10, 50],
};

const csvCell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** Small CSV reader: quoted cells, doubled quotes inside them, no multi-line cells. */
function parseCsv(text: string): string[][] {
  return text.split(/\r?\n/).filter((l) => l.trim()).map((line) => {
    const cells: string[] = [];
    let cur = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quoted) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') quoted = false; else cur += c; }
      else if (c === '"') quoted = true;
      else if (c === ',') { cells.push(cur); cur = ''; }
      else cur += c;
    }
    cells.push(cur);
    return cells.map((x) => x.trim());
  });
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

/* ── init ───────────────────────────────────────────────────────────────── */

async function init() {
  const paperId = arg('paper'), name = arg('name');
  if (!paperId || !name) throw new Error('Usage: init --paper <paperId> --name <case-name>   (the paper id is in the paper page address)');
  if (!/^[a-z0-9][a-z0-9-_]*$/i.test(name)) throw new Error('Use letters, numbers, - and _ in the case name.');
  const dir = join(CASES, name);
  if (existsSync(dir)) throw new Error(`${dir} already exists.`);

  const db = await databaseClass.get();
  const paper = await db.paper.findUnique({ where: { id: paperId } });
  if (!paper) throw new Error(`No paper with id ${paperId}.`);
  const qs = await questionsByIds(paper.questionIds as string[], { layout: paper.layout as LayoutSection[] | null, withAnswers: true });
  if (!qs.length) throw new Error('That paper has no questions left in the bank.');

  const file: CaseFile = {
    name,
    paper: { id: paper.id, title: paper.title },
    questions: qs.map((q: Question, i: number) => ({ n: i + 1, id: q.id, marks: q.marks, type: q.type, chapter: q.chapter, topic: q.topic, text: q.text, options: q.options, answer: q.answer })),
  };
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'case.json'), JSON.stringify(file, null, 2));
  writeFileSync(join(dir, 'marks.csv'), ['q,max,teacher_marks,notes', ...file.questions.map((q) => `${q.n},${q.marks},,`)].join('\n') + '\n');
  const noKey = file.questions.filter((q) => !q.answer).length;
  console.log(`Made ${dir}\n  ${file.questions.length} questions, ${file.questions.reduce((n, q) => n + q.marks, 0)} marks${noKey ? `\n  Warning: ${noKey} question(s) have no answer key; the marker will judge those on correctness alone.` : ''}\nNext:\n  1. Print the paper from the app, have the student answer it, and photograph each answer page.\n  2. Save the photos in that folder as page-1.jpg, page-2.jpg ... (in order).\n  3. Mark the sheet yourself and fill the teacher_marks column in marks.csv (a whole number per question, 0 if not attempted).\n  4. npm run eval:marking -- check`);
}

/* ── loading and checking ───────────────────────────────────────────────── */

type Loaded = { dir: string; file: CaseFile; teacher: Map<number, number>; notes: Map<number, string>; pages: string[] };

const naturalPage = (a: string, b: string) => (parseInt(a.match(/\d+/)?.[0] ?? '0', 10) - parseInt(b.match(/\d+/)?.[0] ?? '0', 10)) || a.localeCompare(b);

function loadCase(name: string, problems: string[]): Loaded | null {
  const dir = join(CASES, name);
  const where = (m: string) => problems.push(`${name}: ${m}`);
  if (!existsSync(join(dir, 'case.json'))) { where('case.json is missing (run init)'); return null; }
  const file = JSON.parse(readFileSync(join(dir, 'case.json'), 'utf8')) as CaseFile;

  const teacher = new Map<number, number>(), notes = new Map<number, string>();
  if (!existsSync(join(dir, 'marks.csv'))) where('marks.csv is missing');
  else {
    const rows = parseCsv(readFileSync(join(dir, 'marks.csv'), 'utf8'));
    const head = rows[0]?.map((h) => h.toLowerCase()) ?? [];
    const iq = head.indexOf('q'), im = head.indexOf('teacher_marks'), inote = head.indexOf('notes');
    if (iq < 0 || im < 0) where('marks.csv needs the columns q and teacher_marks');
    else for (const r of rows.slice(1)) {
      const n = Number(r[iq]);
      const q = file.questions.find((x) => x.n === n);
      if (!q) { where(`marks.csv row for question ${r[iq]} does not match the paper`); continue; }
      if (r[im] === '' || r[im] === undefined) continue; // left blank: not yet marked by you
      const v = Number(r[im]);
      if (!Number.isInteger(v) || v < 0 || v > q.marks) where(`question ${n}: teacher_marks "${r[im]}" must be a whole number from 0 to ${q.marks}`);
      else { teacher.set(n, v); if (inote >= 0 && r[inote]) notes.set(n, r[inote]); }
    }
    const blank = file.questions.filter((q) => !teacher.has(q.n)).map((q) => q.n);
    if (blank.length) where(`teacher_marks is blank for question(s) ${blank.join(', ')}`);
  }

  const pages = readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort(naturalPage);
  if (!pages.length) where('no page photos found (page-1.jpg, page-2.jpg ...)');
  return { dir, file, teacher, notes, pages };
}

function caseNames(only?: string): string[] {
  if (!existsSync(CASES)) return [];
  return readdirSync(CASES).filter((d) => statSync(join(CASES, d)).isDirectory() && (!only || d === only)).sort();
}

/** Read a photo, shrinking it with macOS `sips` when it is too big for the model. */
function readPageFile(path: string, label: string): PageImage {
  const type = ({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' } as Record<string, string>)[extname(path).toLowerCase()];
  let bytes = readFileSync(path);
  if (bytes.length > 4.5 * 1024 * 1024) {
    try {
      const out = join(mkdtempSync(join(tmpdir(), 'eval-pages-')), basename(path));
      execFileSync('sips', ['-Z', '2000', path, '--out', out], { stdio: 'ignore' });
      bytes = readFileSync(out);
    } catch {
      throw new MarkerError(`${label} is ${(bytes.length / 1048576).toFixed(1)} MB. Shrink it to under 5 MB (long side about 2000 px) and try again.`);
    }
  }
  return checkPage(bytes, type, label);
}

function check(only?: string): Loaded[] {
  const names = caseNames(only);
  if (!names.length) throw new Error(`No cases found in ${CASES}. Make one with: npm run eval:marking -- init --paper <paperId> --name <case-name>`);
  const problems: string[] = [];
  const loaded = names.map((n) => loadCase(n, problems));
  if (problems.length) {
    console.log(`Found ${problems.length} thing(s) to fix before running:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    process.exitCode = 1;
    return [];
  }
  const ok = loaded.filter((x): x is Loaded => !!x);
  for (const c of ok) console.log(`  ${c.file.name}: ${c.file.questions.length} questions, ${c.file.questions.reduce((n, q) => n + q.marks, 0)} marks, ${c.pages.length} page photo(s), all marks filled in`);
  return ok;
}

/* ── run ────────────────────────────────────────────────────────────────── */

/** Wilson 95% interval for a proportion, as percentages. */
function wilson(k: number, n: number): [number, number] {
  if (!n) return [0, 100];
  const z = 1.96, p = k / n, d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d, h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.round(Math.max(0, c - h) * 100), Math.round(Math.min(1, c + h) * 100)];
}

type Row = { sheet: string; n: number; type: string; chapter: string; max: number; teacher: number; marker: number; feedback: string; legible: boolean; runs: number[]; note?: string };

async function run() {
  if (!aiMarkerEnabled()) throw new Error('No ANTHROPIC_API_KEY set. Add it to .env, then run again. (`check` works without a key.)');
  const cases = check(arg('only'));
  if (!cases.length) return;
  const runs = Math.max(1, Math.min(5, Number(arg('runs') ?? 1)));
  const model = arg('model') || process.env.MARKER_MODEL || 'claude-opus-5-5';
  console.log(`\nMarking ${cases.length} sheet(s) with ${model}, ${runs} run(s) each...\n`);

  const rows: Row[] = [];
  const usage: Usage = { input_tokens: 0, output_tokens: 0 };
  const sheets: { name: string; teacher: number; marker: number; max: number }[] = [];
  for (const c of cases) {
    const questions: Question[] = c.file.questions.map((q) => ({ id: q.id, section: '', chapter: q.chapter, topic: q.topic, type: q.type as Question['type'], complexity: '', text: q.text, options: q.options as string[] | undefined, marks: q.marks, answer: q.answer }));
    const pages = c.pages.map((p, i) => readPageFile(join(c.dir, p), `${c.file.name} ${p}`));
    const markerRuns: Row[][] = [];
    for (let r = 0; r < runs; r++) {
      const { outcome, usage: u } = await markPages({ questions, pages, paperTitle: c.file.paper.title, model });
      usage.input_tokens += u.input_tokens; usage.output_tokens += u.output_tokens;
      markerRuns.push(outcome.results.map((res, i) => ({
        sheet: c.file.name, n: i + 1, type: c.file.questions[i].type, chapter: c.file.questions[i].chapter, max: res.max,
        teacher: c.teacher.get(i + 1)!, marker: res.awarded, feedback: res.feedback, legible: res.legible !== false, runs: [], note: c.notes.get(i + 1),
      })));
      process.stdout.write(`  ${c.file.name}: run ${r + 1}/${runs} done\n`);
    }
    // The first run is the one reported; every run's marks are kept to show consistency.
    for (const row of markerRuns[0]) rows.push({ ...row, runs: markerRuns.map((m) => m[row.n - 1].marker) });
    sheets.push({ name: c.file.name, teacher: [...c.teacher.values()].reduce((a, b) => a + b, 0), marker: markerRuns[0].reduce((n, r) => n + r.marker, 0), max: markerRuns[0].reduce((n, r) => n + r.max, 0) });
  }
  report(rows, sheets, usage, model, runs);
}

/* ── report ─────────────────────────────────────────────────────────────── */

function report(rows: Row[], sheets: { name: string; teacher: number; marker: number; max: number }[], usage: Usage, model: string, runs: number) {
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  const mcq = rows.filter((r) => r.type === 'mcq');
  const written = rows.filter((r) => r.type !== 'mcq');
  const exact = (rs: Row[]) => rs.filter((r) => r.marker === r.teacher).length;
  const within1 = (rs: Row[]) => rs.filter((r) => Math.abs(r.marker - r.teacher) <= 1).length;
  const totalMax = sheets.reduce((n, s) => n + s.max, 0);
  const errs = sheets.map((s) => s.marker - s.teacher);
  const mae = errs.reduce((n, e) => n + Math.abs(e), 0) / sheets.length;
  const bias = errs.reduce((n, e) => n + e, 0) / sheets.length;
  const avgMax = totalMax / sheets.length;
  const unstable = runs > 1 ? rows.filter((r) => new Set(r.runs).size > 1) : [];
  const misses = rows.filter((r) => Math.abs(r.marker - r.teacher) >= Math.max(2, Math.ceil(r.max / 2))).sort((a, b) => Math.abs(b.marker - b.teacher) - Math.abs(a.marker - a.teacher));
  const unreadable = rows.filter((r) => !r.legible);

  // Guidance bars; what matters to you may differ, so they are a starting point, not a rule.
  const mcqEx = pct(exact(mcq), mcq.length), wr1 = pct(within1(written), written.length);
  const verdicts = [
    { ok: !mcq.length || mcqEx >= 95, text: `Multiple choice exact: ${mcq.length ? `${mcqEx}% (${exact(mcq)}/${mcq.length}, 95% range ${wilson(exact(mcq), mcq.length).join('–')}%)` : 'no questions'}; aim for 95% or more` },
    { ok: !written.length || wr1 >= 85, text: `Written within 1 mark: ${written.length ? `${wr1}% (${within1(written)}/${written.length}, 95% range ${wilson(within1(written), written.length).join('–')}%)` : 'no questions'}; aim for 85% or more` },
    { ok: pct(mae, avgMax) <= 5, text: `Average sheet total off by ${mae.toFixed(1)} marks (${pct(mae, avgMax)}% of ${avgMax.toFixed(0)}); aim for 5% or less` },
    { ok: Math.abs(pct(bias, avgMax)) <= 3, text: `Bias ${bias >= 0 ? '+' : ''}${bias.toFixed(1)} marks per sheet (${bias > 0 ? 'more generous than you' : bias < 0 ? 'stricter than you' : 'level with you'}); aim for within 3%` },
  ];

  const price = PRICES[model];
  const cost = price ? (usage.input_tokens * price[0] + usage.output_tokens * price[1]) / 1e6 : null;
  const lines: string[] = [
    `# Marker accuracy: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, '',
    `Model ${model} · ${sheets.length} sheet(s) · ${rows.length} questions (${mcq.length} multiple choice, ${written.length} written) · ${runs} run(s) each`, '',
    '## Verdict', '', ...verdicts.map((v) => `- ${v.ok ? 'PASS' : 'MISS'}: ${v.text}`), '',
    rows.length < 60 || written.length < 30 ? `Small sample (${written.length} written questions): treat these numbers as a first look, not a guarantee. The ranges above show how much they could move.` : 'The sample is reasonably sized, but check the misses below before trusting it.', '',
    '## Per sheet', '', '| Sheet | You | Marker | Difference | Out of |', '|---|---|---|---|---|', ...sheets.map((s) => `| ${s.name} | ${s.teacher} | ${s.marker} | ${s.marker - s.teacher >= 0 ? '+' : ''}${s.marker - s.teacher} | ${s.max} |`), '',
    `## Biggest misses (${misses.length})`, '', misses.length ? '| Sheet | Q | Chapter | You | Marker | Marker\'s comment | Your note |\n|---|---|---|---|---|---|---|' : 'None: no question was off by half its marks or more.',
    ...misses.map((r) => `| ${r.sheet} | ${r.n} | ${r.chapter} | ${r.teacher}/${r.max} | ${r.marker}/${r.max} | ${r.feedback.replace(/\|/g, '/')} | ${(r.note ?? '').replace(/\|/g, '/')} |`), '',
    '## Every question', '', '| Sheet | Q | Type | You | Marker | |', '|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.sheet} | ${r.n} | ${r.type} | ${r.teacher}/${r.max} | ${r.marker}/${r.max}${runs > 1 ? ` (runs: ${r.runs.join(', ')})` : ''} | ${r.marker === r.teacher ? '' : r.marker > r.teacher ? 'generous' : 'strict'}${r.legible ? '' : ' · hard to read'}${r.note && r.marker !== r.teacher ? ` · your note: ${r.note.replace(/\|/g, '/')}` : ''} |`), '',
  ];
  if (runs > 1) lines.push(`## Consistency`, '', unstable.length ? `${unstable.length} of ${rows.length} questions got different marks between runs.` : 'Every question got the same marks on every run.', '');
  if (unreadable.length) lines.push('## Flagged hard to read', '', `${unreadable.length} answer(s): ${unreadable.map((r) => `${r.sheet} Q${r.n}`).join(', ')}. Compare with your own view of the photo.`, '');
  lines.push('## Cost', '', `${usage.input_tokens.toLocaleString()} input and ${usage.output_tokens.toLocaleString()} output tokens${cost !== null ? ` (about $${cost.toFixed(2)} at published prices, $${(cost / (sheets.length * runs)).toFixed(3)} per sheet)` : ' (no price on file for this model)'}.`, '');

  mkdirSync(RESULTS, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  writeFileSync(join(RESULTS, `${stamp}.md`), lines.join('\n'));
  writeFileSync(join(RESULTS, `${stamp}.json`), JSON.stringify({ model, runs, sheets, rows, usage, verdicts }, null, 2));
  console.log(`\n${lines.slice(0, lines.indexOf('## Per sheet')).join('\n')}\nFull report: evals/marking/results/${stamp}.md`);
}

/* ── main ───────────────────────────────────────────────────────────────── */

const command = process.argv[2];
(async () => {
  if (command === 'init') await init();
  else if (command === 'check') { console.log('Checking cases...'); if (check(arg('only')).length) console.log('\nAll cases look ready. Run: npm run eval:marking -- run'); }
  else if (command === 'run') await run();
  else console.log('Usage:\n  npm run eval:marking -- init --paper <paperId> --name <case>\n  npm run eval:marking -- check\n  npm run eval:marking -- run [--runs 2] [--model <id>] [--only <case>]');
})().then(() => process.exit(process.exitCode ?? 0)).catch((err) => { console.error(err instanceof Error ? err.message : err); process.exit(1); });
