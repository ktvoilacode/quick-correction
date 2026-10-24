/**
 * /admin/settings — settings hub.
 * @file src/web/features/admin/pages/settings.tsx
 *
 * Three sections:
 *
 *   1. Appearance (client-only)
 *      Theme, dark/light mode, and which dashboard widgets to render.
 *      Persists to localStorage and to uikit's ThemeProvider — no API
 *      call. Per-user preference; doesn't travel with the account.
 *
 *   2. Email (server-side AppSetting rows)
 *      SMTP host / port / user / pass / from / enabled. Any field here
 *      goes through /api/settings/admin/:key and is owned by the
 *      admin. Password field is masked; everything else surfaces the
 *      current value.
 *
 *   3. Everything else (server-side AppSetting rows)
 *      Auto-grouped by key prefix: business_*, support_*, feature_*,
 *      and "Other" for anything that doesn't match. Each row is one
 *      inline edit.
 *
 * TODO: Toggle `isPublic` per row. Schema supports it, UI doesn't.
 *       Needs a PATCH endpoint that accepts { value, isPublic }.
 * TODO: SMTP "Send test email" button — useful once Email is live.
 *
 * @see ../../../../../docs/admin-patterns.md §8 settings, §4 admin-api
 * @see https://dev.bloomneo.com/adminapp/settings
 *
 * @llm-rule WHEN: Adding a new admin-editable setting, exposing a new email provider, or changing the grouped-card layout
 * @llm-rule AVOID: Storing secrets in AppSetting — they belong in .env (appkit reads env directly). The Email card writes env via the server for this reason
 * @llm-rule NOTE: saveValue is useCallback'd so child cards (ContactCard, SettingEditor) keep stable handler refs and don't re-render on unrelated state changes
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  PasswordInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  toast,
  useTheme,
} from '@bloomneo/uikit';
import { Moon, Sun, Info, Send, Check } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { PALETTES } from '@/shared/palettes';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { PageLoading } from '../components/PageLoading';
import { adminFetch, adminFetchJson } from '../lib/admin-api';
import {
  ALL_WIDGET_KEYS,
  readDashboardWidgets,
  writeDashboardWidgets,
  type WidgetKey,
} from '../lib/dashboard-widgets';

interface SettingRow {
  key: string;
  value: string;
  isPublic: boolean;
  description: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

/**
 * Email config is stored in env (.env file / platform secrets), not
 * in the AppSetting table. Appkit's email module reads env directly,
 * so the UI here edits env to match. The allow-list of keys we let
 * the admin edit lives server-side in settings.route.ts::EMAIL_ENV_KEYS.
 */
type EmailStrategy = 'resend' | 'smtp' | 'console';

interface EmailEnv {
  values: Record<string, string>;
  persistence: 'reliable' | 'platform-managed' | 'unknown';
}

const GROUP_FOR_PREFIX: Array<{ prefix: string; label: string }> = [
  { prefix: 'business_', label: 'Business' },
  { prefix: 'support_', label: 'Support' },
  { prefix: 'feature_', label: 'Feature flags' },
];

function groupOf(key: string): string {
  for (const g of GROUP_FOR_PREFIX) {
    if (key.startsWith(g.prefix)) return g.label;
  }
  return 'Other';
}

