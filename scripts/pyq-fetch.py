#!/usr/bin/env python3
"""
Downloads CBSE Class 10 Maths papers and keeps a citation for every file.

  python3 scripts/pyq-fetch.py [extra-official-urls.json]

Files go under docs/content/pyq/ (not in git). The citations go in
docs/content/pyq-sources.json, which is. Official papers come first; third-party
copies only fill years the official site doesn't list, and are labelled as such.
Already-downloaded files are kept. Papers are never overwritten.
"""
import datetime
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
import zipfile

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs/content')
PYQ = os.path.join(ROOT, 'pyq')
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'
OFFICIAL_PAGE = 'https://www.cbse.gov.in/cbsenew/question-paper.html'
OFFICIAL = 'https://www.cbse.gov.in/cbsenew/question-paper'
B = 'https://cdn1.byjus.com/wp-content/uploads'
BP = 'https://byjus.com/cbse-study-material'
MCB = 'https://mycollegebag.in/wp-content/uploads/attachments'
MCBP = 'https://mycollegebag.in/cbse-class-10/cbse-class-10th-mathematics-paper'

# folder, exam, url. Official files the page lists, and older ones still on the server.
OFFICIAL_FILES = [(y, e, f'{OFFICIAL}/{p}') for y, e, p in [
    ('2016', 'main', '2016/X/Maths.zip'), ('2018', 'main', '2018/X/Maths.zip'), ('2019', 'main', '2019/X/Mathematics.zip'),
    ('2017', 'main', '2017/X/Maths.rar'), ('2017-COMPTT', 'compartment', '2017-COMPTT/X/Maths.zip'), ('2018-COMPTT', 'compartment', '2018-COMPTT/X/Maths.zip'), ('2019-COMPTT', 'compartment', '2019-COMPTT/X/Mathematics.zip'),
    ('2021-COMPTT', 'compartment', '2021-COMPTT/X/Mathematics_Std.zip'), ('2021-COMPTT', 'compartment', '2021-COMPTT/X/Mathematics_Basic.zip'),
    ('2022', 'main', '2022/X/Math_S.zip'), ('2022', 'main', '2022/X/Math_B.zip'),
    ('2022-COMPTT', 'compartment', '2022-COMPTT/X/MATHEMATICS_STD.zip'), ('2022-COMPTT', 'compartment', '2022-COMPTT/X/MATHEMATICS_BASIC.zip'),
    ('2023', 'main', '2023/X/MATHEMATICS_STANDARD.zip'), ('2023', 'main', '2023/X/MATHEMATICS_BASIC.zip'),
    ('2023-COMPTT', 'compartment', '2023-COMPTT/X/Maths_Standard.zip'), ('2023-COMPTT', 'compartment', '2023-COMPTT/X/Maths_Basic.zip'),
    ('2024', 'main', '2024/X/MATHEMATICS_STANDARD.zip'), ('2024', 'main', '2024/X/MATHEMATICS_BASIC.zip'),
    ('2024-COMPTT', 'compartment', '2024-COMPTT/X/MATHEMATICS_STANDARD.zip'), ('2024-COMPTT', 'compartment', '2024-COMPTT/X/MATHEMATICS_BASIC.zip'),
    ('2025', 'main', '2025/X/041_Mathematics_Standard.zip'), ('2025', 'main', '2025/X/241_Mathematics_Basic.zip'),
    ('2025-COMPTT', 'compartment', '2025-COMPTT/X/Maths_Standard.zip'), ('2025-COMPTT', 'compartment', '2025-COMPTT/X/Maths_Basic.zip'),
    ('2026', 'main', '2026/X/Mathematics_Standard.zip'),
    ('2026-SECOND', 'second', '2026-COMPTT/Second_Board_X/Mathmatics_Std.zip'), ('2026-SECOND', 'second', '2026-COMPTT/Second_Board_X/Mathmatics_Basic.zip'),
]]

