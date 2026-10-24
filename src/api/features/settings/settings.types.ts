/**
 * App settings types — typed shapes for the key-value store.
 * @file src/api/features/settings/settings.types.ts
 *
 * The `AppSetting` Prisma model is untyped key-value — value is always a
 * string. That's fine for storage, but the public endpoint wants a typed
 * object (`{ businessName, supportEmail, supportPhone }`) so the
 * marketing site can read it without re-parsing on every request.
 * This file defines that typed shape and the list of keys that surface
 * publicly.
 *
 * TODO: If you add a setting, update:
 *   1. Add the key to KNOWN_SETTING_KEYS below
 *   2. Add a field to PublicSettings if it should be readable without auth
 *   3. Update settings.service.ts::getPublicSettings to map it
 *   4. Consider adding a seed default in prisma/seeding/ so the key exists
 */

/**
 * Every setting key the adminapp template ships with. Add more here as
 * you grow — agents should lean on this list rather than writing free-form
 * strings, because the settings page renders groups based on prefixes
 * (`business_*`, `support_*`, etc.).
 */
export const KNOWN_SETTING_KEYS = [
  'business_name',
  // Support / contact details — every one of these is isPublic=true
  // and flows into getPublicSettings for the marketing /contact page.
  // Admins edit them in Settings → Contact, the page picks up the
  // changes on next reload.
  'support_email',
  'support_phone',
  'support_hours',
  'support_address',
  'support_whatsapp_url',
  'feature_signup_open',
  // Contact-form routing — server-side (isPublic=false). Public
  // endpoint surfaces only the `enabled` flag so the marketing page
  // knows whether to render the form; the recipient + rate limit
  // live in api/features/contact-message/ so a compromised browser
  // can't redirect intake.
  'contact_form_enabled',
  'contact_form_to_email',
] as const;

export type SettingKey = (typeof KNOWN_SETTING_KEYS)[number];

/**
 * One row as stored.
 */
export interface SettingRow {
  key: string;
  value: string;
  isPublic: boolean;
  description: string | null;
  updatedAt: Date;
  updatedBy: string | null;
}

/**
 * Typed public-settings projection returned by `GET /api/settings/public`.
 * Every field is optional because a setting row may not exist yet (first
 * boot, before seed). The marketing page falls back to sane defaults if
 * any field is missing.
 */
export interface PublicSettings {
  businessName?: string;
  supportEmail?: string;
  supportPhone?: string;
  /** Operating hours string — freeform, e.g. "Mon–Fri, 9am–6pm IST". */
  supportHours?: string;
  /** Mailing address — freeform, may include newlines. */
  supportAddress?: string;
  supportWhatsappUrl?: string;
  featureSignupOpen?: boolean;
  /**
   * Contact-form config. `enabled` is the only thing exposed
   * publicly so the marketing page can decide whether to render
   * the form. Recipient + rate limit live server-side in
   * `api/features/contact-message/`.
   */
  contactForm?: {
    enabled: boolean;
  };
}

/**
 * Input for `PUT /api/settings/:key` (admin-only).
 */
export interface UpdateSettingInput {
  value: string;
}
