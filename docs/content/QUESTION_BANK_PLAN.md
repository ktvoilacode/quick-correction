# Plan: complete the question bank for CBSE Class 10 Mathematics (Standard)

Written 1 Nov 2026. Covers Standard (041) only. Basic (241) is out of scope here; its papers are already downloaded for later.

**Goal:** a bank that covers every kind of question the board asks, at the right difficulty, with enough depth for 20 non-repeating full board papers and regular chapter tests, and that records when each kind of question was asked.

**Where things stand:** 708 live questions against a target of 1,327. **816 new questions are needed.** The list of what to write is done. The bank also needs figures, which it has none of, and a person has not yet read its questions.

| File | What it holds |
|---|---|
| [question-patterns.md](question-patterns.md) | **The exhaustive list:** 1,299 kinds of question by chapter and topic, with difficulty targets, current count, years asked and a sample |
| [question-bank-status.md](question-bank-status.md) | Topic and difficulty tables for every chapter: target, have, gap |
| [question-patterns/](question-patterns/) | The same list as data, linked to real question ids. `_review.json` lists the corrections to make |
| [board-history.json](board-history.json) | 5,043 tagged board questions from 149 papers (2011-2026), each linked to its question pattern |

Regenerate the tables at any time with `python3 scripts/qb-report.py`.

## 1. What the evidence shows

**Papers used (every Standard set downloaded):** 149 papers, 5,043 questions: every English-Hindi Standard set we found for 2011-2026, main, compartment and the 2026 second board exam. Two visually-impaired papers (2021 and 2023 compartment) are left out. 2012 and 2014 are retyped copies (lower confidence). Every file and its source is cited in [PYQ_SOURCES.md](PYQ_SOURCES.md). Basic papers are downloaded but not tagged.
Older papers use a different format (30-40 questions; SA-II papers before 2018 cover only part of the syllabus), so they show what kinds of question exist. The counts below use only the 26 papers from 2023 onward, which follow today's 38-question format.

**History:** every board question is linked to one question pattern. Of the 1,177 patterns in syllabus topics, 878 have been asked at least once (749 since 2023) and 299 are syllabus-only so far.

| Finding | Bank today | Board papers | What it means |
|---|---|---|---|
| Figures | Effectively none, and nowhere to store one | 21% of questions (210 of 988) print a figure, mostly Circles and Triangles | **The biggest gap.** Those chapters can't match the board without this |
| Long-answer difficulty | 32% hard | About 51% hard | Add hard 5-mark questions |
| MCQ difficulty | 43% easy | 57% easy (21 main papers) | Add easy MCQs |
| Assertion-reason | 38, not marked as a type | 2 per paper | Needs its own type |
| Internal choice ("OR") | Not supported | 2 each in B, C and D, plus case-study parts | Papers can't offer a choice yet |
| Coverage | 640 of 1,180 active question types have no question | | Volume alone hasn't produced coverage |
| Answer keys | 41 older questions have none | | They can't be marked |
| Review | 667 AI questions were bulk-approved, none read by a person | | This must happen before real use |

## 2. How the target was set

Each chapter's target per slot is the larger of:
- **Board demand:** average questions per paper × 20 papers, with extra for internal choice (B ×7/5, C ×8/6, D ×6/4).
- **A floor for chapter tests:** 40 MCQ, 6 assertion-reason, 12 of 2 marks, 12 of 3 marks, 6 of 5 marks, 5 case studies.

**These are my assumptions, and easy to change.** Twenty papers and these floors are a judgement call: lower them and the bank shrinks, and the report recalculates. Chapters could go 1-2 over per slot to keep distinct tasks separate, so the total was 1,318 rather than the calculated 1,241.

**Difficulty by slot (easy / medium / hard), set from the board with small allowance for practice:**

