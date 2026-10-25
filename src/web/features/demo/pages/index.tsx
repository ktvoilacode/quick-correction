/**
 * /demo — the Quick Correction homepage. Phone first: one column, big tap targets,
 * three steps and two doors. Picking a door stands in for signing in.
 */
import { Link, useNavigate } from 'react-router-dom';
import { Button, useTheme } from '@bloomneo/uikit';
import { HeartHandshake, School, ChevronRight, FileText, Camera, Sparkles, Mic, TrendingUp, BellRing, Moon, Sun, LogIn, LogOut } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { LogoMark, Wordmark } from '@/shared/Logo';
import { useAuth } from '@/features/auth';
import { homeFor } from '@/features/auth/lib/home';
import { useDemo, type Role } from '../data/store';

/** Shown as a slowly moving strip of cards under the two doors. */
const FEATURES = [
  { icon: FileText, title: 'Board-exact papers', text: 'CBSE sections A–E, made in a minute' },
  { icon: Camera, title: 'Snap & upload', text: 'A photo of each page from the phone' },
  { icon: Sparkles, title: 'Marked in minutes', text: 'Question-wise marks and feedback' },
  { icon: Mic, title: 'Just say it', text: '“40-mark trig test, due Friday”' },
  { icon: TrendingUp, title: 'Chapter progress', text: 'See exactly what to revise next' },
  { icon: BellRing, title: 'Teacher in the loop', text: 'Notified the moment answers land' },
];

const DOORS: { role: Role; label: string; hint: string; icon: typeof School }[] = [
  { role: 'parent', label: 'I’m a parent', hint: 'Upload answers, see marks', icon: HeartHandshake },
  { role: 'school', label: 'I’m a teacher', hint: 'Make papers just by chatting', icon: School },
];

export default function Home() {
  const { setRole } = useDemo();
  const navigate = useNavigate();
  const { mode, setMode } = useTheme();
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const go = (r: Role) => { setRole(r); navigate(`/demo/${r}`); };

  return (
    <>
      <SEO title="Quick Correction" description="Board-pattern tests, written by hand, marked by AI." />

      <div className="mm-mesh relative min-h-screen overflow-hidden">
        <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
          <header className="flex h-14 items-center justify-between">
            <span className="flex items-center gap-2.5">
              <LogoMark className="size-9" />
              <Wordmark className="text-lg" />
            </span>
            <span className="flex items-center gap-1">
            {!isLoading && (isAuthenticated ? (
              <>
                <Button size="sm" className="h-9" asChild>
                  <Link to={homeFor(user)}>Open app</Link>
                </Button>
                <Button variant="ghost" size="icon" className="size-10 rounded-full" aria-label="Sign out" title="Sign out" onClick={() => logout()}>
                  <LogOut className="size-5" />
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" className="h-9" asChild>
                <Link to="/auth/login"><LogIn className="size-4" /> Sign in</Link>
              </Button>
            ))}
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-full"
              aria-label={mode === 'dark' ? 'Light mode' : 'Dark mode'}
              onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
            >
              {mode === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </Button>
            </span>
          </header>

          <section className="pt-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-highlight-soft)] px-3 py-1 text-xs font-medium text-[var(--color-highlight-on-soft)]">
              <span className="size-1.5 rounded-full bg-[var(--color-highlight)]" /> CBSE Class 10 · Board practice
            </span>
            <h1 className="mt-4 text-[2.25rem] font-bold leading-[1.08] tracking-[-0.03em]">
              Practice like the board exam.{' '}
              <span className="mm-gradient-text">Get marked in minutes.</span>
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Write answers on paper, upload a photo, and Quick Correction checks every question.
            </p>
          </section>

          <section className="mt-8 space-y-3" aria-label="Continue as">
            {DOORS.map(({ role, label, hint, icon: Icon }, i) => (
              <button
                key={role}
                onClick={() => go(role)}
                className={[
                  'flex w-full cursor-pointer items-center gap-4 rounded-2xl p-4 text-left transition active:scale-[0.98]',
                  i === 0
                    ? 'mm-gradient mm-glow'
                    : 'mm-glass hover:-translate-y-px',
                ].join(' ')}
              >
                <span
                  className={[
                    'grid size-12 shrink-0 place-items-center rounded-xl',
                    i === 0 ? 'bg-white/20' : 'mm-tint text-primary',
                  ].join(' ')}
                >
                  <Icon className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold">{label}</span>
                  <span className={`block text-sm ${i === 0 ? 'text-white/85' : 'text-muted-foreground'}`}>{hint}</span>
                </span>
                <ChevronRight className={`size-5 shrink-0 ${i === 0 ? '' : 'text-muted-foreground'}`} />
              </button>
            ))}
          </section>

          {/* Moving feature strip. The list is rendered twice so the loop is seamless;
              the copy is hidden from screen readers. Stops for reduced motion. */}
          <section className="mm-marquee -mx-5 mt-10" aria-label="What Quick Correction does">
            <div className="mm-marquee-track">
              {[0, 1].map((copy) => (
                <ul key={copy} className="flex shrink-0 gap-3 pr-3" aria-hidden={copy === 1 || undefined}>
                  {FEATURES.map(({ icon: Icon, title, text }) => (
                    <li key={title} className="mm-glass flex w-56 shrink-0 items-start gap-3 rounded-2xl p-3.5">
                      <span className="mm-tint grid size-9 shrink-0 place-items-center rounded-xl text-primary">
                        <Icon className="size-[18px]" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{title}</span>
                        <span className="block text-xs leading-snug text-muted-foreground">{text}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </section>

          <footer className="mt-auto pt-10 text-center text-xs text-muted-foreground">
            Prototype · sample data · AI marking is simulated
          </footer>
        </div>
      </div>
    </>
  );
}
