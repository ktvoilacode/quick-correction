/**
 * App settings service — read + write the AppSetting key-value table.
 * @file src/api/features/settings/settings.service.ts
 *
 * Two classes of consumer:
 *
 * 1. Unauthenticated marketing site — hits `/api/settings/public`. Only
 *    settings with `isPublic = true` are returned, and they're shaped
 *    into a typed `PublicSettings` object so the client doesn't have to
 *    parse key strings.
 *
 * 2. Admin console — hits `/api/settings/admin/*`. Returns the raw rows
 *    (including non-public ones) and accepts updates. Every update fires
 *    an audit event.
 *
 * @see ../../../../docs/admin-patterns.md §8 settings, §6 auditing
 * @see https://dev.bloomneo.com/adminapp/settings
 *
 * @llm-rule WHEN: Adding a new setting key, changing the public projection, or exposing a new admin-editable field
 * @llm-rule AVOID: Returning raw AppSetting rows from the public endpoint — only `isPublic=true` rows are safe, and they flow through PUBLIC_KEY_MAP so snake_case DB keys never leak to the marketing surface
 * @llm-rule NOTE: Secrets (API keys, SMTP passwords) live in .env, not AppSetting. Appkit reads env directly; the Email card in the UI writes env via a separate /api/settings/admin/email-env route
 */

import { databaseClass } from '@bloomneo/appkit/database';
import { auditService } from '../audit/audit.service.js';
import type {
  PublicSettings,
  SettingRow,
  UpdateSettingInput,
} from './settings.types.js';

/**
 * Map a raw string value to its typed shape for `PublicSettings`. Right
 * now only `feature_signup_open` needs parsing (string → boolean); add
 * more parsers here as you add setting keys.
 */
function parsePublicValue(key: string, value: string): unknown {
  if (key === 'feature_signup_open') {
    return value.toLowerCase() === 'true';
  }
  return value;
}

/**
 * Convert the snake_case DB key to the camelCase field in PublicSettings.
 * Centralized so every public-facing read uses the same shape.
 */
const PUBLIC_KEY_MAP: Record<string, keyof PublicSettings> = {
  business_name: 'businessName',
  support_email: 'supportEmail',
  support_phone: 'supportPhone',
  support_hours: 'supportHours',
  support_address: 'supportAddress',
  support_whatsapp_url: 'supportWhatsappUrl',
  feature_signup_open: 'featureSignupOpen',
};

/**
 * Keys that should land with `isPublic=true` the first time an admin
 * saves them. Without this, a brand-new install that saves
 * `support_hours` creates a row with isPublic=false — and the public
 * endpoint filters it out, so the /contact page never sees it.
 *
 * `contact_form_to_email` is intentionally NOT here — it's the recipient
 * address, and exposing it publicly would let a compromised browser
 * enumerate support routing. Only `contact_form_enabled` (the
 * render-the-form flag) gets surfaced to the public.
 */
const PUBLIC_BY_DEFAULT = new Set<string>([
  ...Object.keys(PUBLIC_KEY_MAP),
  'contact_form_enabled',
]);

export const settingsService = {
  /**
   * Returns every public setting, shaped into `PublicSettings`. Missing
   * keys are simply omitted — callers should treat every field as
   * optional and fall back to hard-coded defaults in the marketing page.
   *
   * Flat DB rows → typed nested shape. `business_*` / `support_*`
   * keys are simple top-level fields (PUBLIC_KEY_MAP). `contact_form_*`
   * keys aggregate into the nested `contactForm` object below.
   */
  async getPublicSettings(): Promise<PublicSettings> {
    const db = await databaseClass.get();
    const rows = await db.appSetting.findMany({
      where: { isPublic: true },
    });

    // Index rows by key for the nested-object construction step.
    const byKey = new Map<string, string>(
      rows.map((r: { key: string; value: string }) => [r.key, r.value]),
    );

    const out: PublicSettings = {};

    // Simple flat keys (businessName, supportEmail, etc.)
    for (const row of rows) {
      const mapped = PUBLIC_KEY_MAP[row.key];
      if (!mapped) continue;
      (out as Record<string, unknown>)[mapped] = parsePublicValue(
        row.key,
        row.value,
      );
    }

    // contactForm — expose only the enable flag publicly. Recipient
    // lives server-side so misconfigured forms can't leak arbitrary
    // to-addresses, and the rate limit + audit logic live in the
    // contact-message feature.
    const contactEnabled =
      (byKey.get('contact_form_enabled') ?? '').toLowerCase() === 'true';
    if (contactEnabled) {
      out.contactForm = { enabled: true };
    }

    return out;
  },

  /**
   * Returns every setting row, including `isPublic = false`. Admin only.
   */
  async getAllSettings(): Promise<SettingRow[]> {
    const db = await databaseClass.get();
    const rows = await db.appSetting.findMany({
      orderBy: { key: 'asc' },
    });
    return rows as SettingRow[];
  },

  /**
   * Upsert a single setting by key. First-time creates use
   * `PUBLIC_BY_DEFAULT` to decide whether the row is exposed to
   * `/api/settings/public` — keys the template ships with a clear
   * public intent (support_*, business_name, contact_form_enabled)
   * land as public so the marketing site sees them immediately after
   * an admin saves. Unknown keys default to private; flip via a
   * future PATCH { isPublic } endpoint or directly in the DB.
   *
   * Fires an audit event with before/after value. `updatedBy` is stored
   * so the admin audit page can attribute the change.
   */
  async updateSetting(
    key: string,
    input: UpdateSettingInput,
    actor: { userId: string; ipAddress?: string; userAgent?: string },
  ): Promise<SettingRow> {
    const db = await databaseClass.get();

    const previous = await db.appSetting.findUnique({ where: { key } });

    // Self-heal: if the key belongs to PUBLIC_BY_DEFAULT and the
    // existing row was accidentally created with isPublic=false (an
    // early bug), promote it now. Admins who deliberately set a known-
    // public key to private can flip it back via a future PATCH
    // endpoint — that's not a flow we support today.
    const shouldPromote =
      previous !== null &&
      !previous.isPublic &&
      PUBLIC_BY_DEFAULT.has(key);

    const row = await db.appSetting.upsert({
      where: { key },
      update: {
        value: input.value,
        updatedBy: actor.userId,
        ...(shouldPromote ? { isPublic: true } : {}),
      },
      create: {
        key,
        value: input.value,
        isPublic: PUBLIC_BY_DEFAULT.has(key),
        updatedBy: actor.userId,
      },
    });

    auditService.logAudit({
      actorId: actor.userId,
      actorType: 'admin',
      action: 'settings.update',
      entityType: 'setting',
      entityId: key,
      oldValue: previous ? { value: previous.value } : null,
      newValue: { value: input.value },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return row as SettingRow;
  },
};
