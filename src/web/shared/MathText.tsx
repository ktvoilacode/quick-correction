/**
 * MathText — text with LaTeX maths, rendered with KaTeX.
 *
 * Questions and answers are stored as plain text with maths between dollar
 * signs: `$x^2 - 3x - 10 = 0$` inline, `$$ ... $$` on its own line. Write a
 * literal dollar sign as `\$`. Everything outside the dollars is ordinary text
 * (line breaks are kept), so a question never has to be all-or-nothing LaTeX.
 */
import * as React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

type Part = { kind: 'text' | 'inline' | 'display'; value: string };

/** Splits on $$…$$ and $…$ ; an unmatched or escaped dollar stays text. */
export function splitMath(input: string): Part[] {
  const parts: Part[] = [];
  let text = '';
  const flush = () => { if (text) { parts.push({ kind: 'text', value: text }); text = ''; } };
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '\\' && input[i + 1] === '$') { text += '$'; i++; continue; }
    if (ch !== '$') { text += ch; continue; }
    const display = input[i + 1] === '$';
    const open = display ? 2 : 1;
    let j = i + open;
    let close = -1;
    while (j < input.length) {
      if (input[j] === '\\') { j += 2; continue; }
      if (input[j] === '$' && (!display || input[j + 1] === '$')) { close = j; break; }
      j++;
    }
    if (close < 0) { text += input.slice(i); i = input.length; break; }   // no closing dollar: plain text
    flush();
    parts.push({ kind: display ? 'display' : 'inline', value: input.slice(i + open, close) });
    i = close + open - 1;
  }
  flush();
  return parts;
}

function renderMath(src: string, display: boolean): string {
  return katex.renderToString(src, { displayMode: display, throwOnError: false, strict: 'ignore', trust: false, output: 'htmlAndMathml' });
}

export function MathText({ text, className }: { text: string; className?: string }) {
  const nodes = React.useMemo(() => splitMath(text).map((p, i) => {
    if (p.kind === 'text') return <React.Fragment key={i}>{p.value}</React.Fragment>;
    const html = renderMath(p.value, p.kind === 'display');
    // KaTeX output is escaped markup built from the LaTeX source; trust is off, so no raw HTML or links get through.
    return p.kind === 'display'
      ? <span key={i} className="my-2 block overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
      : <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
  }), [text]);
  return <span className={className}>{nodes}</span>;
}
