#!/usr/bin/env python3
"""
Applies the duplicate-check findings to the review queue (run dup-check.py first).
Strong resemblances (picked by hand from dup-report.json) become 'flagged'; every other
board or bank hit gets a reviewer note but stays a draft. Questions already approved or
rejected are left alone.
"""
import json, os, sqlite3

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
hits = json.load(open(os.path.join(ROOT, 'docs/content/generated/dup-report.json')))

# Text starts of AI questions that closely match a board question or an existing bank question.
FLAG = [
    'Find the ratio in which the x-axis divides the line segment joining A(3, −6)',
    'Find a relation between x and y such that the point P(x, y) is equidistant from A(3, 6)',
    'A chord of a circle of radius 10 cm subtends a right angle at the centre. The area',
    'A chord of a circle of radius 12 cm subtends an angle of 60° at the centre',
    'The first term of an AP is 5, the last term is 45 and the sum of all its terms is 250',
    'Assertion (A): The probability that a non-leap year has 53 Sundays',
    'The mode of the following data is: Class: 10-20 | 20-30 | 30-40 | 40-50 | 50-60 ; Frequency: 4 | 8 | 20 | 12 | 6',
    'Find the zeroes of the polynomial 6x² − 7x − 3 and verify the relationship',
]

db = sqlite3.connect(os.path.join(ROOT, 'prisma/dev.db'))
rows = db.execute("select id, text, reviewStatus, reviewNote from questions where source='ai'").fetchall()
by_prefix = lambda pre: [r for r in rows if r[1].strip().startswith(pre)]

flagged = noted = 0
for pre in FLAG:
    for id_, text, status, _ in by_prefix(pre):
        h = next((x for x in hits if x['id'] == id_), None)
        if h and h['kind'] == 'board':
            note = f"Resembles a board question ({h['against']}): same task with the same or nearly the same numbers. Rewrite or reject."
        elif h:
            note = 'Near-duplicate of an existing bank question (same polynomial). Rewrite or reject.'
        else:
            note = 'Resembles a board or bank question. Rewrite or reject.'
        if status == 'draft':
            db.execute("update questions set reviewStatus='flagged', isActive=0, reviewNote=? where id=?", (note, id_)); flagged += 1

flag_ids = {r[0] for pre in FLAG for r in by_prefix(pre)}
for h in hits:
    if h['id'] in flag_ids or h['kind'] != 'board':
        continue
    row = db.execute("select reviewStatus, reviewNote from questions where id=?", (h['id'],)).fetchone()
    if row and row[0] == 'draft' and not row[1]:
        db.execute("update questions set reviewNote=? where id=?", (
            f"Overlaps the wording of a board paper ({h['against']}), probably a standard textbook stem. Check it is not a copy.", h['id'])); noted += 1
db.commit()
print(f'flagged {flagged}, noted {noted}')
print(dict(db.execute("select reviewStatus, count(*) from questions group by 1").fetchall()))
