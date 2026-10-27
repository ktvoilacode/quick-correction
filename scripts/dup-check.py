#!/usr/bin/env python3
"""
Near-duplicate check for the question bank.

Compares every question (default: source='ai') against
  1. the OCR text of the board papers (docs/content/pyq-text, git-ignored),
  2. the other questions in the bank (AI and seed).
Writes docs/content/generated/dup-report.json and prints the hits.

  python3 scripts/dup-check.py            # report only
  python3 scripts/dup-check.py --flag     # also flag strong hits in the review queue

Board-paper overlap is measured as the share of a question's 4-word runs that
also appear in the board text (OCR is noisy, so a hit is a lead to look at, not
proof). Bank-to-bank similarity is cosine over word counts plus a numbers check.
"""
import glob, json, math, re, sqlite3, sys, os
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, 'prisma', 'dev.db')

def norm(s):
    s = re.sub(r'\\(?:text|frac|dfrac|left|right|operatorname|mathrm)\b', ' ', s)  # LaTeX wrappers carry no meaning
    s = re.sub(r'\\([a-zA-Z]+)', r' \1 ', s)
    s = s.lower().replace('√', ' sqrt ').replace('π', ' pi ').replace('θ', ' theta ')
    s = re.sub(r'[^a-z0-9./]+', ' ', s)
    return s.split()

def shingles(words, n=4):
    return {' '.join(words[i:i + n]) for i in range(len(words) - n + 1)}

def numbers(text):
    return set(re.findall(r'\d+(?:\.\d+)?', text))

def cosine(a, b):
    num = sum(a[k] * b.get(k, 0) for k in a)
    den = math.sqrt(sum(v * v for v in a.values())) * math.sqrt(sum(v * v for v in b.values()))
    return num / den if den else 0.0

STOP = set('the a an of in is and to for with that this are be at by on or as it its from if then find what which how'.split())

def bag(text):
    return Counter(w for w in norm(text) if w not in STOP)

db = sqlite3.connect(DB)
db.row_factory = sqlite3.Row
rows = db.execute("""
  select q.id, q.source, q.reviewStatus, q.type, q.marks, q.text, q.options, c.name as chapter
  from questions q join curriculum_nodes t on t.id = q.topicId join curriculum_nodes c on c.id = t.parentId
""").fetchall()
questions = [dict(r) for r in rows]
ai = [q for q in questions if q['source'] == 'ai']

def full_text(q):
    opts = json.loads(q['options']) if q['options'] else []
    return q['text'] + ' ' + ' '.join(str(o) for o in opts)

# 1. board text: best-matching stretch of each paper, then a numbers check
board = {}
for f in sorted(glob.glob(os.path.join(ROOT, 'docs/content/pyq-text/*/*.txt'))):
    year = f.split('/')[-2]
    board[f'{year}/{os.path.basename(f)[:-4]}'] = norm(open(f, encoding='utf-8', errors='ignore').read())
print(f'{len(ai)} AI questions, {len(questions)} in the bank, {len(board)} board papers')

def best_window(qwords, bwords):
    """Window of board words (a little longer than the question) sharing the most 4-word runs."""
    sh = shingles(qwords)
    if not sh:
        return 0.0, None
    L = len(qwords) + 25
    hit = [1 if ' '.join(bwords[i:i + 4]) in sh else 0 for i in range(len(bwords) - 3)]
    pre = [0]
    for h in hit:
        pre.append(pre[-1] + h)
    best, at = 0, 0
    for i in range(0, max(1, len(hit) - L + 1)):
        c = pre[min(len(hit), i + L)] - pre[i]
        if c > best:
            best, at = c, i
    return best / len(sh), at

hits = []
for q in ai:
    qwords = norm(q['text'])
    qnums = numbers(q['text'])
    top = (0.0, None, None)
    for name, bwords in board.items():
        c, at = best_window(qwords, bwords)
        if c > top[0]:
            top = (c, name, at)
    c, name, at = top
    if not name or c < 0.3:
        continue
    window = board[name][at:at + len(qwords) + 25]
    wnums = numbers(' '.join(window))
    cover = len(qnums & wnums) / len(qnums) if qnums else 1.0
    # copy: long overlap and the same numbers; lead: long overlap only
    level = 'copy' if (c >= 0.5 and cover >= 0.8) or c >= 0.75 else ('lead' if c >= 0.45 else None)
    if level:
        hits.append({'id': q['id'], 'chapter': q['chapter'], 'kind': 'board', 'level': level, 'score': round(c, 2),
                     'numbersCovered': round(cover, 2), 'against': name, 'text': q['text'][:200],
                     'boardText': ' '.join(window)[:260]})

# 2. bank vs bank: wording similarity of the question text, same chapter and type
import difflib
def flat(t):
    return ' '.join(norm(t))
flats = {q['id']: flat(q['text']) for q in questions}
nums = {q['id']: numbers(q['text']) for q in questions}
optset = {q['id']: set(str(o).lower() for o in (json.loads(q['options']) if q['options'] else [])) for q in questions}
for q in ai:
    for o in questions:
        if o['id'] == q['id'] or (o['source'] == 'ai' and o['id'] < q['id']):
            continue  # each AI pair once
        if o['chapter'] != q['chapter'] or o['type'] != q['type']:
            continue
        a, b = flats[q['id']], flats[o['id']]
        if abs(len(a) - len(b)) > 0.4 * max(len(a), len(b)):
            continue
        sm = difflib.SequenceMatcher(None, a, b)
        if sm.real_quick_ratio() < 0.8 or sm.quick_ratio() < 0.8:
            continue
        r = sm.ratio()
        if r < 0.8:
            continue
        na, nb = nums[q['id']], nums[o['id']]
        same = len(na & nb) / max(1, len(na | nb))
        opt_same = len(optset[q['id']] & optset[o['id']]) / max(1, len(optset[q['id']] | optset[o['id']]))
        # a different expression/number set behind the same stem ("... is equal to") is not a duplicate
        level = 'duplicate' if (same >= 0.8 or (r >= 0.97 and opt_same >= 0.5)) else 'similar wording'
        hits.append({'id': q['id'], 'chapter': q['chapter'], 'kind': 'bank', 'level': level, 'score': round(r, 2),
                     'sameNumbers': round(same, 2), 'sameOptions': round(opt_same, 2),
                     'against': o['id'], 'againstSource': o['source'], 'text': q['text'][:200], 'otherText': o['text'][:200]})

hits.sort(key=lambda h: (-h['score']))
json.dump(hits, open(os.path.join(ROOT, 'docs/content/generated/dup-report.json'), 'w'), indent=1)
from collections import Counter as C
print(dict(C((h['kind'], h['level']) for h in hits)))
for h in hits[:40]:
    print(h['kind'], h['level'], h['score'], h.get('numbersCovered', h.get('sameNumbers', '')), h['id'][-6:], '→', str(h['against'])[-26:], '|', h['text'][:80].replace('\n', ' '))
