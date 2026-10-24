/**
 * /contact — a PAGE with a working form.
 *
 * Posts to `/api/contact-message`, which the ADMIN layer provides. The
 * recipient address lives in server settings and is deliberately never sent to
 * the browser: publishing the destination of a contact form is how it becomes
 * a spam relay.
 *
 * ── When the admin layer is not installed ─────────────────────────────────
 * The endpoint does not exist, so the form would fail on submit with a 404 and
 * no explanation. `HAS_CONTACT_API` is resolved at BUILD time from the glob
 * below, and without it the page shows the email address instead of a form —
 * a page that works in both compositions rather than one that half-works in
 * one of them.
 */
import * as React from 'react';
import {
  Button, Input, Textarea, FormField, Card, CardContent,
  Alert, AlertTitle, AlertDescription, toast,
} from '@bloomneo/uikit';
import { Send, Loader2, AlertTriangle, Mail, CheckCircle2 } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { brand } from '@/shared/brand';

const HAS_CONTACT_API =
  Object.keys(import.meta.glob('../../../../api/features/contact-message/*.route.ts')).length > 0;

const API_BASE = import.meta.env.VITE_API_URL ?? '';

/** Fallback shown when there is no contact endpoint to post to. */
const FALLBACK_EMAIL = 'hello@example.com';

export default function ContactPage() {
  const [form, setForm] = React.useState({ name: '', email: '', subject: '', message: '' });
  const [touched, setTouched] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const nameError = touched && !form.name.trim() ? 'Please tell us your name' : undefined;
  const emailError = touched && !/^[^@]+@[^@]+\.[^@]+$/.test(form.email) ? 'Enter a valid email address' : undefined;
  const messageError = touched && form.message.trim().length < 10 ? 'A little more detail helps' : undefined;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (sending || nameError || emailError || messageError) return;
    if (!form.name || !form.email || form.message.trim().length < 10) return;

    setError(null);
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/contact-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Could not send your message (${res.status})`);
      }
      setSent(true);
      toast.success('Message sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the server.');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <SEO title="Contact" description={`Get in touch with ${brand.name}`} />

      <div className="mx-auto max-w-xl py-8">
        <h1 className="text-3xl font-semibold tracking-tight">Get in touch</h1>
        <p className="mt-2 text-muted-foreground">
          Tell us what you need and we will come back to you.
        </p>

        {!HAS_CONTACT_API ? (
          <Card className="mt-8">
            <CardContent className="flex items-center gap-3 py-6">
              <Mail className="size-4 shrink-0 text-muted-foreground" />
              <span className="text-sm">
                Email us at{' '}
                <a href={`mailto:${FALLBACK_EMAIL}`} className="font-medium text-foreground hover:underline">
                  {FALLBACK_EMAIL}
                </a>
                .
              </span>
            </CardContent>
          </Card>
        ) : sent ? (
          <Alert className="mt-8 border-success/40 bg-success/8">
            <CheckCircle2 className="size-4 text-success" />
            <AlertTitle>Message sent</AlertTitle>
            <AlertDescription>
              Thanks — we have it, and we will reply to {form.email}.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {error && (
              <Alert className="mt-8 border-destructive/40 bg-destructive/8">
                <AlertTriangle className="size-4 text-destructive" />
                <AlertTitle>Could not send</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Name" required error={nameError}>
                  <Input
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </FormField>
                <FormField label="Email" required error={emailError}>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </FormField>
              </div>

              <FormField label="Subject">
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
              </FormField>

              <FormField label="Message" required error={messageError}>
                <Textarea
                  rows={6}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </FormField>

              <Button type="submit" disabled={sending}>
                {sending ? (
                  <><Loader2 className="size-4 animate-spin" /> Sending…</>
                ) : (
                  <>Send message <Send className="size-4" /></>
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </>
  );
}
