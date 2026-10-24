/**
 * FBCA Auto-Discovery Router
 * @module medhamark/api-router
 * @file medhamark/src/api/lib/api-router.ts
 *
 * @llm-rule WHEN: Need automatic API route discovery based on feature directories
 * @llm-rule AVOID: Manual route registration - defeats FBCA auto-discovery purpose
 * @llm-rule NOTE: Follows {featureName}/{featureName}.route.ts naming convention for TypeScript or .js for JavaScript
 */

import express from 'express';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { readdir, readFile } from 'fs/promises';
import { loggerClass } from '@bloomneo/appkit/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function createApiRouter() {
  const router = express.Router();
  const discoveredRoutes: string[] = [];
  const logger = loggerClass.get('api-router');

  // API root route - list available endpoints
  router.get('/', (_req, res) => {
    res.json({
      message: 'API Server - Feature-Based Component Architecture',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        api: '/api',
        features: discoveredRoutes.map(route => `/api${route}`)
      },
      timestamp: new Date().toISOString()
    });
  });

  try {
    // Auto-discover feature routes
    const featuresPath = join(__dirname, '../features');
    const features = await readdir(featuresPath, { withFileTypes: true });

    logger.info('🔍 Discovering API routes:');

    for (const feature of features) {
      if (feature.isDirectory()) {
        const featureName = feature.name;
        // Try .ts first, then .js
        const routeFiles = [
          join(featuresPath, featureName, `${featureName}.route.ts`),
          join(featuresPath, featureName, `${featureName}.route.js`)
        ];

        /*
         * Warn when a feature exposes routes with no auth guard at all.
         *
         * This is the last silent failure in a scaffolded Bloom app: a route
         * file written without `router.use(auth.requireLoginToken())` starts
         * cleanly, mounts with a normal log line, and serves whatever it
         * queries to anyone who asks. Nothing in typecheck, the build or the
         * boot sequence objects. For an agent that is the worst possible
         * shape — every signal reports success.
         *
         * Detection reads the SOURCE rather than inspecting the mounted
         * router, because appkit's guards are anonymous closures that are
         * indistinguishable at runtime from any other middleware — a router
         * carrying only a logger would look guarded.
         *
         * Opt out for genuinely public surfaces with `export const isPublic
         * = true`. A check that cannot be opted out of is a check that gets
         * commented out wholesale.
         */
        try {
          const source = await readFile(routeFiles[0], 'utf8').catch(() => readFile(routeFiles[1], 'utf8'));
          const hasGuard = /\bauth\s*\.\s*require[A-Z]\w*\s*\(/.test(source);
          const optedOut = /\bexport\s+const\s+isPublic\s*=\s*true/.test(source);

          if (!hasGuard && !optedOut) {
            logger.warn(
              `  ⚠️  /api/${featureName} has NO auth guard — every route in it is public.\n` +
                `      Add \`router.use(auth.requireLoginToken())\` near the top of ` +
                `${featureName}.route.ts,\n` +
                `      or declare it deliberately public with \`export const isPublic = true\`.`,
            );
          }
        } catch {
          // unreadable source is already reported by the mount loop below
        }

        /*
         * Warn about route files this loop will never load.
         *
         * Discovery matches exactly `<feature>/<feature>.route.ts`. Any other
         * `.route.ts` in the folder is ignored — and used to be ignored
         * silently, so the endpoint simply 404'd with nothing in the log to
         * explain it. An agent debugging that has no signal at all to work
         * from, and a human wastes the same time more suspiciously.
         */
        try {
          const siblings = await readdir(join(featuresPath, featureName));
          for (const f of siblings) {
            if (!/\.route\.(ts|js)$/.test(f)) continue;
            if (f === `${featureName}.route.ts` || f === `${featureName}.route.js`) continue;
            logger.warn(
              `  ⚠️  ${featureName}/${f} is NOT mounted — discovery only loads ` +
                `${featureName}.route.ts. Move these handlers into that file, or ` +
                `give them their own feature folder.`,
            );
          }
        } catch {
          // unreadable folder is reported by the loop below
        }

        let loaded = false;
        let loadError: Error | null = null;
        for (const routeFile of routeFiles) {
          try {
            const fileUrl = pathToFileURL(routeFile).href;
            const { default: featureRouter } = await import(fileUrl);
            router.use(`/${featureName}`, featureRouter);
            discoveredRoutes.push(`/${featureName}`);
            const fileType = routeFile.endsWith('.ts') ? '.ts' : '.js';
            logger.info(`  /api/${featureName} -> ${featureName}.route${fileType}`);
            loaded = true;
            break;
          } catch (error) {
            /*
             * Keep the real reason.
             *
             * A missing file and a file that threw while loading are very
             * different problems, and this loop used to flatten both into
             * "Could not load route". The thrown case is where the useful
             * message lives — appkit's guards validate their arguments and
             * report precisely (`Invalid role.level for middleware:
             * "administrator"`), and discarding that leaves an agent with a
             * generic warning and nowhere to look.
             */
            const isMissingFile =
              (error as NodeJS.ErrnoException)?.code === 'ERR_MODULE_NOT_FOUND' &&
              String((error as Error)?.message ?? '').includes(routeFile);
            if (!isMissingFile) loadError = error as Error;
          }
        }

        if (!loaded) {
          if (loadError) {
            logger.warn(
              `⚠️  /api/${featureName} failed to load — the feature is NOT mounted.\n` +
                `      ${loadError.message.split('\n')[0]}\n` +
                `      in ${featureName}/${featureName}.route.ts`,
            );
          } else {
            logger.warn(
              `⚠️  features/${featureName}/ has no ${featureName}.route.ts — nothing was mounted. ` +
                `Discovery looks for that exact filename.`,
            );
          }
        }
      }
    }

    logger.info('✅ API routes discovered');

  } catch (error) {
    logger.warn('⚠️ No features directory found');
  }

  return router;
}