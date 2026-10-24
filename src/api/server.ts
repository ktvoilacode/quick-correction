/**
 * FBCA Backend API Server with AppKit integration
 * @module bloomneo/server
 * @file bloomneo/src/api/server.ts
 *
 * @llm-rule WHEN: Creating backend APIs with Feature-Based Component Architecture
 * @llm-rule AVOID: Using without AppKit modules - breaks structured logging and error handling
 * @llm-rule NOTE: Auto-discovers features in features/ directory using naming convention
 */

import 'dotenv/config';
import express, { type Request } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { loggerClass } from '@bloomneo/appkit/logger';
import { errorClass } from '@bloomneo/appkit/error';
import { configClass } from '@bloomneo/appkit/config';
import { createApiRouter } from './lib/api-router.js';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize AppKit modules following the pattern
const logger = loggerClass.get('server');
const error = errorClass.get();
const config = configClass.get();

/**
 * Check if frontend build exists
 */
function checkFrontendExists(distPath: string): boolean {
  try {
    const indexPath = path.join(distPath, 'index.html');
    return fs.existsSync(indexPath);
  } catch {
    return false;
  }
}

const app = express();
const PORT = config.get('server.port', process.env.PORT || 3000);

/** Express's Request with the id the correlation middleware attaches. */
type RequestWithId = Request & { requestId?: string };

// Middleware (following AppKit recommended order)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/*
 * ── Request correlation ────────────────────────────────────────────────────
 *
 * Every request gets an id, echoed back as `x-request-id` and attached to the
 * log line it produces. Without one, a browser-side failure and the server log
 * that explains it are two facts with nothing joining them — you are left
 * matching timestamps by eye, and on a busy log that is guesswork.
 *
 * With it, `shared/api.ts` puts the id on the thrown ApiError, so the message
 * a user or an agent sees names the exact line to grep for.
 *
 * An inbound x-request-id is honoured so a proxy or a caller can supply its own
 * and the trace survives the hop.
 */
app.use((req, res, next) => {
  const incoming = req.get('x-request-id');
  const requestId = incoming && incoming.length <= 200 ? incoming : randomUUID();

  (req as RequestWithId).requestId = requestId;
  res.setHeader('x-request-id', requestId);

  /*
   * ── Why the facts live in the MESSAGE, not the metadata object ────────────
   *
   * The obvious version of this passes the method, url, id and ip as a second
   * argument, and that is what shipped. Two problems, both visible only in real
   * output:
   *
   *   Under the default 'minimal' scope the metadata object is DROPPED, so it
   *   printed three bare words and refused to say which request they described.
   *
   *   Under 'full' it printed thirteen lines per request, four of them
   *   (service, version, environment, component) identical on every line.
   *   Seven requests came to 321 lines of log.
   *
   * Neither is readable, and for an agent reading back its own server output
   * the second is worse than the first: it burns the context window on
   * boilerplate. Putting the facts in the message string gives one line that
   * survives BOTH scopes intact.
   *
   * ── Logged on finish, not on arrival ──────────────────────────────────────
   *
   * The old line fired when the request arrived, so it could not carry a status
   * or a duration — the log could not tell you whether anything SUCCEEDED. This
   * waits for 'finish', the only point where the outcome is known.
   *
   * Format, kept deterministic so it greps cleanly:
   *     GET /api/customers -> 200 23ms req=db4a8f82
   *
   *     grep 'req=db4a8f82'    one request, end to end
   *     grep -- '-> 5'         every server error
   *
   * The level tracks the status, so filtering by level yields real signal
   * rather than a stream of INFO with the failures buried in it.
   */
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const line =
      `${req.method} ${req.originalUrl} -> ${res.statusCode} ` +
      `${ms.toFixed(1)}ms req=${requestId.slice(0, 8)}`;

    if (res.statusCode >= 500) logger.error(line);
    else if (res.statusCode >= 400) logger.warn(line);
    else logger.info(line);
  });

  next();
});

/*
 * ── Frontend key: decided once, at boot ────────────────────────────────────
 *
 * This block used to skip the check only when NODE_ENV was exactly the string
 * "development", and otherwise warn that the key was missing in production.
 *
 * Node does not default NODE_ENV to anything — it is undefined unless someone
 * sets it, and no dev script here does. So a plain `npm run dev` took neither
 * branch as intended: the skip did not fire, and the warning named PRODUCTION
 * on a developer's laptop, once per request, forever.
 *
 * Two things were wrong with that, and the second is the worse one:
 *   1. it named the wrong environment, and
 *   2. it repeated a STATIC FACT — whether an env var is set — every request.
 *
 * A warning that fires on every request is one you learn to scroll past, and
 * the next real warning goes with it. Configuration is settled at boot, so it
 * is reported at boot, once, and the request path stays quiet.
 */
const FRONTEND_KEY = process.env.BLOOM_FRONTEND_KEY;
// Anything not explicitly production counts as development — the safe reading
// of an unset NODE_ENV: quiet locally, never skips the check in production.
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (!IS_PRODUCTION) {
  logger.info('🔓 Frontend key check disabled (NODE_ENV is not "production")');
} else if (!FRONTEND_KEY) {
  logger.warn(
    '⚠️  BLOOM_FRONTEND_KEY is not set while NODE_ENV=production — the API is ' +
    'accepting requests from any origin. Set BLOOM_FRONTEND_KEY to enforce it.',
  );
}

