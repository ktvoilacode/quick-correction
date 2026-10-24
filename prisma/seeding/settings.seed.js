/**
 * AppSetting seed — placeholders for every key that drives the
 * marketing site so a fresh install renders something sensible.
 * @file prisma/seeding/settings.seed.js
 *
 * Each row lands with `isPublic` set correctly for its intent. The
 * marketing /contact page reads these via GET /api/settings/public.
 *
 * Idempotent: rows already present (by key) are left alone so admins
 * don't lose edits when someone re-runs the seed. Only missing keys
 * get inserted.
 *
 * Run directly: `node prisma/seeding/settings.seed.js`
 */

import dotenv from 'dotenv';
import { databaseClass } from '@bloomneo/appkit/database';

dotenv.config();

/**
 * Rows we want in the DB out of the box. Keep this list aligned with
 * `src/api/features/settings/settings.types.ts::KNOWN_SETTING_KEYS`.
 */
const ROWS = [
  {
    key: 'business_name',
    value: 'Your Business',
    isPublic: true,
    description: 'Displayed in the marketing header/footer and page titles.',
  },
  {
    key: 'support_email',
    value: 'support@example.com',
    isPublic: true,
    description: 'Primary support inbox, shown on the /contact page.',
  },
  {
    key: 'support_phone',
    value: '+1 (555) 010-2030',
    isPublic: true,
    description: 'Support phone number shown on the /contact page.',
  },
  {
    key: 'support_hours',
    value: 'Monday – Friday, 9 am – 6 pm',
    isPublic: true,
    description: 'Operating hours shown on the /contact page.',
  },
  {
    key: 'support_address',
    value: '123 Example Street, City, Postal Code',
    isPublic: true,
    description: 'Mailing address shown on the /contact page.',
  },
  {
    key: 'support_whatsapp_url',
    value: '',
    isPublic: true,
    description: 'Optional WhatsApp link (leave blank to hide the row).',
  },
  {
    key: 'feature_signup_open',
    value: 'true',
    isPublic: true,
    description: 'When "false", the /register page shows a closed notice.',
  },
  {
    key: 'contact_form_enabled',
    value: 'false',
    isPublic: true,
    description: 'Toggles the contact form on /contact. Admin can flip in Settings.',
  },
  {
    key: 'contact_form_to_email',
    value: '',
    // Server-side only: never exposed via /api/settings/public.
    isPublic: false,
    description: 'Recipient for contact-form messages. Falls back to support_email.',
  },
];

export async function seedSettings() {
  console.log('🌱 Seeding AppSetting rows…');

  const db = await databaseClass.get();

  let inserted = 0;
  let skipped = 0;

  for (const row of ROWS) {
    const existing = await db.appSetting.findUnique({ where: { key: row.key } });
    if (existing) {
      skipped++;
      continue;
    }
    await db.appSetting.create({ data: row });
    inserted++;
  }

  console.log(
    `✅ AppSetting seed: ${inserted} inserted, ${skipped} already present.`,
  );
  return { inserted, skipped };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedSettings()
    .then((r) => console.log('Settings seeding completed:', r))
    .catch((err) => {
      console.error('Settings seeding failed:', err);
      process.exitCode = 1;
    })
    .finally(async () => {
      // See user.seed.js — an open connection pool keeps the process alive.
      await databaseClass.disconnectAll();
    });
}
