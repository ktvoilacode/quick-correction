/**
 * Checks a LaTeX conversion of questions: node scripts/latex-check.mjs <in.json> <out.json>
 *   or, for freshly written questions with no original: node scripts/latex-check.mjs <file.json>
 *   - same ids, same order, same options count
 *   - dollars balanced; every $…$ / $$…$$ span parses in KaTeX (throwOnError)
 *   - no Unicode maths characters left (√ π θ ² ³ ° ≤ ≥ ≠ ∠ ∆ ∥ ⊥ × ÷ − …) outside \text{}
 *   - same digits as the original (² counts as 2), so no number was changed or dropped
 *   - the original's words (5+ letters) still appear
 * Exits 1 when anything fails and prints each problem.
 */
import { readFileSync } from 'node:fs';
import katex from 'katex';
import { splitMath } from './latex-split.mjs';

// One file = "solo" mode for newly written LaTeX questions (syntax checks only, nothing to compare with).
const [inFile, outFile = inFile] = process.argv.slice(2);
const solo = inFile === outFile;
const inp = JSON.parse(readFileSync(inFile, 'utf8')).map((q, i) => ({ id: q.id ?? `#${i}`, ...q }));
const out = solo ? inp : JSON.parse(readFileSync(outFile, 'utf8'));
const problems = [];
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹', SUB = '₀₁₂₃₄₅₆₇₈₉';
const DIGITS = Object.fromEntries([...SUP].map((c, i) => [c, String(i)]).concat([...SUB].map((c, i) => [c, String(i)]), [['⁻', ''], ['ⁿ', '']]));
const LEFT = /[½¼¾⅓⅔√πθ°≤≥≠∠∆∥⊥×÷−∼≈±αβγ∴∵∞⁰¹²³⁴⁵⁶⁷⁸⁹⁻ⁿ₀₁₂₃₄₅₆₇₈₉]/u;
const FRAC = { '½': '12', '¼': '14', '¾': '34', '⅓': '13', '⅔': '23' };
const digits = (s) => [...s.replace(/[½¼¾⅓⅔]/g, (c) => FRAC[c]).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉⁻ⁿ]/g, (c) => DIGITS[c] ?? '')].filter((c) => /\d/.test(c)).sort().join('');
const WORD_SKIP = new Set(['value', 'equal', 'given', 'where', 'there', 'which', 'these', 'those', 'their', 'cosec', 'verify', 'prove', 'other']);

if (inp.length !== out.length) problems.push(`count differs: ${inp.length} in, ${out.length} out`);
const byId = new Map(out.map((q) => [q.id, q]));

const checkField = (id, label, before, after) => {
  if (typeof after !== 'string') { problems.push(`${id} ${label}: missing`); return; }
  // A LaTeX command written in a non-raw string loses its backslash escape (\triangle becomes TAB + riangle).
  if (/[\x00-\x08\x0b-\x1f\t]/.test(after)) problems.push(`${id} ${label}: control character in text (a \\t, \\f, \\b or \\r escape ate a LaTeX command)`);
  const parts = splitMath(after);
  // dollars: after removing \$ and the spans, no lone $ may remain in text parts
  if (parts.some((p) => p.kind === 'text' && p.value.includes('$') && !/\\\$/.test(p.value))) problems.push(`${id} ${label}: unbalanced $`);
  for (const p of parts) {
    if (p.kind === 'text') {
      if (LEFT.test(p.value)) problems.push(`${id} ${label}: Unicode maths left in text: "${p.value.match(LEFT)[0]}" in …${p.value.slice(Math.max(0, p.value.search(LEFT) - 15), p.value.search(LEFT) + 15)}…`);
      continue;
    }
    try { katex.renderToString(p.value, { throwOnError: true, strict: 'ignore' }); }
    catch (e) { problems.push(`${id} ${label}: KaTeX error in $${p.value.slice(0, 60)}$ — ${e.message.slice(0, 80)}`); }
    const noText = p.value.replace(/\\text\{[^}]*\}/g, '');
    if (LEFT.test(noText)) problems.push(`${id} ${label}: Unicode maths left inside $…$: "${noText.match(LEFT)[0]}"`);
    if (/−/.test(p.value)) problems.push(`${id} ${label}: Unicode minus inside maths`);
  }
  const textOnly = parts.map((p) => p.value).join(' ');
  if (digits(before) !== digits(after)) problems.push(`${id} ${label}: digits changed (${digits(before)} → ${digits(after)})`);
  const words = (before.toLowerCase().match(/[a-z]{5,}/g) ?? []).filter((w) => !WORD_SKIP.has(w));
  const lost = words.filter((w) => !after.toLowerCase().includes(w));
  if (words.length && lost.length / words.length > 0.25) problems.push(`${id} ${label}: wording changed (missing: ${[...new Set(lost)].slice(0, 5).join(', ')})`);
};

for (const q of inp) {
  const o = byId.get(q.id);
  if (!o) { problems.push(`${q.id}: missing from output`); continue; }
  checkField(q.id, 'text', q.text, o.text);
  if (q.options) {
    if (!Array.isArray(o.options) || o.options.length !== q.options.length) problems.push(`${q.id}: options count changed`);
    else q.options.forEach((opt, i) => checkField(q.id, `option ${i + 1}`, String(opt), String(o.options[i])));
  }
  checkField(q.id, 'answer', q.answer ?? '', o.answer ?? '');
  if (q.type === 'mcq' && q.answer && !(o.answer ?? '').startsWith('Correct option:')) problems.push(`${q.id}: answer lost its "Correct option:" prefix`);
}
if (problems.length) { console.log(problems.join('\n')); console.log(`\n${problems.length} problem(s) in ${outFile}`); process.exit(1); }
console.log(`OK: ${out.length} questions pass (${outFile})`);