app.use('/api', (req, res, next) => {
  // Skip for specific endpoints
  if (req.path === '/' || req.path === '') return next();

  if (!IS_PRODUCTION) return next();

  const frontendKey = req.headers['x-frontend-key'] as string;
  const expectedKey = FRONTEND_KEY;

  // Already reported at boot; not repeated per request.
  if (!expectedKey) {
    return next(); // Fail gracefully
  }

  // Check if frontend key is provided and matches
  if (!frontendKey) {
    logger.warn(`frontend-key missing: ${req.method} ${req.originalUrl}`);
    return res.status(403).json({
      error: 'Frontend access key required',
      message: 'API access requires valid frontend key in X-Frontend-Key header'
    });
  }

  if (frontendKey !== expectedKey) {
    // Only a prefix of the offered key is logged — enough to tell a stale build
    // from a hostile caller, not enough to be a secret sitting in the log.
    logger.warn(
      `frontend-key invalid: ${req.method} ${req.originalUrl} ` +
      `offered=${frontendKey.slice(0, 8)}…`,
    );
    return res.status(403).json({
      error: 'Invalid frontend access key',
      message: 'The provided frontend key is not valid'
    });
  }

  /*
   * The success case is deliberately silent. It fired on EVERY authenticated
   * request in production, which is the shape of noise that hides the two
   * warnings above it — the only two lines here anyone needs to see.
   */
  next();
});

// Health check with AppKit integration
app.get('/health', error.asyncRoute(async (_req, res) => {
  // Deliberately silent: a load balancer polls this every few seconds,
  // and the request middleware records it with a status and duration.

  const healthData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.get('app.environment', 'development')
  };

  res.json(healthData);
}));

// Initialize server with async setup
async function startServer() {
  try {
    logger.info('Initializing server...');

    // API routes with auto-discovery
    app.use('/api', await createApiRouter());

    /*
     * Unmatched /api/* is a 404, not the single-page app.
     *
     * The SPA fallback below is a catch-all, and its comment claimed it served
     * index.html "for all non-API routes" — but nothing excluded /api, so a path
     * matching no route fell straight through to it. GET /api/does-not-exist
     * answered 200 with a full HTML page.
     *
     * That is the exact failure shared/api.ts had to grow a content-type check to
     * survive: the client asked for JSON, got a webpage, and reported a parse
     * error far from the mistyped path that caused it. A wrong route should say
     * so, here, in the shape the caller expected.
     */
    app.use('/api', (req, res) => {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: `No API route matches ${req.method} /api${req.path}`,
      });
    });

    // Check if frontend build exists and we're not in API-only dev mode
    const distPath = path.join(__dirname, '../../dist');
    const frontendExists = checkFrontendExists(distPath);
    const isApiOnlyMode = process.env.NODE_ENV !== 'production' && process.env.API_ONLY === 'true';

    // Facts in the message: under the default scope the metadata object is
    // dropped, and this line then reads "Frontend check:" followed by nothing.
    logger.info(
      `frontend: ${frontendExists ? `found at ${distPath}` : 'not built'}` +
      `${isApiOnlyMode ? ' (API_ONLY set)' : ''}`,
    );

    if (frontendExists && !isApiOnlyMode) {
      // Serve static files from dist directory (production frontend)
      logger.info('🌐 Serving frontend from dist directory');
      app.use(express.static(distPath));

      // SPA fallback. /api is handled above, so anything reaching here is
      // a page route.
      app.get('*', (_req, res) => {
        const indexPath = path.join(distPath, 'index.html');
        res.sendFile(indexPath, (err) => {
          if (err) {
            logger.error(`Failed to serve index.html from ${indexPath}: ${err.message}`);
            res.status(404).json({
              error: 'Frontend not found',
              message: 'Frontend files exist but failed to serve'
            });
          }
        });
      });
    } else {
      // Fallback to /api route when no frontend
      logger.info('🔧 No frontend found, redirecting root to /api');
      app.get('/', (_req, res) => {
        logger.info('Root route requested, redirecting to /api');
        res.redirect('/api');
      });
    }

    // AppKit error handling middleware (ALWAYS LAST)
    app.use(error.handleErrors());

    app.listen(PORT, () => {
      // One line, because it is one fact: the server is up, in this mode, here.
      const mode = frontendExists ? 'full-stack' : 'api-only';
      logger.info(`ready ${mode} on http://localhost:${PORT} (api /api, health /health)`);
    });

  } catch (err: any) {
    /*
     * The reason goes in the MESSAGE. Both of these passed the error as
     * metadata, which the default 'minimal' scope drops — so a server that
     * refused to boot printed a bare sentence and discarded the one fact
     * worth having.
     */
    logger.error(`Server startup failed: ${err?.message ?? err}`);
    if (err?.stack) logger.error(String(err.stack));
    process.exit(1);
  }
}

startServer();