export default function AdminSettings() {
  const [rows, setRows] = useState<SettingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminFetchJson<{ items: SettingRow[] }>('/api/settings/admin/list')
      .then((data) => setRows(data.items))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Failed to load'),
      );
  }, []);

  /**
   * AppSetting rows bucketed by prefix for the existing
   * Business / Feature-flags / Other cards.
   *
   * Filtered OUT:
   *   - `email_*`       — legacy (email config lives in env now)
   *   - `support_*`     — rendered in the Contact card instead
   *   - `contact_*`     — same
   * so the admin sees each setting exactly once.
   */
  const grouped = useMemo(() => {
    if (!rows) return null;
    const out: Record<string, SettingRow[]> = {};
    for (const row of rows) {
      if (row.key.startsWith('email_')) continue;
      if (row.key.startsWith('support_')) continue;
      if (row.key.startsWith('contact_')) continue;
      const g = groupOf(row.key);
      (out[g] ??= []).push(row);
    }
    return out;
  }, [rows]);

  // Stable handler so memoized children (ContactCard, SettingEditor)
  // don't see a new function reference on every parent render.
  const saveValue = useCallback(
    async (key: string, value: string): Promise<SettingRow> => {
      const saved = await adminFetchJson<SettingRow>(
        `/api/settings/admin/${encodeURIComponent(key)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ value }),
        },
      );
      setRows((prev) => {
        if (!prev) return [saved];
        const idx = prev.findIndex((r) => r.key === key);
        if (idx === -1) return [...prev, saved];
        return prev.map((r) => (r.key === key ? saved : r));
      });
      return saved;
    },
    [],
  );

  // Wrap saveValue with toast once, up here. Every card gets the same
  // handler identity, and no one has to repeat the `.then(toast.success)`
  // dance at every call site.
  const saveWithToast = useCallback(
    (k: string, v: string) =>
      saveValue(k, v).then((saved) => {
        toast.success(`Saved ${k}`);
        return saved;
      }),
    [saveValue],
  );

  return (
    <>
      <SEO title="Settings" />
      <AdminPageHeader
        title="Settings"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Settings' }]}
      />
      {error && (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            Failed to load: {error}
          </CardContent>
        </Card>
      )}

      {!rows ? (
        <PageLoading label="Loading settings" />
      ) : (
        <div className="space-y-6">
          {/* Appearance — client-only; no API round-trip. */}
          <AppearanceCard />

          {/* Email — writes to .env via the server. Provider strategy
              decides which fields render. Includes a test-send button. */}
          <EmailCard />

          {/* Contact — form toggle + recipient + the support details
              shown on the public /contact page. One card because
              admins reason about "contact stuff" as one topic. */}
          <ContactCard rows={rows!} onSave={saveWithToast} />

          {/* Everything else, grouped by prefix. One Save per group. */}
          {Object.entries(grouped!).map(([group, groupRows]) => (
            <GroupedSettingsCard
              key={group}
              group={group}
              rows={groupRows}
              onSave={saveWithToast}
            />
          ))}

          {/* Custom AppSetting rows (business_*, support_*, feature_*)
              render above when present. When the DB has none, we show
              nothing here — the Appearance + Email cards already give
              the admin plenty to do. Seed rows via
              `prisma/seeding/settings.seed.js` or Prisma Studio when
              you want app-specific settings to appear. */}
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Appearance                                                                 */
/* -------------------------------------------------------------------------- */

function AppearanceCard() {
  const { theme, mode, setTheme, toggleMode } = useTheme();
  const [widgets, setWidgets] = useState<WidgetKey[]>(() =>
    readDashboardWidgets(),
  );

  function toggleWidget(key: WidgetKey) {
    const next = widgets.includes(key)
      ? widgets.filter((k) => k !== key)
      : [...widgets, key];
    setWidgets(next);
    writeDashboardWidgets(next);
    toast.success('Dashboard updated');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Palette, colour mode, and which blocks appear on the admin home.
          Saved in this browser, not on the server.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/*
          * Palettes come from the app's own PALETTES list, NOT from
          * useTheme().availableThemes.
          *
          * availableThemes reports the themes UIKit itself registers — for a
          * Bloom app that is just "base". The six brand palettes are defined in
          * styles/brand.css as `.theme-<slug>-*` classes, which UIKit has no
          * way to enumerate. Reading availableThemes here showed a single
          * "Base" button and no way to reach any real palette.
          *
          * PALETTES is also what the header picker uses, so the two controls
          * now agree and either one updates the other.
          */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Palette</span>
          <p className="text-xs text-muted-foreground">
            Every colour in the app derives from one hue, so this recolours
            components this page has never heard of.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {PALETTES.map((p) => {
              const active = theme === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setTheme(p.id)}
                  aria-pressed={active}
                  className={[
                    'flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors',
                    active
                      ? 'border-primary bg-primary/10 font-medium text-foreground'
                      : 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  ].join(' ')}
                >
                  <span
                    aria-hidden
                    className="size-3.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                    style={{ background: p.swatch }}
                  />
                  {p.label}
                  {active && <Check className="size-3.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mode — an explicit button rather than a toggle, so the current
            state is readable without hovering. */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Mode</span>
          <div>
            <Button variant="outline" size="sm" onClick={toggleMode} className="gap-2">
              {mode === 'dark' ? (
                <>
                  <Sun className="size-4" />
                  Switch to light
                </>
              ) : (
                <>
                  <Moon className="size-4" />
                  Switch to dark
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Dashboard widgets — one Switch per known key. An empty selection
            falls back to the default set on the dashboard itself. */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Dashboard widgets</span>
          <p className="text-xs text-muted-foreground">
            Pick which blocks show on the admin home. Changes apply immediately.
          </p>
          <div className="space-y-3 pt-2">
            {ALL_WIDGET_KEYS.map((key) => (
              <div
                key={key}
                className="flex items-center justify-between border-b border-border pb-3 last:border-b-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium capitalize">{key}</p>
                  <p className="text-xs text-muted-foreground">
                    {describeWidget(key)}
                  </p>
                </div>
                <Switch
                  checked={widgets.includes(key)}
                  onCheckedChange={() => toggleWidget(key)}
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function describeWidget(key: WidgetKey): string {
  switch (key) {
    case 'users':
      return 'Active user count + breakdown by role';
    case 'signups':
      return '30-day signup count + daily area chart';
    case 'activity':
      return 'Most recent audit events';
    default:
      return '';
  }
}

/* -------------------------------------------------------------------------- */
/* Email                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Email card — edits the email-related env vars that appkit reads.
 * Fields shown depend on the selected strategy:
 *   - resend  → RESEND_API_KEY
 *   - smtp    → SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS
 *   - console → nothing extra (emails get logged to stdout; dev-only)
 *
 * "From" address is shared across strategies. Save button writes
 * every dirty key in one API call. Test-send button hits a separate
 * endpoint and surfaces appkit's error message directly if the
 * provider rejects the attempt.
 */
function EmailCard() {
  const [state, setState] = useState<EmailEnv | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    adminFetchJson<EmailEnv>('/api/settings/admin/email-env')
      .then((data) => {
        setState(data);
        setDraft({ ...data.values });
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Failed to load email config'),
      );
  }, []);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-sm text-destructive">
          {error}
        </CardContent>
      </Card>
    );
  }
  if (!state) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
        </CardHeader>
        <CardContent>
          <PageLoading label="Loading email config" />
        </CardContent>
      </Card>
    );
  }

  const strategy: EmailStrategy =
    (draft.BLOOM_EMAIL_STRATEGY || state.values.BLOOM_EMAIL_STRATEGY || 'console') as EmailStrategy;

  const dirty = Object.entries(draft).some(
    ([k, v]) => (state.values[k] ?? '') !== v,
  );

  async function save() {
    setSaving(true);
    try {
      const next = await adminFetchJson<EmailEnv>('/api/settings/admin/email-env', {
        method: 'PUT',
        body: JSON.stringify(draft),
      });
      setState(next);
      setDraft({ ...next.values });
      toast.success('Email config saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    if (!testTo.trim()) {
      toast.error('Enter an address first');
      return;
    }
    setTesting(true);
    try {
      const res = await adminFetch('/api/settings/admin/email-test', {
        method: 'POST',
        body: JSON.stringify({ to: testTo.trim() }),
      });
      const body = await res.json();
      if (!res.ok || body.ok === false) {
        toast.error('Send failed: ' + (body.error ?? res.statusText));
      } else {
        toast.success('Test email sent to ' + testTo.trim());
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email</CardTitle>
        <CardDescription>
          Outbound email provider. Appkit reads these values from env
          at boot — saving here writes them to the project's <code>.env</code>
          and to the running process.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Persistence disclaimer — driven by the server's detection.
            On DigitalOcean droplets / VMs / bare metal the write
            survives a restart; on Vercel / Fly / Lambda-style hosts
            it won't and the admin should also set the env var via
            the hosting platform. */}
        {state.persistence !== 'reliable' && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>
              {state.persistence === 'platform-managed'
                ? 'Detected a container/serverless host'
                : 'Check how your server reads env'}
            </AlertTitle>
            <AlertDescription>
              {state.persistence === 'platform-managed'
                ? 'Saving here writes .env, but container platforms typically ignore .env on boot. Set the same values via your host (Fly secrets, Vercel env, etc.) so they survive a deploy.'
                : 'Saving writes to .env and the running process. On DigitalOcean droplets and similar hosts this persists. On serverless/container hosts, also set the same values via your platform.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Strategy picker. Changing it re-renders the field list
            below without saving — the admin has to hit Save to commit. */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Provider strategy</label>
          <Select
            value={strategy}
            onValueChange={(v) =>
              setDraft((d) => ({ ...d, BLOOM_EMAIL_STRATEGY: v }))
            }
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="resend">Resend (recommended)</SelectItem>
              <SelectItem value="smtp">SMTP (any provider — Mailgun, SendGrid, Postmark, etc.)</SelectItem>
              <SelectItem value="console">Console (log to stdout — dev only)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {strategy === 'resend' && (
              <>Create a free key at <a href="https://resend.com" className="underline" target="_blank" rel="noreferrer">resend.com</a> — the simplest path to production.</>
            )}
            {strategy === 'smtp' && (
              <>Works with any SMTP provider. Mailgun, SendGrid, Postmark, Gmail — point SMTP_HOST at their relay and fill in the credentials.</>
            )}
            {strategy === 'console' && (
              <>No emails actually sent. Appkit logs them to the server console. Useful for local dev before you've picked a provider.</>
            )}
          </p>
        </div>

        {/* Common fields — "from" name + address. Used by every strategy. */}
        <div className="grid gap-4 md:grid-cols-2">
          <LabeledInput
            label="From name"
            placeholder="App"
            value={draft.BLOOM_EMAIL_FROM_NAME ?? ''}
            onChange={(v) => setDraft((d) => ({ ...d, BLOOM_EMAIL_FROM_NAME: v }))}
          />
          <LabeledInput
            label="From email"
            placeholder="no-reply@example.com"
            value={draft.BLOOM_EMAIL_FROM_EMAIL ?? ''}
            onChange={(v) => setDraft((d) => ({ ...d, BLOOM_EMAIL_FROM_EMAIL: v }))}
          />
        </div>

        {/* Strategy-specific fields */}
        {strategy === 'resend' && (
          <LabeledInput
            label="Resend API key"
            type="password"
            placeholder="re_…"
            value={draft.RESEND_API_KEY ?? ''}
            onChange={(v) => setDraft((d) => ({ ...d, RESEND_API_KEY: v }))}
            help='Starts with "re_". Leave the field as "********" to keep the existing key.'
          />
        )}

        {strategy === 'smtp' && (
          <div className="grid gap-4 md:grid-cols-2">
            <LabeledInput
              label="SMTP host"
              placeholder="smtp.mailgun.org"
              value={draft.SMTP_HOST ?? ''}
              onChange={(v) => setDraft((d) => ({ ...d, SMTP_HOST: v }))}
            />
            <LabeledInput
              label="SMTP port"
              placeholder="587"
              value={draft.SMTP_PORT ?? ''}
              onChange={(v) => setDraft((d) => ({ ...d, SMTP_PORT: v }))}
            />
            <LabeledInput
              label="SMTP username"
              placeholder="apikey"
              value={draft.SMTP_USER ?? ''}
              onChange={(v) => setDraft((d) => ({ ...d, SMTP_USER: v }))}
            />
            <LabeledInput
              label="SMTP password"
              type="password"
              placeholder="••••••••"
              value={draft.SMTP_PASS ?? ''}
              onChange={(v) => setDraft((d) => ({ ...d, SMTP_PASS: v }))}
              help='Leave as "********" to keep the existing password.'
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button disabled={!dirty || saving} onClick={save}>
            {saving ? 'Saving…' : 'Save email config'}
          </Button>
        </div>

        {/* Test send — always available. Fails with the provider's
            error message if the config is bad, so misconfig is
            obvious before the admin waits for a real signup/reset
            flow to break. */}
        <div className="space-y-2 pt-2 border-t">
          <label className="text-sm font-medium">Send test email</label>
          <p className="text-xs text-muted-foreground">
            Sends a one-line test via the current config. Useful right
            after changing the provider or rotating keys.
          </p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="you@example.com"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              className="flex-1 max-w-sm"
            />
            <Button
              variant="outline"
              onClick={sendTest}
              disabled={testing || !testTo.trim()}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {testing ? 'Sending…' : 'Send test'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  type,
  help,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  type?: 'password' | 'text';
  help?: string;
}) {
  const InputEl = type === 'password' ? PasswordInput : Input;
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <InputEl
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Contact                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Contact card — form enable toggle + recipient + the support details
 * shown on the public /contact page.
 *
 * Why one card: admins reason about "contact-y things" as one concern
 * (customers want to reach us → where does the form go, what's the
 * support email, etc.). Splitting these across three cards in earlier
 * iterations confused users who wanted to change the support number
 * and hunted through "Feature flags" and "Business" before finding it.
 *
 * Why one Save button: typing a phone number and tabbing away should
 * NOT fire a network call; admins batch edits ("fix phone, update
 * hours, flip the form on"). Fields track local draft state; clicking
 * Save walks the dirty set and issues one PUT per changed key.
 *
 * `contact_form_to_email` stays server-side only (isPublic=false). The
 * public endpoint exposes only the `enabled` flag — a compromised
 * browser can't redirect intake to an attacker-controlled inbox.
 */
const CONTACT_KEYS = [
  'contact_form_enabled',
  'contact_form_to_email',
  'support_email',
  'support_phone',
  'support_hours',
  'support_whatsapp_url',
  'support_address',
] as const;

type ContactKey = (typeof CONTACT_KEYS)[number];

function ContactCard({
  rows,
  onSave,
}: {
  rows: SettingRow[];
  onSave: (key: string, value: string) => Promise<SettingRow>;
}) {
  // Build the initial draft from server rows. Re-synced whenever the
  // underlying `rows` change (e.g. after a successful save flushes
  // back from the parent).
  const initial = useMemo(() => {
    const byKey = new Map<string, SettingRow>();
    for (const row of rows) byKey.set(row.key, row);
    const out = {} as Record<ContactKey, string>;
    for (const key of CONTACT_KEYS) {
      out[key] = byKey.get(key)?.value ?? '';
    }
    return out;
  }, [rows]);

  const [draft, setDraft] = useState<Record<ContactKey, string>>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  const dirty = CONTACT_KEYS.some((k) => draft[k] !== initial[k]);
  const enabled = (draft.contact_form_enabled || 'false').toLowerCase() === 'true';

  function set<K extends ContactKey>(key: K, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function saveAll() {
    setSaving(true);
    // Walk only changed keys. Fire in parallel — each PUT is
    // independent, the server audits each write separately, and the
    // UI only cares that they all complete before re-enabling Save.
    const changed = CONTACT_KEYS.filter((k) => draft[k] !== initial[k]);
    try {
      await Promise.all(changed.map((k) => onSave(k, draft[k])));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setDraft(initial);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact</CardTitle>
        <CardDescription>
          Public contact page details and the contact-form recipient.
          Changes are visible on <code>/contact</code> after a reload.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Form toggle — part of the same draft, saved on click of the
            single Save button below. */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <p className="text-sm font-medium">Contact form</p>
            <p className="text-xs text-muted-foreground">
              When enabled, the /contact page renders a form that posts
              to /api/contact-message. Delivery uses your configured
              Email provider.
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(v) =>
              set('contact_form_enabled', v ? 'true' : 'false')
            }
          />
        </div>

        {/* Recipient — only shown when the form is on */}
        {enabled && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Form recipient email</label>
            <Input
              value={draft.contact_form_to_email}
              placeholder="support@example.com"
              onChange={(e) => set('contact_form_to_email', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Where contact-form submissions land. Falls back to Support
              email if empty.
            </p>
          </div>
        )}

        {/* Support details — same fields as the public /contact page */}
        <div className="grid gap-4 md:grid-cols-2">
          <PlainField
            label="Support email"
            placeholder="support@example.com"
            value={draft.support_email}
            onChange={(v) => set('support_email', v)}
          />
          <PlainField
            label="Support phone"
            placeholder="+1 555-0100"
            value={draft.support_phone}
            onChange={(v) => set('support_phone', v)}
          />
          <PlainField
            label="Support hours"
            placeholder="Mon–Fri, 9am–6pm IST"
            value={draft.support_hours}
            onChange={(v) => set('support_hours', v)}
          />
          <PlainField
            label="WhatsApp link"
            placeholder="https://wa.me/15550100"
            value={draft.support_whatsapp_url}
            onChange={(v) => set('support_whatsapp_url', v)}
          />
          <div className="md:col-span-2">
            <PlainField
              label="Mailing address"
              placeholder="123 Example St, City, Country"
              value={draft.support_address}
              onChange={(v) => set('support_address', v)}
            />
          </div>
        </div>

        {/* Single Save button for the whole card. Disabled when the
            draft matches the server state — no "save" when nothing
            changed. Reset reverts local draft back to server values. */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            disabled={!dirty || saving}
          >
            Reset
          </Button>
          <Button size="sm" onClick={saveAll} disabled={!dirty || saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Labeled input that just reads/writes a string — no per-field save button. */
function PlainField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Other AppSetting rows                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Card for one prefix group (Business / Feature flags / Other).
 * Every row is an inline edit; a single Save button at the card
 * footer walks only the changed rows and fires one PUT per dirty key.
 */
function GroupedSettingsCard({
  group,
  rows,
  onSave,
}: {
  group: string;
  rows: SettingRow[];
  onSave: (key: string, value: string) => Promise<SettingRow>;
}) {
  const initial = useMemo(() => {
    const out: Record<string, string> = {};
    for (const row of rows) out[row.key] = row.value;
    return out;
  }, [rows]);

  const [draft, setDraft] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  const dirty = rows.some((r) => (draft[r.key] ?? '') !== (initial[r.key] ?? ''));

  async function saveAll() {
    setSaving(true);
    const changed = rows.filter(
      (r) => (draft[r.key] ?? '') !== (initial[r.key] ?? ''),
    );
    try {
      await Promise.all(changed.map((r) => onSave(r.key, draft[r.key] ?? '')));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{group}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex flex-col gap-2 border-b pb-4 last:border-b-0 last:pb-0"
          >
            <div className="flex items-center gap-2">
              <code className="font-mono text-xs">{row.key}</code>
              {row.isPublic && (
                <Badge variant="outline" className="text-xs">public</Badge>
              )}
            </div>
            {row.description && (
              <p className="text-xs text-muted-foreground">{row.description}</p>
            )}
            <Input
              value={draft[row.key] ?? ''}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, [row.key]: e.target.value }))
              }
            />
          </div>
        ))}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDraft(initial)}
            disabled={!dirty || saving}
          >
            Reset
          </Button>
          <Button size="sm" onClick={saveAll} disabled={!dirty || saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