| Slot | Mix | Target | Gap (E / M / H) |
|---|---|---|---|
| MCQ, 1 mark | 50 / 45 / 5 | 545 | 336 (175 / 141 / 20) |
| Assertion-reason, 1 mark | 25 / 70 / 5 | 83 | 51 (17 / 34 / 0) |
| Short, 2 marks | 25 / 70 / 5 | 222 | 128 (23 / 95 / 10) |
| Short, 3 marks | 5 / 75 / 20 | 222 | 128 (5 / 97 / 26) |
| Long, 5 marks | 0 / 45 / 55 | 157 | 108 (0 / 44 / 64) |
| Case study, 4 marks | 0 / 90 / 10 | 89 | 56 (0 / 47 / 9) |
| **Total** | | **1,327** | **816 (223 / 463 / 130)** |

**Difficulty rule:** easy is one step or a direct formula. Medium is 2-3 steps or a standard combination. Hard is several ideas together, a set-up that isn't obvious, or a long multi-part solution.

**By chapter:**

| Chapter | Question types | Target | Target E / M / H | Have | Gap | Gap E / M / H | Need a figure |
|---|---|---|---|---|---|---|---|
| Real Numbers | 100 | 105 | 30 / 64 / 11 | 54 | 66 | 21 / 37 / 8 | 2 |
| Polynomials | 95 | 87 | 29 / 50 / 8 | 53 | 59 | 22 / 30 / 7 | 9 |
| Pair of Linear Equations | 87 | 97 | 27 / 60 / 10 | 53 | 63 | 17 / 38 / 8 | 6 |
| Quadratic Equations | 101 | 102 | 27 / 57 / 18 | 54 | 63 | 15 / 33 / 15 | 4 |
| Arithmetic Progressions | 78 | 95 | 28 / 55 / 12 | 55 | 46 | 14 / 26 / 6 | 3 |
| Triangles | 115 | 115 | 30 / 64 / 21 | 56 | 78 | 17 / 43 / 18 | 59 |
| Coordinate Geometry | 98 | 103 | 29 / 63 / 11 | 53 | 58 | 15 / 36 / 7 | 10 |
| Trigonometry | 110 | 138 | 36 / 83 / 19 | 58 | 93 | 23 / 55 / 15 | 15 |
| Circles | 100 | 102 | 28 / 61 / 13 | 53 | 63 | 14 / 39 / 10 | 66 |
| Areas Related to Circles | 93 | 90 | 28 / 53 / 9 | 54 | 52 | 17 / 28 / 7 | 13 |
| Surface Areas and Volumes | 104 | 98 | 25 / 60 / 13 | 54 | 54 | 12 / 31 / 11 | 25 |
| Statistics | 96 | 99 | 26 / 56 / 17 | 54 | 62 | 18 / 32 / 12 | 1 |
| Probability | 87 | 87 | 27 / 51 / 9 | 54 | 50 | 15 / 30 / 5 | 4 |
| **Total** | **1,299** | **1,327** | **373 / 782 / 172** | **705** | **816** | **223 / 463 / 130** | **218** |

"Have" counts 705 because 3 of the 708 live questions are marked out of scope. Of those 705, 45 sit in question types with no target until the syllabus is checked, and others are over their type's target. They stay in the bank but don't reduce the gap, so the finished bank will hold more than 1,318. Topic-level tables are in [question-bank-status.md](question-bank-status.md); per-chapter rows above may lag it by a question or two after the round-2 tagging (11 new types added).

## 3. Phases

### Phase 0: settle the syllabus (needs you, first)
The official syllabus couldn't be read: the CBSE curriculum site's certificate is rejected by every tool here. Please download it in your own browser. The list of topics below reflects what the board has asked, and my memory of the cuts, which is not an official source.

**Tick in or out against the official PDF:**

| Topic | Latest board evidence | Targets now | Bank questions held |
|---|---|---|---|
| Combination figures (shaded regions) | **2024, 2025, 2026 papers** | 15 | 13 in topic |
| Pythagoras, as a tool | **2025** (proofs: 2019) | 3 | 7 in topic |
| Areas of similar triangles | **2025** one part (else 2019) | 1 | 8 in topic |
| Immersion and volume transfer | **2025, 2026** | 5 | 1 in topic |
| Step-deviation mean | **2026** one MCQ | 2 | 2 live; 2 more marked out of scope |
| HCF as a linear combination | **2026** one option | 1 | 0 |
| Geometric probability | **2025** compartment only | 1 | 0 |
| Water flow in channels and pipes | 2023 | 0 | 1 |
| Melting and recasting | 2022 | 0 | 6 |
| Constructions | 2022 | 0 | 0 |
| Area of a triangle from coordinates | 2023 (one line-intercept MCQ, else 2019) | 0 | 0 |
| Polynomial division algorithm | 2019 | 0 | 8 |
| Terminating decimals | 2019 | 0 | 5 |
| Reciprocal linear pairs | 2019 | 0 | 2 |
| Euclid's lemma, completing the square, frustum, ogives, complementary angles | 2019 or earlier | 0 | 0 |
| Cubic coefficient relations | Never | 0 | 4 |
| Cross-multiplication, bimodal data | Never | 0 | 0 |