# year, page cited, file url
THIRD_PARTY = [
    ('2011', f'{BP}/class-10-maths-previous-year-question-papers-2011/', f'{B}/2019/10/CBSE-Class-10-Maths-Question-Paper-2011.pdf'),
    ('2011', f'{BP}/class-10-maths-previous-year-question-papers-2011/', f'{B}/2019/10/CBSE-Class-10-Maths-Paper-Solution-2011.pdf'),
    ('2011', 'https://www.vedantu.com/previous-year-question-paper/cbse-class-10-maths-question-paper-2011-delhi-scheme', 'https://www.vedantu.com/content-files-downloadable/previous-year-question-paper/cbse-class-10-maths-question-paper-2011-delhi-scheme.pdf'),
    ('2012', f'{BP}/class-10-maths-previous-year-question-papers-2012/', f'{B}/2019/10/CBSE-Class-10-Maths-Question-Paper-2012.pdf'),
    ('2012', f'{BP}/class-10-maths-previous-year-question-papers-2012/', f'{B}/2019/10/CBSE-Class-10-Maths-Paper-Solution-2012.pdf'),
    ('2013', f'{BP}/class-10-maths-previous-year-question-papers-2013/', f'{B}/2019/10/CBSE-Class-10-Maths-Question-Paper-PDF-2013.pdf'),
    ('2013', f'{BP}/class-10-maths-previous-year-question-papers-2013/', f'{B}/2019/10/CBSE-Class-10-Maths-Paper-Solution-2013.pdf'),
    ('2014', f'{BP}/class-10-maths-previous-year-question-papers-2014/', f'{B}/2019/10/CBSE-Class-10-Maths-Question-Paper-2014.pdf'),
    ('2014', f'{BP}/class-10-maths-previous-year-question-papers-2014/', f'{B}/2019/10/CBSE-Class-10-Maths-Paper-Solution-2014.pdf'),
] + [(y, f'{BP}/class-10-maths-previous-year-question-papers-{y}/', f'{B}/{d}/CBSE-Class-10-Maths-{k}-{y}-Set-{n}.pdf') for y, ns in (('2015', (1, 2)), ('2018', (1,)), ('2019', (1, 2, 3, 4, 5))) for n in ns for d, k in (('2017/10', 'Qs-Paper'), ('2019/08', 'Solution-PDF'))] + [
    (y, f'{BP}/{pg}/', f'{B}/{d}/CBSE-Class-10-Maths-{k}-{y}-SA-2-Set-{n}.pdf'.replace(f'Solution-PDF-{y}-SA-2', f'Solution-PDF-{y}'))
    for y, pg in (('2016', 'cbse-maths-question-paper-2016-class-10'), ('2017', 'cbse-class-10-maths-question-paper-2017')) for n in (1, 2) for d, k in (('2017/10', 'Qs-Paper'), ('2019/08', 'Solution-PDF'))] + [
    ('2020', f'{BP}/class-10-maths-previous-year-question-papers-2020/', f'{B}/2020/08/CBSE-Class-10-Mathematics-Question-Paper-Set-{c}-{n}-1.pdf') for c in (30, 430) for n in range(1, 6)] + [
    ('2020', f'{BP}/class-10-maths-previous-year-question-papers-2020/', f'{B}/2020/08/CBSE-Class-10-Maths-{lvl}-Question-Paper-Solution-2020-Set-{c}-{n}-1.pdf') for lvl, c in (('Standard', 30), ('Basics', 430)) for n in range(1, 6)] + [
    ('2020', f'{MCBP}/cbse-class-10-maths-question-paper-2020-in-pdf', f'{MCB}/{n}.zip') for n in ('cbse_class_10th_2020_mathematics_theory__std_', 'cbse_class_10th_2020_mathematics__basic_', 'cbse_class_10th_2020_maths_std_marking_scheme', 'cbse_class_10th_2020_maths_basic_marking_scheme')]


def get(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return 'kept'
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=180) as r:
        data = r.read()
    open(dest, 'wb').write(data)
    time.sleep(1.5)
    return 'downloaded'


def sha(path):
    h = hashlib.sha256()
    h.update(open(path, 'rb').read())
    return h.hexdigest()


def extract(zpath):
    """Unpack next to the zip, flat, PDFs only. Names are reduced to their base name."""
    out = os.path.join(os.path.dirname(zpath), 'x-' + os.path.basename(zpath)[:-4])
    os.makedirs(out, exist_ok=True)
    names = []
    with zipfile.ZipFile(zpath) as z:
        for i in z.infolist():
            base = os.path.basename(i.filename)
            if i.is_dir() or not base.lower().endswith('.pdf'):
                continue
            dest = os.path.join(out, base)
            if not os.path.exists(dest):
                open(dest, 'wb').write(z.read(i))
            names.append(dest)
    return names


def extract_rar(rpath):
    """Unpack a .rar with the system's tar, then keep only PDFs, flat, next to the archive."""
    out = os.path.join(os.path.dirname(rpath), 'x-' + os.path.basename(rpath)[:-4])
    os.makedirs(out, exist_ok=True)
    with tempfile.TemporaryDirectory() as t:
        subprocess.run(['tar', '-xf', rpath, '-C', t], check=True, timeout=120)
        names = []
        for root, _, files in os.walk(t):
            for f in files:
                if f.lower().endswith('.pdf'):
                    dest = os.path.join(out, os.path.basename(f))
                    if not os.path.exists(dest):
                        shutil.copyfile(os.path.join(root, f), dest)
                    names.append(dest)
    return names


