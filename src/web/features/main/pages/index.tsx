/**
 * Home — a PAGE.
 *
 * It owns its content and nothing else: no header, no footer, no theme toggle.
 * Those belong to AppLayoutRoute, which renders this through <Outlet />.
 *
 * The file's location IS its route. `features/main/pages/index.tsx` → `/`.
 * Add `features/main/pages/about.tsx` and `/about` exists — no route table.
 * Prefix a file or folder with `_` to keep it out of routing.
 *
 * Everything in the playground below is live, not a screenshot. Delete this
 * file and write yours; that is the point of it being one file.
 */
import * as React from 'react';
import {
  Button, Card, CardContent, Badge, Input, FormField,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
  Tabs, TabsList, TabsTrigger, TabsContent,
  toast, useConfirm,
} from '@bloomneo/uikit';
import { ArrowRight, Check, Bell, Trash2, Copy, CornerDownLeft } from 'lucide-react';
import { brand } from '@/shared/brand';

/* ── hero backdrop ─────────────────────────────────────────────────────────
 * Two blooms drifting on the compositor, tinted from chart tokens so the whole
 * thing re-colours with the palette instead of holding its own values. The
 * grid overlay is a masked CSS gradient — no image, no request. */
function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="bloom-blob-a absolute -left-32 -top-40 size-[38rem] rounded-full opacity-[0.22] blur-3xl dark:opacity-[0.30]"
        style={{ background: 'radial-gradient(circle, var(--color-chart1), transparent 62%)' }}
      />
      <div
        className="bloom-blob-b absolute -right-28 -top-56 size-[34rem] rounded-full opacity-[0.20] blur-3xl dark:opacity-[0.28]"
        style={{ background: 'radial-gradient(circle, var(--color-chart2), transparent 62%)' }}
      />
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(var(--color-foreground) 1px, transparent 1px),' +
            'linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, #000 40%, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, #000 40%, transparent 78%)',
        }}
      />
    </div>
  );
}

/* ── the playground ───────────────────────────────────────────────────────── */
function Playground() {
  const confirm = useConfirm();
  const [email, setEmail] = React.useState('');
  const [touched, setTouched] = React.useState(false);
  const invalid = touched && !/^[^@]+@[^@]+\.[^@]+$/.test(email);

  return (
    <Tabs defaultValue="feedback">
      {/*
        * Underline tabs rather than the segmented pill UIKit ships by default.
        * Both are one line of className — the component owns behaviour
        * (roving focus, arrow keys, aria-selected), the app owns appearance.
        *
        * `self-start` is also required: UIKit's Tabs root is `flex flex-col`,
        * and a flex child stretches on the cross axis by default, which
        * silently overrides TabsList's own `w-fit`.
        */}
      <TabsList className="h-auto w-full justify-start gap-6 self-start rounded-none border-b border-border bg-transparent p-0">
        {[
          ['feedback', 'Feedback'],
          ['overlays', 'Overlays'],
          ['forms', 'Forms'],
        ].map(([value, label]) => (
          <TabsTrigger
            key={value}
            value={value}
            className="relative flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-2.5 pt-0 text-sm text-muted-foreground shadow-none transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-transparent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:after:bg-primary dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-transparent"
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="feedback" className="pt-5">
        <p className="mb-4 text-sm text-muted-foreground">Stacked, auto-dismissing, announced to screen readers.</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => toast.success('Saved to your workspace')}>
            <Check className="size-4" /> Success
          </Button>
          <Button size="sm" variant="outline" onClick={() => toast('3 items need review')}>
            <Bell className="size-4" /> Neutral
          </Button>
          <Button size="sm" variant="outline" onClick={() => toast.error('Could not reach the server')}>
            Error
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="overlays" className="pt-5">
        <p className="mb-4 text-sm text-muted-foreground">
          Focus is trapped and restored, <kbd className="rounded border border-border px-1 font-mono text-[11px]">Esc</kbd> closes.
          Try it with the keyboard.
        </p>
        <div className="flex flex-wrap gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Focus is trapped in here</DialogTitle>
                <DialogDescription>
                  Press Tab a few times — you cannot reach the page behind this. Press Esc and focus returns to
                  the button that opened it. None of that was written by hand.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost">Cancel</Button>
                <Button>Got it</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              const ok = await confirm({
                title: 'Delete this project?',
                description: 'This cannot be undone.',
                confirmLabel: 'Delete',
                tone: 'destructive',
              });
              toast[ok ? 'success' : 'info'](ok ? 'Deleted' : 'Cancelled');
            }}
          >
            <Trash2 className="size-4" /> Confirm
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="forms" className="pt-5">
        <p className="mb-4 text-sm text-muted-foreground">
          Label bound to input, <code className="font-mono text-xs">aria-invalid</code> on error, message announced.
        </p>
        <form
          className="flex max-w-sm flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (!invalid && email) toast.success(`Subscribed ${email}`);
          }}
        >
          <FormField label="Work email" required error={invalid ? 'Enter a valid email address' : undefined}>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </FormField>
          <Button type="submit" className="self-start">
            Subscribe <CornerDownLeft className="size-3.5" />
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}