Also confirm the assumed-mean method (board rows from 2022 only, marked core) and right-triangle altitude similarity (2025 only, marked core).

**Done when:** every row is in or out, and `scope` is updated in the data. The report then recalculates. Anything out gets hidden from papers, not deleted.

### Phase 1: clean what we have
1. Apply the 107 corrections in `question-patterns/_review.json`, mostly difficulty and topic labels, after a person looks through them. They came from reading question text cut to 260 characters, so check the wording in full.
2. Resolve the 3 out-of-scope questions, and duplicates the review names.
3. Look at the 12 flagged questions. Reviewers found several look sound on what they could see, so some can probably be released.
4. Write answer keys for the 41 older questions, then verify them.
5. Add the "General" topic's questions to real topics and remove it.

**Done when:** every live question has a key, a correct label and a real topic.

### Phase 2: make the bank able to hold this (built 1 Nov 2026, not committed)
All of the below is in the app, except that internal choices are picked when a paper is built, not stored as a fixed pair of questions. Papers now match the board's structure and difficulty mix, with chapters within about 1 mark of the board's average. Average overlap between chapter tests is 27-41% and should fall as the bank fills.

| Change | Why |
|---|---|
| `QuestionPattern` table, and `patternId` on `Question` | Coverage becomes a live number per topic and difficulty, and the admin can see gaps |
| `BoardQuestion` table (see section 4) | Records "asked in" |
| Figure on a question (SVG image, alt text, and in print) | 217 target questions need one |
| Question type `assertion_reason` | Board has 2 per paper, currently hidden inside MCQs |
| Internal-choice link between two questions | Board papers offer OR options |
| Structured case-study parts (1 + 1 + 2 marks, each with its own key) | So the marker and paper layout treat parts properly |
| Marking scheme by step, in place of a free-text answer | Better marks on 3 and 5-mark answers. Worth doing before Wave 1, or those questions need a second pass |
| Generator: difficulty mix, chapter weights, choices, avoid recent repeats | It now picks evenly across topics with no regard for difficulty or board weight |

**Done when:** a sample question of each kind can be stored, generated, printed and marked.

### Phase 3: write the 816 questions in waves
Each wave writes from [question-patterns.md](question-patterns.md), one chapter at a time, using each pattern's target and difficulty.

| Wave | What | Questions | MCQ / AR / 2 / 3 / 5 / case |
|---|---|---|---|
| 1 | Types asked in 2024-26, no figure needed | **409** | 195 / 28 / 58 / 66 / 53 / 9 |
| 2 | Older or syllabus-only types, no figure | **227** | 88 / 20 / 39 / 38 / 35 / 7 |
| 3 | Types needing a figure (after Phase 2), Circles and Triangles first | **153** | 49 / 2 / 26 / 24 / 17 / 35 |
| 4 | Topics in doubt, only those confirmed in Phase 0 | **up to 18** | 4 / 1 / 5 / 0 / 3 / 5 |

Figure drawing is its own job: each figure drawn as SVG from the question's data, and a person checks that it matches the text. The 68 existing questions in figure types carry no image, so they need one too.

**The check every question goes through:**
1. Written to a pattern, original wording, never copied from a board paper.
2. Solved independently from a copy without the answer. Any disagreement goes to a person. This found real errors in earlier batches.
3. Automatic checks: maths renders, marks match the scheme, and MCQs have exactly one right option.
4. Duplicate check against the bank and the board history.
5. Difficulty checked by a second reader against the rule in section 2.
6. **Read by a maths teacher.** Every 5-mark, case-study and flagged question, plus a random 20% of each chapter's rest. If that sample shows errors above about 2%, read the rest of that chapter.

