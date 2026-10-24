/**
 * App settings routes.
 * @file src/api/features/settings/settings.route.ts
 *
 * Two mount points:
 *   - `GET /api/settings/public`      (unauthenticated) → typed PublicSettings
 *   - `GET /api/settings/admin/list`  (admin only)      → every row
 *   - `PUT /api/settings/admin/:key`  (admin only)      → upsert + audit
 *
 * @llm-rule WHEN: Wiring marketing-site reads or the admin settings editor
 * @llm-rule AVOID: Returning isPublic=false rows from /public — defeats the flag
 */

import express from 'express';
import { errorClass } from '@bloomneo/appkit/error';
import { authClass } from '@bloomneo/appkit/auth';
import { loggerClass } from '@bloomneo/appkit/logger';
import { emailClass } from '@bloomneo/appkit/email';
import { securityClass } from '@bloomneo/appkit/security';
import { settingsService } from './settings.service.js';
import type { UpdateSettingInput } from './settings.types.js';
import {
  envPersistenceHint,
  readEnvFile,
  writeEnvFile,
} from '../../lib/env-file.js';
import { auditService } from '../audit/audit.service.js';

const router = express.Router();
const error = errorClass.get();
const auth = authClass.get();
const security = securityClass.get();
const logger = loggerClass.get('settings-routes');

/**
 * Rate limiter for admin write endpoints. An authenticated admin is
 * not malicious by default, but a compromised admin session shouldn't
 * be able to grind every row in the settings table. 60 writes in 5
 * minutes is plenty for human editing; anything faster is automation.
 */
const adminWriteLimit = security.requests(60, 5 * 60 * 1000, {
  message: 'Too many admin writes in a short window. Try again shortly.',
});

/**
 * Heavier limit for the test-email endpoint — sending real email is
 * expensive and can trigger provider rate limits of its own.
 */
const testEmailLimit = security.requests(10, 10 * 60 * 1000, {
  message: 'Too many test emails. Try again later.',
});

/**
 * GET /api/settings/public
 * Unauthenticated. Returns typed PublicSettings (camelCase, parsed types).
 */
router.get(
  '/public',
  error.asyncRoute(async (_req, res) => {
    const settings = await settingsService.getPublicSettings();
    res.json(settings);
  }),
);

/**
 * GET /api/settings/admin/list
 * Admin only. Returns every row (public and non-public).
 */
router.get(
  '/admin/list',
  auth.requireLoginToken(),
  auth.requireUserRoles(['admin.system']),
  error.asyncRoute(async (req, res) => {
    logger.info('GET /api/settings/admin/list', { actor: req.user?.userId });
    const rows = await settingsService.getAllSettings();
    res.json({ items: rows });
  }),
);

/**
 * PUT /api/settings/admin/:key
 * Admin only. Upserts the row + fires an audit event.
 */
router.put(
  '/admin/:key',
  adminWriteLimit,
  auth.requireLoginToken(),
  auth.requireUserRoles(['admin.system']),
  error.asyncRoute(async (req, res) => {
    const key = req.params.key;
    const body = req.body as Partial<UpdateSettingInput>;
    if (!body?.value || typeof body.value !== 'string') {
      throw error.badRequest('`value` (string) is required');
    }
    if (!req.user?.userId) {
      throw error.unauthorized('login required');
    }

    logger.info('PUT /api/settings/admin/:key', {
      key,
      actor: req.user.userId,
    });

    const row = await settingsService.updateSetting(
      key,
      { value: body.value },
      {
        userId: String(req.user.userId),
        ipAddress: req.ip,
        userAgent: req.get('user-agent') ?? undefined,
      },
    );
    res.json(row);
  }),
);

/* -------------------------------------------------------------------------- */
/* Email env editor                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Keys the email-config panel in the admin UI is allowed to touch.
 * Any key outside this allow-list is rejected — we don't want the
 * admin UI turning into a general env editor that could, say,
 * rotate BLOOM_AUTH_SECRET.
 */
const EMAIL_ENV_KEYS = [
  'BLOOM_EMAIL_STRATEGY',
  'BLOOM_EMAIL_FROM_NAME',
  'BLOOM_EMAIL_FROM_EMAIL',
  'RESEND_API_KEY',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
] as const;

const EMAIL_SECRET_KEYS = new Set<string>(['RESEND_API_KEY', 'SMTP_PASS']);

