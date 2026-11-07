# AI marking

Answer-page photos are marked by Claude against the answer key stored with each question.
A teacher still checks and approves the marks before parents rely on them.

## Set up

Add an API key to `.env` (see `.env.example`) and restart the API:

```
ANTHROPIC_API_KEY=sk-ant-...
# optional, default claude-opus-5-5
MARKER_MODEL=claude-opus-5-5
```

Without a key, pages get placeholder marks and the summary says so ("Placeholder marking").

## How it works

`src/api/lib/qc/ai-marker.ts` sends one request per submission: the questions with their marking
schemes (text), then each page as an image, in order. The reply is structured (one entry per
question: marks, a short comment, whether the answer was attempted and legible, and a summary).
It is checked before it is stored: one entry per question, whole marks from 0 to the maximum, a
missing question counts as "not found". Questions the marker found hard to read are flagged
"Hard to read" on the teacher's page.

If marking fails (service busy, bad key, refusal, unreadable photo) the submission is set to
`failed` with the reason in `summary`; the teacher can press "Try again". "Mark again" on a marked
paper re-runs the marker and replaces any edits.

## Photos

The marker reads JPEG, PNG and WebP up to 5 MB per page. The web app shrinks photos to 2000 px on
the long side before upload; HEIC is not accepted by the API (phones convert to JPEG on upload).

## Checking accuracy

See `evals/marking/README.md` for how to compare the marker with your own marks on real answer sheets.

## Privacy

Answer photos and question text are sent to the Anthropic API to be marked. Tell parents and
schools this in the privacy policy, and check the data-retention terms of your Anthropic account
before using real students' work.
