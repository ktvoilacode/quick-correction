# Marker accuracy check

Does the AI marker give the marks you would? This runs real handwritten answer sheets through the
same marker the app uses and compares its marks, question by question, with yours.

Cases hold students' work, so `cases/` and `results/` are git-ignored and stay on your machine.

## What you need

- `ANTHROPIC_API_KEY` in `.env` (see `.env.example`).
- A few answer sheets. Aim for **5 or more sheets**, from different students and chapters, with a mix of
  strong and weak answers and some messy handwriting. Small samples are only a first look; the report
  shows how much the numbers could move.

## Steps

1. **Make a paper** in the app and print it (Paper page, Print). Note its id from the address
   (`/teacher/papers/<paperId>`). Use a paper whose questions have answer keys (new papers do).
2. **Make a case:** `npm run eval:marking -- init --paper <paperId> --name <case-name>`
   This creates `evals/marking/cases/<case-name>/` with `case.json` (the questions and marking schemes)
   and `marks.csv`.
3. **Have a student answer it** on plain paper, then photograph each page, in order. Save the photos in the
   case folder as `page-1.jpg`, `page-2.jpg`, ... (JPEG, PNG or WebP, under 5 MB each, long side about
   2000 px; on a Mac, photos over 4.5 MB are shrunk for you).
4. **Mark the sheet yourself** and fill the `teacher_marks` column in `marks.csv`: a whole number per
   question, from 0 to the question's marks (0 if not attempted). The `notes` column is optional and is
   shown next to any question where the marker differs.
5. **Check:** `npm run eval:marking -- check` tells you what is missing or wrong. It calls nothing.
6. **Run:** `npm run eval:marking -- run`
   - `--runs 2` marks each sheet twice to show whether the marker is consistent.
   - `--model claude-sonnet-5-5` tries another model on the same sheets (compare cost and accuracy).
   - `--only <case-name>` runs one case.

The report is printed and saved to `evals/marking/results/<time>.md` (and `.json`).

## Reading the report

| Measure | What it means | Starting bar |
|---|---|---|
| Multiple choice exact | The marker picked the same marks as you on option questions. These have one right answer, so misses here are real faults, often a misread tick. | 95% or more |
| Written within 1 mark | Written answers where the marker is within a mark of you. Exact agreement is rare on step marks, so within 1 is the fair measure. | 85% or more |
| Sheet total off by | Average gap between the marker's total and yours. Errors in both directions can cancel, so read this with the per-question tables. | 5% of the paper or less |
| Bias | Whether it is generally more generous or stricter than you. A steady bias can be corrected in the prompt. | within 3% |

The bars are a starting point, not a rule: decide what is acceptable for your classes. Whatever the numbers,
the teacher review step stays; this tells you how much checking to expect.

Also read **Biggest misses** (the marker's comment shows why it differed, often a misread digit or a
too-strict step), **Flagged hard to read** (compare with the photo), and **Consistency** (with `--runs 2` or
more; marks that change between runs mean the sheet is borderline for the marker).

## If accuracy is not good enough

Look at the misses before changing anything. A pattern (always generous on proofs, misreading
a certain handwriting) points at the marking rules in `SYSTEM` in `src/api/lib/qc/ai-marker.ts`.
Change one thing, run the same cases again, and compare the reports. Keep the cases fixed so
the comparison is fair.