function redactSecrets(values: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) {
    out[k] = EMAIL_SECRET_KEYS.has(k) && v ? '********' : v;
  }
  return out;
}

/**
 * GET /api/settings/admin/email-env
 * Admin only. Returns the current email-related env values (secrets
 * masked) plus a hint about whether writes will persist.
 */
router.get(
  '/admin/email-env',
  auth.requireLoginToken(),
  auth.requireUserRoles(['admin.system']),
  error.asyncRoute(async (_req, res) => {
    const file = readEnvFile();
    const values: Record<string, string> = {};
    for (const key of EMAIL_ENV_KEYS) {
      // Prefer the live process.env value (survives if dotenv already
      // loaded it) and fall back to the file so a stale process can
      // still show what's on disk.
      values[key] = process.env[key] ?? file[key] ?? '';
    }
    res.json({
      values: redactSecrets(values),
      // Tells the UI whether the saved values are likely to survive a
      // restart on this host. UI shows a disclaimer banner when not
      // 'reliable'.
      persistence: envPersistenceHint(),
    });
  }),
);

/**
 * PUT /api/settings/admin/email-env
 * Admin only. Merges the submitted keys into the .env file + the
 * current process.env. Only keys in EMAIL_ENV_KEYS are accepted.
 *
 * Secrets sent as '********' (the UI's placeholder for
 * "don't overwrite") are skipped — saving a partial form shouldn't
 * wipe a previously configured API key.
 */
router.put(
  '/admin/email-env',
  adminWriteLimit,
  auth.requireLoginToken(),
  auth.requireUserRoles(['admin.system']),
  error.asyncRoute(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, string>;
    const updates: Record<string, string> = {};
    const allowed = new Set<string>(EMAIL_ENV_KEYS);

    for (const [key, rawValue] of Object.entries(body)) {
      if (!allowed.has(key)) continue;
      if (typeof rawValue !== 'string') continue;
      // '********' is the UI's "no change" sentinel for secret fields.
      if (EMAIL_SECRET_KEYS.has(key) && rawValue === '********') continue;
      updates[key] = rawValue;
    }

    writeEnvFile(updates);

    // Audit the change. Mask secrets in the audit entry itself so
    // reviewing the audit log doesn't leak credentials.
    auditService.logAudit({
      actorId: String(req.user?.userId ?? ''),
      actorType: 'admin',
      action: 'email.config.update',
      entityType: 'env',
      description: 'Email provider config updated',
      newValue: Object.fromEntries(
        Object.entries(updates).map(([k, v]) => [
          k,
          EMAIL_SECRET_KEYS.has(k) ? '<redacted>' : v,
        ]),
      ),
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined,
    });

    const file = readEnvFile();
    const values: Record<string, string> = {};
    for (const key of EMAIL_ENV_KEYS) {
      values[key] = process.env[key] ?? file[key] ?? '';
    }
    res.json({
      values: redactSecrets(values),
      persistence: envPersistenceHint(),
    });
  }),
);

/**
 * POST /api/settings/admin/email-test
 * Admin only. Sends a test email to the requested address (defaults
 * to the admin's own email) using the currently-configured strategy.
 * Surfaces appkit's errors back to the UI so misconfigurations are
 * obvious ("Resend key invalid", "SMTP auth failed", etc.).
 */
router.post(
  '/admin/email-test',
  testEmailLimit,
  auth.requireLoginToken(),
  auth.requireUserRoles(['admin.system']),
  error.asyncRoute(async (req, res) => {
    const body = (req.body ?? {}) as { to?: string };
    const to = typeof body.to === 'string' && body.to.trim() ? body.to.trim() : null;
    if (!to) throw error.badRequest('`to` (string) is required');

    const email = emailClass.get();
    try {
      await email.send({
        to,
        subject: 'Bloom adminapp — test email',
        text:
          'This is a test email from your adminapp.\n\n' +
          'If you see this, your email provider is configured correctly.',
      });
      auditService.logAudit({
        actorId: String(req.user?.userId ?? ''),
        actorType: 'admin',
        action: 'email.test.send',
        description: 'Sent a test email to ' + to,
        ipAddress: req.ip,
      });
      res.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn('test email failed', { to, error: message });
      res.status(502).json({ ok: false, error: message });
    }
  }),
);

export default router;
