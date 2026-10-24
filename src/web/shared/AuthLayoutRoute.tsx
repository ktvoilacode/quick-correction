/**
 * AuthLayoutRoute — the shell for sign-in, register and password recovery.
 *
 * Deliberately NOT the application shell. An auth page has no navigation to
 * offer (you cannot go anywhere yet) and nothing worth reading in a footer.
 * Reusing the main shell here surrounds a 200px form with links that bounce
 * you straight back to this page.
 *
 * ── On the side panel ──────────────────────────────────────────────────────
 * Restrained on purpose. A saturated full-bleed gradient reads as a landing
 * page, and a sign-in screen is not a place to sell — the person is already
 * a customer and wants to get on with it. So: a neutral surface, a hairline
 * rule, one quiet quote, and the brand mark small. The only colour is a
 * single accent dot.
 *
 * Below `lg` the panel disappears entirely rather than stacking. On a phone it
 * is pure scroll cost between the user and the password field.
 */
import { Link, Outlet } from 'react-router-dom';
import { useTheme, Button } from '@bloomneo/uikit';
import { Moon, Sun, ArrowLeft } from 'lucide-react';
import { brand } from './brand';

/** Replace with a customer quote, a product note, or delete the panel. */
const PANEL_QUOTE = {
  text: 'Set up took an afternoon. The part I expected to be hard turned out to already be done.',
  attribution: 'Early customer',
};

export function AuthLayoutRoute() {
  const { mode, setMode } = useTheme();

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(0,28rem)]">
      {/* ── form side ───────────────────────────────────────────────────── */}
      <div className="flex flex-col bg-background">
        <div className="flex items-center gap-2 p-4 sm:p-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="size-4" /> Back
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto size-8"
            aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
          >
            {mode === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-20 sm:px-6">
          <div className="w-full max-w-sm">
            <Link to="/" className="mb-10 flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                {brand.shortName.charAt(0)}
              </span>
              <span className="font-semibold tracking-tight">{brand.name}</span>
            </Link>

            {/* The page supplies its own heading and form. */}
            <Outlet />
          </div>
        </div>
      </div>

      {/* ── quiet side panel ────────────────────────────────────────────── */}
      <aside className="relative hidden border-l border-border bg-muted/40 lg:flex lg:flex-col lg:justify-between">
        {/* A barely-there grid, masked so it fades out. Texture, not decoration. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(var(--color-foreground) 1px, transparent 1px),' +
              'linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, #000 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, #000 30%, transparent 75%)',
          }}
        />

        <div className="relative p-10">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {brand.name}
          </span>
        </div>

        <div className="relative p-10">
          <span aria-hidden className="mb-5 block size-1.5 rounded-full bg-primary" />
          <blockquote className="text-lg leading-relaxed text-foreground">
            {PANEL_QUOTE.text}
          </blockquote>
          <figcaption className="mt-4 text-sm text-muted-foreground">
            {PANEL_QUOTE.attribution}
          </figcaption>
        </div>

        <div className="relative border-t border-border p-10 py-5">
          <span className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {brand.name}
          </span>
        </div>
      </aside>
    </div>
  );
}