const EDITS: [string, string][] = [
  ['src/web/shared/brand.ts', 'Name, tagline, navigation.'],
  ['src/web/styles/brand.css', 'Colour tokens — the whole visual identity.'],
  ['src/web/features/main/pages/index.tsx', 'This page.'],
];

export default function Home() {
  return (
    <div className="space-y-16 pb-6">
      {/* ── hero ─────────────────────────────────────────────────────────── */}
      <section className="relative -mx-4 px-4 pb-4 pt-10 sm:-mx-6 sm:px-6 sm:pt-16">
        <HeroBackdrop />

        <Badge variant="secondary" className="bloom-rise bloom-rise-1 gap-1.5">
          <span className="size-1.5 rounded-full bg-primary" />
          React + Express · one repository
        </Badge>

        <h1 className="bloom-rise bloom-rise-2 mt-5 max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.75rem]">
          {brand.name} is running.
          <span className="mt-1.5 block bg-gradient-to-br from-primary to-[var(--color-chart2)] bg-clip-text text-transparent">
            Now make it yours.
          </span>
        </h1>

        <p className="bloom-rise bloom-rise-3 mt-6 max-w-lg text-pretty text-lg leading-relaxed text-muted-foreground">
          A typed full-stack app with a design system the compiler enforces — not a style guide anyone can skip.
        </p>

        <div className="bloom-rise bloom-rise-4 mt-8 flex flex-wrap items-center gap-3">
          <Button size="lg" asChild>
            <a href="https://dev.bloomneo.com" target="_blank" rel="noreferrer">
              Read the docs <ArrowRight className="size-4" />
            </a>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="font-mono text-sm"
            onClick={() => { navigator.clipboard?.writeText('npm run dev'); toast.success('Copied'); }}
          >
            npm run dev <Copy className="size-3.5" />
          </Button>
        </div>
      </section>

      {/* ── playground ───────────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-lg font-semibold tracking-tight">All of this is live</h2>
          <span className="text-sm text-muted-foreground">nothing here is a screenshot</span>
        </div>
        <Card>
          <CardContent>
            <Playground />
          </CardContent>
        </Card>
      </section>

      {/* ── three edits ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight">Three files make it yours</h2>
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border">
          {EDITS.map(([file, detail], i) => (
            <li key={file} className="flex items-center gap-4 bg-card px-5 py-3.5 transition-colors hover:bg-accent/40">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
                {i + 1}
              </span>
              <code className="min-w-0 flex-1 truncate font-mono text-sm">{file}</code>
              <span className="hidden text-sm text-muted-foreground sm:block">{detail}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