Reading all 816 in full is about 40 hours (my rough estimate). The sampling above reduces this substantially.

**Done when:** imported as drafts, approved by a person, and the report shows the wave's gap closed.

### Phase 4: prove it works
| Test | Pass mark |
|---|---|
| Coverage | Every active pattern is at its target, by difficulty |
| 20 full board papers, generated together | No repeated question, and each matches the 38-question structure and chapter weights within ±2 marks |
| 10 tests per chapter, 20 marks each | Under 30% overlap between any two tests |
| Difficulty of a generated paper | Within 10 points of the mix in section 2 |
| Figures | Every figure pattern filled, and all figures print clearly |
| Comparison | A teacher compares 3 generated papers with real 2025-26 papers and would use them |
| Marking | Scheme-based marks tested on real answer sheets with `npm run eval:marking` |

**Order and dependencies:** Phase 0 → Phase 1 and Phase 2 (can run side by side) → Wave 1 → Waves 2 to 4 → Phase 4. Phase 0 and teacher review are the only parts that need people.

## 4. Recording when a question was asked

You asked to store where a question has been used. It needs two separate ideas, because our questions are original and board questions are not:

| Label | Meaning | Example |
|---|---|---|
| **Board question** | The real question from a real paper | "CBSE 2025, 30/1/1, Q14" |
| **Board style** | Our own question of a kind the board has asked | "This type asked: 2019, 2023, 2025" |

**Data:**
- `BoardQuestion`: year, exam (main / compartment / second), series, question number, section, marks, chapter, topic, `patternId`, difficulty, figure, choice, summary, and a legacy-syllabus flag. Seed from [board-history.json](board-history.json).
- `QuestionPattern` gets its history from those rows: years asked, times asked, last asked.
- `Question` gets `patternId` and an optional `boardQuestionId` for a real board question.
- `Paper` usage: which of our own papers a question was used in, so teachers can avoid repeats. The app can already work this out.

**What teachers see:** a tag like "Asked 2023, 2025" on questions; filters for "asked in the last 3 years" or "never asked"; and in paper building, a choice to lean towards recent board types.

**Decision needed on real board questions:** the tagged history holds our own summaries and templates only, not the board's wording. Holding the real text gives teachers true previous-year questions, but it's CBSE's material. I recommend starting with the tags and history, which need no copied text, and getting advice before showing real papers' wording in a paid product.

## 5. Decisions for you

1. **Syllabus:** download the official PDF, or tick the table in Phase 0.
2. **Size:** is 20 non-repeating papers the right depth? It drives the 1,327.
3. **Reviewer:** who reads the questions, and is the sampling rule acceptable?
4. **Real board wording:** tags and history only for now (recommended), or get advice on using the text?
5. **Basic (241) history:** 102 Basic papers are downloaded; tag them when Basic is in scope.
6. **Basic (241):** do it after Standard finishes? Many questions could be shared, but its mix is easier (about 75% recall against 54%).

## 6. Limits of this analysis

- **Syllabus scope** rests on board papers and memory, not the official document.
- **Tagging** was done by AI from OCR text, with no human check. Figures are inferred from wording, because OCR drops them. Older-paper figures in particular may be undercounted.
- **Board-question links** were made by AI, chapter by chapter, from summaries; some are nearest fits in a neighbouring slot. Each chapter's notes on loose fits are worth a teacher's glance.
- **One set per series** was tagged, so variations between sets in a series aren't counted.
- **Mapping** of bank questions to patterns was judged by AI from the first 260 characters of each question.
- **Samples** in the list illustrate each pattern. I spot-checked 22 at random by hand and all were sound, but they have not gone through the full check above.
- **Marking** has not been tested through the app on real handwriting. One separate real correction exists, and a teacher hasn't checked it.
- **Some 5-mark and case targets** come from the floor, not board demand. For example, Polynomials has no 5-mark board questions in recent papers but still gets 6, for chapter tests.
