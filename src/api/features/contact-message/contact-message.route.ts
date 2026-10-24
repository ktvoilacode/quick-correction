/**
 * Public contact-form intake.
 * @file src/api/features/contact-message/contact-message.route.ts
 *
 * POST /api/contact-message
 *   Body: { name, email, message, subject? }
 *
 * Unauthenticated on purpose — the marketing /contact page posts
 * directly. To keep it from being a spam firehose:
 *
 *   1. Rate-limited via appkit/security (5 messages per 10 minutes
 *      per IP). Tweak the constants below for your traffic.
 *   2. Requires the `contact_form_enabled` AppSetting to be "true".
 *      If the admin hasn't enabled the form, 403.
 *   3. Uses the same appkit email module as transactional email,
 *      so whatever provider the admin configured in Settings (Resend
 *      / SMTP / console) is what delivers. No separate config path.
 *   4. The recipient lives server-side in `contact_form_to_email`
 *      or falls back to `support_email`. The client never sees it,
 *      so a compromised browser can't redirect intake.
 *
 * TODO: Persist messages to a ContactMessage table so the admin can
 *   review even when email delivery fails. One Prisma model + a
 *   CRUD page slots right into the existing admin shell.
 * TODO: Add an hCaptcha / Turnstile challenge if bots bypass the
 *   rate limit. appkit doesn't ship a captcha adapter yet — add a
 *   tiny middleware in this file when you need it.
 */

import express from 'express';
import { errorClass } from '@bloomneo/appkit/error';
import { securityClass } from '@bloomneo/appkit/security';
import { loggerClass } from '@bloomneo/appkit/logger';
import { emailClass } from '@bloomneo/appkit/email';
import { databaseClass } from '@bloomneo/appkit/database';
import { auditService } from '../audit/audit.service.js';

const router = express.Router();
const error = errorClass.get();
const security = securityClass.get();
const logger = loggerClass.get('contact-message');

// 5 submissions per 10 minutes per IP. Generous enough for legit
// visitors ("let me send a second message clarifying something")
// but tight enough to make spam bots unattractive.
const submitLimit = security.requests(5, 10 * 60 * 1000, {
  message: 'Too many messages from this address. Please try again later.',
});

/**
 * Resolve the AppSetting rows we care about in one query.
 * Returns `enabled=false` if the DB is empty, so the route gates
 * on an explicit opt-in rather than accidentally running.
 */
async function loadContactConfig() {
  const db = await databaseClass.get();
  const rows = await db.appSetting.findMany({
    where: {
      key: { in: ['contact_form_enabled', 'contact_form_to_email', 'support_email'] },
    },
  });
  const byKey = new Map<string, string>(
    rows.map((r: { key: string; value: string }): [string, string] => [r.key, r.value]),
  );
  const enabled =
    (byKey.get('contact_form_enabled') ?? '').toLowerCase() === 'true';
  // Fallback chain: explicit contact_form_to_email → support_email
  // → env var. This way a brand-new app with no contact_form_to_email
  // still delivers to the support address.
  const toEmail =
    byKey.get('contact_form_to_email') ||
    byKey.get('support_email') ||
    process.env.BLOOM_EMAIL_FROM_EMAIL ||
    '';
  return { enabled, toEmail };
}

/**
 * POST /api/contact-message
 */
router.post(
  '/',
  submitLimit,
  error.asyncRoute(async (req, res) => {
    const body = (req.body ?? {}) as {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
    };

    // Minimal server-side validation. The client has the nicer UI,
    // but never trust it.
    const name = (body.name ?? '').trim();
    const email = (body.email ?? '').trim();
    const subject = (body.subject ?? '').trim();
    const message = (body.message ?? '').trim();

    if (!name) throw error.badRequest('`name` is required');
    if (!email || !/.+@.+\..+/.test(email)) {
      throw error.badRequest('`email` must look like a real address');
    }
    if (!message) throw error.badRequest('`message` is required');
    if (message.length > 5000) {
      throw error.badRequest('`message` is too long (max 5000 chars)');
    }

    const { enabled, toEmail } = await loadContactConfig();
    if (!enabled) {
      throw error.forbidden('Contact form is disabled');
    }
    if (!toEmail) {
      // The admin enabled the form but never picked a recipient.
      // Log loudly — this is a config gap, not a user error.
      logger.error('contact_form_to_email is empty; cannot route message');
      throw error.serverError(
        'Contact form recipient is not configured. Ask the admin to set contact_form_to_email.',
      );
    }

    const email_ = emailClass.get();
    try {
      await email_.send({
        to: toEmail,
        replyTo: email,
        subject: subject
          ? `[Contact] ${subject}`
          : `[Contact] New message from ${name}`,
        text: [
          'You received a new contact-form message.',
          '',
          'From: ' + name + ' <' + email + '>',
          subject ? 'Subject: ' + subject : undefined,
          '',
          message,
        ]
          .filter(Boolean)
          .join('\n'),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn('contact form delivery failed', { email, error: msg });
      // Don't leak provider details to the caller, but do fail so
      // the client can show an error toast.
      throw error.serverError('Could not send your message — please try again later');
    }

    // Audit the successful send so the admin can see contact-form
    // volume alongside other activity. Actor is 'system' (the form
    // isn't authenticated); description includes the sender email so
    // it's spottable on the audit page.
    auditService.logAudit({
      actorType: 'system',
      action: 'contact.message.sent',
      description: 'Contact form message from ' + email,
      newValue: { name, email, subject: subject || null },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined,
    });

    res.json({ ok: true });
  }),
);

/**
 * Deliberately public: a contact form is submitted by people who are not
 * signed in. The recipient address stays server-side, so publishing the
 * endpoint does not publish where it goes.
 */
export const isPublic = true;

export default router;
