/**
 * Marking — turns a submission's answer pages into question-wise marks.
 *
 * The AI marker is not connected yet. `markAnswerPages` is the one seam it
 * plugs into: it receives the paper's questions and the stored page images
 * and must return results in this shape. Until then a PLACEHOLDER marker
 * returns plausible marks and says so in the summary, so nobody mistakes
 * them for a real correction.
 *
 * Jobs run on the appkit queue (memory transport in dev, Redis when
 * REDIS_URL is set), so an upload returns straight away and the marks land
 * a few seconds later.
 */
import { createHash } from 'node:crypto';
import { databaseClass } from '@bloomneo/appkit/database';
import { queueClass } from '@bloomneo/appkit/queue';
import { loggerClass } from '@bloomneo/appkit/logger';
import { questionsByIds, type Question, type LayoutSection } from './questions.js';

const logger = loggerClass.get('marking');
const JOB = 'qc-mark-submission';

export type QuestionResult = { questionId: string; awarded: number; max: number; feedback: string };
export type MarkingOutcome = { results: QuestionResult[]; score: number; max: number; summary: string };

const GOOD = ['Correct method and answer.', 'Well presented with all steps.'];
const PART = ['Method is right but a calculation slip in the last step.', 'Formula correct; final answer not simplified.', 'Missing the concluding statement — partial marks.'];
const BAD = ['Incorrect option chosen.', 'Wrong formula applied.', 'Not attempted.'];

/** Same submission → same marks, so re-running a job is stable. */
function seeded(seed: string) {
  let s = createHash('sha256').update(seed).digest().readUInt32LE(0);
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/**
 * The seam for the AI marker. Replace the body with: send the page images
 * and the questions (with the marking scheme) to a vision model, parse its
 * question-wise marks, return them here.
 */
export async function markAnswerPages(questions: Question[], pageKeys: string[], seed: string): Promise<MarkingOutcome> {
  const r = seeded(seed);
  const results = questions.map((q) => {
    const roll = r();
    if (roll > 0.55) return { questionId: q.id, awarded: q.marks, max: q.marks, feedback: GOOD[Math.floor(r() * GOOD.length)] };
    if (roll > 0.25 && q.marks > 1) return { questionId: q.id, awarded: Math.max(1, Math.round(q.marks * 0.6)), max: q.marks, feedback: PART[Math.floor(r() * PART.length)] };
    return { questionId: q.id, awarded: 0, max: q.marks, feedback: BAD[Math.floor(r() * BAD.length)] };
  });
  const score = results.reduce((n, x) => n + x.awarded, 0);
  const max = results.reduce((n, x) => n + x.max, 0);
  const summary = `Scored ${score}/${max} across ${pageKeys.length} page${pageKeys.length === 1 ? '' : 's'}. ` +
    '(Placeholder marking — the AI marker is not connected yet.)';
  return { results, score, max, summary };
}

async function runJob({ submissionId }: { submissionId: string }) {
  const db = await databaseClass.get();
  const sub = await db.submission.findUnique({ where: { id: submissionId }, include: { paper: true } });
  if (!sub || sub.status !== 'evaluating') return;
  try {
    const questions = await questionsByIds(sub.paper.questionIds as string[], { layout: sub.paper.layout as LayoutSection[] | null, withAnswers: true });
    const out = await markAnswerPages(questions, sub.pages as string[], sub.id);
    await db.submission.update({
      where: { id: sub.id },
      data: { status: 'evaluated', results: out.results, score: out.score, max: out.max, summary: out.summary, reviewed: false },
    });
    logger.info('Submission marked', { submissionId, score: out.score, max: out.max });
  } catch (err: any) {
    await db.submission.update({ where: { id: sub.id }, data: { status: 'failed' } });
    logger.error('Marking failed', { submissionId, error: err?.message });
    throw err;
  }
}

// Created when this module loads (at server start), not on the first upload:
// the database transport connects asynchronously in its constructor, so a job
// added in the same tick as the first queueClass.get() hits a client that
// isn't there yet.
const queue = queueClass.get();
queue.process<{ submissionId: string }>(JOB, runJob, { timeout: 120_000 });

/** Queue a submission for marking. */
export async function queueMarking(submissionId: string) {
  await queue.add(JOB, { submissionId }, { attempts: 2, backoff: 'exponential' });
}
