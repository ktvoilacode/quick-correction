/**
 * Report a browser-side failure to the server log.
 *
 * ── Why not just console.error ────────────────────────────────────────────
 * Because nobody is looking at that console. The server log is the one place
 * where a person or an agent reads back what happened, and until now a page
 * that threw left no mark on it — the crash a user actually notices was the
 * one failure the log could not see.
 *
 * ── Rules this file obeys, because an error reporter that misbehaves is worse
 *    than none ─────────────────────────────────────────────────────────────
 *
 *   It never throws. Everything is wrapped; a failed report is swallowed. A
 *   reporter that raises inside an error handler turns one bug into two, and
 *   the second one hides the first.
 *
 *   It never uses `@/shared/api`. That client throws ApiError on failure, and
 *   a throw here could re-enter the very handler that called us. Raw fetch, no
 *   interpretation of the response.
 *
 *   It deduplicates. A render loop can throw the same error hundreds of times
 *   a second; forwarding all of them would flood the log it is trying to make
 *   readable, and hand an agent a thousand copies of one fact.
 */
import type { ApiRoute } from './api-routes';
import { lastRequestId } from './api';

const ENDPOINT: ApiRoute = '/api/client-error';
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const FRONTEND_KEY = import.meta.env.VITE_FRONTEND_KEY as string | undefined;

/** Signatures already sent — the same fault is reported once per page load. */
const seen = new Set<string>();

/** A hard ceiling, so a novel-per-iteration loop still cannot flood the log. */
const MAX_REPORTS = 20;
let sent = 0;

export interface ClientErrorReport {
  /** Where it came from: 'render' | 'window' | 'unhandledrejection'. */
  source: string;
  message: string;
  stack?: string;
  /** React's component stack, when the error came from a render. */
  componentStack?: string;
}

export function reportClientError(report: ClientErrorReport): void {
  try {
    if (sent >= MAX_REPORTS) return;

    const signature = `${report.source}:${report.message}:${(report.stack ?? '').slice(0, 200)}`;
    if (seen.has(signature)) return;
    seen.add(signature);
    sent += 1;

    const body = JSON.stringify({
      source: report.source,
      message: report.message,
      stack: report.stack,
      componentStack: report.componentStack,
      url: window.location.href,
      // The last API call this page made. A crash usually follows one, and this
      // is what ties the browser's story to the server's.
      lastApiRequestId: lastRequestId(),
    });

    void fetch(`${BASE}${ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(FRONTEND_KEY ? { 'X-Frontend-Key': FRONTEND_KEY } : {}),
      },
      body,
      // Survives the page being torn down mid-report.
      keepalive: true,
    }).catch(() => {
      /* Reporting is best-effort. There is nowhere better to complain to. */
    });
  } catch {
    /* See above: this function does not get to fail loudly. */
  }
}

/**
 * Catch the failures React's error boundary never sees: errors thrown outside
 * render, and promise rejections nobody handled.
 *
 * Call once, at startup.
 */
export function installGlobalErrorReporting(): void {
  window.addEventListener('error', (event) => {
    reportClientError({
      source: 'window',
      message: event.message || String(event.error ?? 'unknown error'),
      stack: event.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason: unknown = event.reason;
    reportClientError({
      source: 'unhandledrejection',
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}
