/**
 * Merges the verifiers' verdicts (generated/verdicts/<chapter>.json) into the
 * generated questions and writes generated/verified/<chapter>.json, which
 * prisma/seeding/ai-questions.import.ts reads. A chapter with no verdict file
 * is marked 'unverified' so the importer flags every question in it.
 * Run: node scripts/merge-verdicts.mjs
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';

const dir = new URL('../docs/content/generated/', import.meta.url).pathname;
mkdirSync(dir + 'verified', { recursive: true });
const tally = {};
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json') && x !== 'brief.json').sort()) {
  const slug = f.replace('.json', '');
  const rows = JSON.parse(readFileSync(dir + f, 'utf8'));
  const vFile = `${dir}verdicts/${f}`;
  const verdicts = existsSync(vFile) ? JSON.parse(readFileSync(vFile, 'utf8')) : null;
  const t = (tally[slug] = { ok: 0, mismatch: 0, ambiguous: 0, invalid: 0, unverified: 0 });
  const out = rows.map((r, i) => {
    const v = verdicts?.find((x) => x.idx === i);
    const verification = v ? { status: v.status, note: v.note || '', ...(v.correctedAnswer ? { correctedAnswer: v.correctedAnswer } : {}) } : { status: 'invalid', note: 'No verifier verdict for this question.' };
    t[v ? v.status : 'unverified']++;
    return { ...r, verification };
  });
  writeFileSync(`${dir}verified/${f}`, JSON.stringify(out, null, 2));
}
console.table(tally);
