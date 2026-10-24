/**
 * Client error reporting — the browser half of the log.
 *
 * Route: POST /api/client-error
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * The page router has always accepted an `onError` callback and no template
 * ever passed one, so a React render crash called nothing. The only other
 * report was a `console.error` guarded by a NODE_ENV check — dev-only. In
 * production a page could throw, blank out, and leave no trace anywhere.
 *
 * That is the one place the server log could not see. Everything else — every
 * request, every failure, every warning — lands in one stream that a person or
 * an agent can read back. A browser crash was invisible in exactly the way that
 * matters most, because it is the failure a user actually notices.
 *
 * So the browser reports here, and the report is logged in the same format,
 * through the same logger, next to the request that served the page.
 */
import express from 'express';
import { errorClass } from '@bloomneo/appkit/error';
import { loggerClass } from '@bloomneo/appkit/logger';
import { securityClass } from '@bloomneo/appkit/security';

const router = express.Router();
const error = errorClass.get();
const logger = loggerClass.get('client-error');
const security = securityClass.get();

/** The id server.ts attaches to every request. */
type RequestWithId = express.Request & { requestId?: string };

/*
 * A crashing page can crash repeatedly, and a report endpoint that a loop can
 * hammer is a denial-of-service surface pointed at your own log. Cap it.
 */
const reportRateLimit = security.requests(30, 60 * 1000, {
  message: 'Too many client error reports.',
});

/** Truncate anything the browser sends: the log line is not a dumping ground. */
function clamp(value: unknown, max: number): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? null);
  if (typeof text !== 'string') return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

router.post('/', reportRateLimit, error.asyncRoute(async (req, res) => {
  const { message, stack, source, url, componentStack } = req.body ?? {};

  /*
   * Logged as `error`, because from the user's side it is one — the page they
   * were on stopped working. It carries the browser's own requestId so a
   * report can be tied to the exact page load that produced it.
   */
  const requestId = (req as RequestWithId).requestId;
  logger.error(
    `client ${clamp(source ?? 'error', 24)}: ${clamp(message, 300)} ` +
    `page=${clamp(url, 200)} req=${requestId?.slice(0, 8) ?? 'none'}`,
  );

  /*
   * A React component stack runs to the root: the crashing component, then
   * Suspense, Outlet, Shell, AuthGuard, div, div… Those tail frames are
   * identical for every crash in the app, so they are the boilerplate problem
   * again — pages of context that say nothing about THIS failure.
   *
   * The top frames are the whole answer: they name the component and the file
   * and line it threw at.
   */
  const trace = componentStack || stack;
  if (trace) {
    const frames = String(trace)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 5);
    logger.error(`  ${frames.join('\n  ')}`);
  }

  // 202 Accepted: this is fire-and-forget telemetry. The browser is not waiting
  // on an outcome, and the reporter never reads the body — deliberately, since
  // parsing a response inside an error handler is one more thing that can throw.
  res.status(202).json({ received: true });
}));

/**
 * Deliberately public. A page can throw before sign-in, or because the session
 * expired — the moments most worth hearing about are exactly the ones where
 * requiring a valid token would drop the report.
 */
export const isPublic = true;

export default router;
