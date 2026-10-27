// Same $…$ / $$…$$ splitter as src/web/shared/MathText.tsx, for scripts.
export function splitMath(input) {
  const parts = [];
  let text = '';
  const flush = () => { if (text) { parts.push({ kind: 'text', value: text }); text = ''; } };
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '\\' && input[i + 1] === '$') { text += '\\$'; i++; continue; }
    if (ch !== '$') { text += ch; continue; }
    const display = input[i + 1] === '$';
    const open = display ? 2 : 1;
    let j = i + open, close = -1;
    while (j < input.length) {
      if (input[j] === '\\') { j += 2; continue; }
      if (input[j] === '$' && (!display || input[j + 1] === '$')) { close = j; break; }
      j++;
    }
    if (close < 0) { text += input.slice(i); i = input.length; break; }
    flush();
    parts.push({ kind: display ? 'display' : 'inline', value: input.slice(i + open, close) });
    i = close + open - 1;
  }
  flush();
  return parts;
}