def pdf_facts(path):
    try:
        info = subprocess.run(['pdfinfo', path], capture_output=True, text=True, timeout=30).stdout
        pages = int(re.search(r'^Pages:\s+(\d+)', info, re.M).group(1))
    except Exception:
        return {'pages': None, 'readable': False}
    txt = subprocess.run(['pdftotext', '-l', '2', path, '-'], capture_output=True, text=True, timeout=30).stdout
    return {'pages': pages, 'readable': True, 'hasTextLayer': len(txt.strip()) > 200}


def level_of(name):
    n = name.lower()
    if 'basic' in n or re.search(r'(^|[^0-9])(430|241)', n) or 'math_b' in n:
        return 'basic'
    if 'std' in n or 'standard' in n or 'math_s' in n or re.search(r'(^|[^0-9])041', n):
        return 'standard'
    return 'single-level' if int(re.search(r'20\d\d', name + ' 2019').group()) < 2020 else 'standard'


def kind_of(name):
    n = name.lower()
    if 'marking' in n or re.search(r'(^|[^a-z])ms([^a-z]|$)', n):
        return 'marking-scheme'
    if 'solution' in n:
        return 'solution'
    return 'question-paper'


def variant_of(name):
    n = name.lower()
    if 'blind' in n or 'for vi' in n or re.search(r'30[ _-]?\(?b\)?', n) or re.search(r'30[ _-]b', n):
        return 'visually-impaired'
    if 'punjabi' in n or re.match(r'40', n):
        return 'punjabi'
    if 'urdu' in n or re.match(r'46', n):
        return 'urdu'
    return 'english-hindi'


def rel(p):
    return os.path.relpath(p, ROOT)


today = datetime.date.today().isoformat()
official = list(OFFICIAL_FILES)
if len(sys.argv) > 1:
    for r in json.load(open(sys.argv[1])):
        m = re.search(r'question-paper/([^/]+)/', r['url'])
        folder = m.group(1)
        if not any(u == r['url'] for _, _, u in official):
            official.append((folder, 'compartment' if 'COMPTT' in folder else 'main', r['url']))

entries, failed = [], []
for folder, exam, url in official:
    dest = os.path.join(PYQ, folder, os.path.basename(url))
    try:
        st = get(url, dest)
    except Exception as e:
        failed.append({'url': url, 'error': str(e)})
        print('FAILED', url, e, flush=True)
        continue
    year = int(folder[:4])
    pdfs = extract(dest) if dest.lower().endswith('.zip') else extract_rar(dest) if dest.lower().endswith('.rar') else [dest]
    print(st, rel(dest), len(pdfs), 'pdfs', flush=True)
    for p in pdfs:
        name = os.path.basename(p)
        entries.append({'year': year, 'exam': exam, 'level': level_of(name + ' ' + os.path.basename(url) + f' {year}'), 'kind': kind_of(name), 'variant': variant_of(name),
                        'file': rel(p), 'sourceType': 'official', 'publisher': 'Central Board of Secondary Education', 'citedPage': OFFICIAL_PAGE,
                        'sourceUrl': url, 'retrieved': today, 'sha256': sha(p), **pdf_facts(p)})

for year, page, url in THIRD_PARTY:
    host = re.sub(r'^www\.|^cdn1\.', '', url.split('/')[2]).split('.')[0]
    dest = os.path.join(PYQ, f'{year}-web', host, os.path.basename(url))
    try:
        st = get(url, dest)
    except Exception as e:
        failed.append({'url': url, 'page': page, 'error': str(e)})
        print('FAILED', url, e, flush=True)
        continue
    pdfs = extract(dest) if dest.lower().endswith('.zip') else [dest]
    print(st, rel(dest), len(pdfs), 'pdfs', flush=True)
    for p in pdfs:
        name = os.path.basename(p)
        entries.append({'year': int(year), 'exam': 'main', 'level': level_of(name + ' ' + os.path.basename(url) + f' {year}'), 'kind': kind_of(name + ' ' + os.path.basename(url)), 'variant': variant_of(name),
                        'file': rel(p), 'sourceType': 'third-party', 'publisher': host, 'citedPage': page, 'sourceUrl': url, 'retrieved': today,
                        'sha256': sha(p), **pdf_facts(p), 'note': 'Third-party copy. Check against the official paper where possible.'})

json.dump({'note': 'Citation for every CBSE Class 10 Maths paper file. Files live in docs/content/pyq (not in git).', 'files': entries, 'failed': failed},
          open(os.path.join(ROOT, 'pyq-sources.json'), 'w'), ensure_ascii=False, indent=1)
print(f'{len(entries)} files; {len(failed)} failed')
