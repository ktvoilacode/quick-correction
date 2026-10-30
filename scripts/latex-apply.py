#!/usr/bin/env python3
"""
Writes the LaTeX conversions (docs/content/generated/latex/out/*.json) into the question bank.
A file is applied only if scripts/latex-check.mjs passes on it, and only to questions whose
text still equals the exported original (so edits an admin made in the meantime are not overwritten).
Run: python3 scripts/latex-apply.py
"""
import glob, json, os, sqlite3, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LATEX = os.path.join(ROOT, 'docs/content/generated/latex')
db = sqlite3.connect(os.path.join(ROOT, 'prisma/dev.db'))

applied = skipped = 0
for inp in sorted(glob.glob(f'{LATEX}/in/*.json')):
    name = os.path.basename(inp)
    out = f'{LATEX}/out/{name}'
    if not os.path.exists(out):
        print(f'{name}: no output yet, skipped'); continue
    r = subprocess.run(['node', 'scripts/latex-check.mjs', inp, out], cwd=ROOT, capture_output=True, text=True)
    if r.returncode != 0:
        print(f'{name}: checker FAILED, not applied\n' + '\n'.join(r.stdout.splitlines()[:8])); continue
    before = {q['id']: q for q in json.load(open(inp))}
    for q in json.load(open(out)):
        row = db.execute('select text from questions where id=?', (q['id'],)).fetchone()
        if not row or row[0] != before[q['id']]['text']:
            skipped += 1; continue
        db.execute('update questions set text=?, options=?, answer=? where id=?',
                   (q['text'], json.dumps(q['options'], ensure_ascii=False) if q.get('options') else None, q.get('answer'), q['id']))
        applied += 1
    print(f'{name}: ok')
db.commit()
print(f'applied {applied}, skipped {skipped} (edited since export)')
