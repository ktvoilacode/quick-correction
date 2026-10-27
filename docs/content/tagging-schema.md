# Tagging schema for CBSE Class 10 Maths board questions

Used to turn each previous-year paper into structured rows. One row per
question (a case study is one row; list its sub-parts in `parts`).

## Row fields

| field | values |
|---|---|
| `year` | 2022–2026 |
| `series` | paper series, e.g. `30/1/1` |
| `qno` | question number as printed |
| `section` | `A`–`E` (A 1 mark, B 2, C 3, D 5, E case study 4; 2022 had no E: see note) |
| `marks` | marks for the question |
| `type` | `mcq`, `assertion_reason`, `short`, `long`, `case` |
| `chapter` | exactly one of the chapter names below |
| `topic` | one of the topics listed for that chapter, or `NEW: <name>` |
| `alsoTouches` | other chapters involved, if any (else `[]`) |
| `complexity` | `easy`, `medium`, `hard` (judge from steps and insight needed) |
| `competency` | `true` if it is an application / real-life / higher-order question, `false` if recall or routine |
| `internalChoice` | `true` if the question has an "OR" alternative |
| `hasFigure` | `true` if a diagram is printed |
| `summary` | your OWN paraphrase, at most 25 words, of what is asked. Never copy the question wording |
| `template` | a reusable template of the question with `{placeholders}` for the numbers/objects, in your own words |
| `parts` | for `case` only: array of `{label, marks, summary}` |
| `confidence` | `high`, `medium`, `low` (low when the OCR text was unreadable) |

## Chapters (use these names exactly)

Real Numbers · Polynomials · Pair of Linear Equations · Quadratic Equations · Arithmetic Progressions · Triangles · Coordinate Geometry · Trigonometry · Circles · Areas Related to Circles · Surface Areas and Volumes · Statistics · Probability

`Trigonometry` covers both "Introduction to Trigonometry" and "Some Applications of Trigonometry".

## Topics per chapter

- **Real Numbers**: Euclid's division lemma; HCF and LCM by prime factorisation; HCF-LCM relation; word problems on HCF/LCM; irrational numbers proof; decimal expansions of rationals; fundamental theorem of arithmetic
- **Polynomials**: zeroes from a graph; zeroes and coefficients relations; forming a polynomial from zeroes; value of k from a zero; division algorithm for polynomials
- **Pair of Linear Equations**: consistency conditions; solving by substitution/elimination; word problems (age, speed, fractions, money); graphical solution; finding unknown constants
- **Quadratic Equations**: nature of roots by discriminant; solving by factorisation or formula; word problems (speed/time, area, numbers); value of k for equal roots
- **Arithmetic Progressions**: nth term; sum of n terms; finding n; word problems; common difference; middle terms and conditions for AP
- **Triangles**: similarity criteria; basic proportionality theorem; areas of similar triangles; proofs on similar triangles; Pythagoras theorem and its converse; shadow/ladder problems
- **Coordinate Geometry**: distance formula; section formula; midpoint; collinearity and area of triangle; finding a point or ratio; geometric shapes from coordinates
- **Trigonometry**: trigonometric ratios of standard angles; evaluating expressions; identities and proofs; ratio from a given ratio; heights and distances (single or two angles of elevation/depression)
- **Circles**: tangent perpendicular to radius; tangents from an external point; proofs with tangents; angle and length problems with tangents; circle touching sides of a figure
- **Areas Related to Circles**: area and perimeter of sector; arc length; segment area; combination figures (shaded regions); wheel/clock/garden/wiper contexts
- **Surface Areas and Volumes**: combination of solids; conversion/melting and recasting; frustum; surface area of combination; capacity and cost problems
- **Statistics**: mean (direct, assumed mean, step deviation); median of grouped data; mode of grouped data; relation between mean/median/mode; cumulative frequency and ogives; missing frequency
- **Probability**: classical probability basics; cards; dice (one or two); coins; balls/bags; numbers/lottery; complementary events; probability of a given outcome count

## Rules for the tagger

- Read the OCR text of the English questions only. Ignore Hindi text and general instructions.
- OCR garbles maths symbols; infer the question from context. If a question is unreadable, tag it with `confidence: low` and your best guess.
- When a paper repeats the same question in a different set, it appears only once because only one set per series is processed.
- Do NOT copy question wording. `summary` and `template` must be your own words.
- The numbers a paper is expected to have: 38 questions (20 A, 5 B, 6 C, 4 D, 3 E) in the 2023 to 2026 papers. The 2022 board paper was the Term-2 exam (40 marks, fewer questions, case-based questions in a separate section), so tag what is printed and set `section` to the printed section letter; do not force it into A–E. Report any paper whose count differs and why.
- Output one JSON file per paper and a short note of any problems.
