# Quick Correction API

All routes need a signed-in user (`Authorization: Bearer <token>` from
`POST /api/auth/login`). An account is a **teacher** or a **parent**
(`User.appRole`). It becomes one by calling `POST /api/tutor/onboard` or by
linking a child with `POST /api/parent/link`. Each side's routes refuse the
other side with 403.

Every query is scoped to the caller in the WHERE clause: another teacher's
paper or another parent's child reads as 404.

## Teacher: `/api/tutor`

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/onboard` | none | `{ ok, appRole }`. Makes this account a teacher |
| GET | `/chapters` | none | `{ chapters }` |
| GET | `/students` | none | `{ students }` with `inviteCode`, `parentLinked`, `average`, `pending` |
| POST | `/students` | `{ name, className? }` | `{ student }` with a 6-character `inviteCode` to give the parent |
| GET | `/papers` | none | `{ papers }` with `questions`, `marks`, `assigned`, `corrected` |
| POST | `/papers` | `{ chapters?, pattern: 'unit' \| 'board', targetMarks?, title?, variant? }` | `{ paper }` with `marks` and `shortBy` (marks the bank could not reach) |
| GET | `/papers/:id` | none | `{ paper }` with `questions` and `submissions` |
| POST | `/papers/:id/assign` | `{ dueDate, studentIds? }` (all students if omitted) | `{ assigned, dueDate }` |
| GET | `/review` | none | `{ submissions }` marked but not yet checked |
| GET | `/submissions/:id` | none | `{ submission }` with `results` and `questions` |
| GET | `/submissions/:id/pages/:n` | none | the page image |
| POST | `/submissions/:id/approve` | none | `{ ok }` |
| PATCH | `/submissions/:id/results` | `{ results: [{ questionId, awarded, feedback? }] }` | `{ ok, score, max }`. Corrects marks and approves |

## Parent: `/api/parent`

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/link` | `{ inviteCode }` | `{ child }`. Makes this account a parent |
| GET | `/children` | none | `{ children }` |
| GET | `/submissions` | `?studentId=` optional | `{ submissions }` |
| GET | `/submissions/:id` | none | `{ submission }` with `questions` (to print the paper) and `results` |
| POST | `/submissions/:id/pages` | raw image body, `Content-Type: image/jpeg\|png\|webp\|heic`, ≤ 10 MB | `{ pages }`. One request per page, up to 12 |
| GET | `/submissions/:id/pages/:n` | none | the page image |
| POST | `/submissions/:id/submit` | none | `{ ok, status: 'evaluating' }`. Queues marking |

Submission status: `assigned` → `evaluating` → `evaluated` (or `failed`).

## Marking

`POST /submit` adds a `qc-mark-submission` job to the appkit queue. The worker
calls `markAnswerPages(questions, pageKeys)` in `src/api/lib/qc/marking.ts`
and saves question-wise results. That function is currently a **placeholder**;
replace its body with the vision-model call.
