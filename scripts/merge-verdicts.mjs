/**
 * Merges the verifiers' verdicts into the generated questions and writes
 * verified/<chapter>.json, which prisma/seeding/ai-questions.import.ts reads.
 *   node scripts/merge-verdicts.mjs            first batch  (generated/)
 *   node scripts/merge-verdicts.mjs batch2     second batch (generated/batch2/)
 * A chapter with no verdict file is marked 'invalid' so the importer flags every
 * question in it. When a mine/<chapter>.json exists (the verifier's own recorded
 * answers, written before it saw the keys) it must have one entry per question,
 * otherwise the verdicts are not trusted and the whole chapter is flagged.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';

const sub = process.argv[2] ? process.argv[2].replace(/\/?$/, '/') : '';
const dir = new URL(`../docs/content/generated/${sub}`, import.meta.url).pathname;
const needsMine = Boolean(sub);
mkdirSync(dir + 'verified', { recursive: true });
const tally = {};
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json') && x !== 'brief.json').sort()) {
  const rows = JSON.parse(readFileSync(dir + f, 'utf8'));
  const vFile = `${dir}verdicts/${f}`;
  const verdicts = existsSync(vFile) ? JSON.parse(readFileSync(vFile, 'utf8')) : null;
  const mine = existsSync(`${dir}mine/${f}`) ? JSON.parse(readFileSync(`${dir}mine/${f}`, 'utf8')) : null;
  const mineOk = !needsMine || (mine && mine.length === rows.length);
  const python = mine ? mine.filter((m) => m.how === 'python').length : 0;
  const t = (tally[f.replace('.json', '')] = { questions: rows.length, ok: 0, mismatch: 0, ambiguous: 0, invalid: 0, python, recorded: mine ? mine.length : 0 });
  const out = rows.map((r, i) => {
    const v = verdicts?.find((x) => x.idx === i);
    let verification;
    if (!v) verification = { status: 'invalid', note: 'No verifier verdict for this question.' };
    else if (!mineOk) verification = { status: 'invalid', note: 'Verifier did not record its own answers; verdict not trusted.' };
    else verification = { status: v.status, note: v.note || '', ...(v.correctedAnswer ? { correctedAnswer: v.correctedAnswer } : {}) };
    t[verification.status] = (t[verification.status] ?? 0) + 1;
    return { ...r, verification };
  });
  writeFileSync(`${dir}verified/${f}`, JSON.stringify(out, null, 2));
}
console.table(tally);
