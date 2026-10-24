/**
 * /demo — the Quick Correction homepage. Phone first: one column, big tap targets,
 * three steps and two doors. Picking a door stands in for signing in.
 */
import { useNavigate } from 'react-router-dom';
import { Button, useTheme } from '@bloomneo/uikit';
import { HeartHandshake, School, ChevronRight, FileDown, PenLine, Camera, Sparkles, Moon, Sun } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { LogoMark, Wordmark } from '@/shared/Logo';
import { useDemo, type Role } from '../data/store';

const STEPS = [
  { icon: FileDown, title: 'Teacher sets a paper', text: 'CBSE board pattern, made in a minute.' },
  { icon: PenLine, title: 'Child writes it on paper', text: 'Just like the real exam. Pen, paper, timer.' },
  { icon: Camera, title: 'Parent snaps & uploads', text: 'A photo of each page, straight from the phone.' },
  { icon: Sparkles, title: 'Marks in minutes', text: 'Question-wise marks, feedback and progress.' },
];

const DOORS: { role: Role; label: string; hint: string; icon: typeof School }[] = [
  { role: 'parent', label: 'I’m a parent', hint: 'Upload answers, see marks', icon: HeartHandshake },
  { role: 'school', label: 'I’m a teacher', hint: 'Make papers just by chatting', icon: School },
];

export default function Home() {
  const { setRole } = useDemo();
  const navigate = useNavigate();
  const { mode, setMode } = useTheme();
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
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-full"
              aria-label={mode === 'dark' ? 'Light mode' : 'Dark mode'}
              onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
            >
              {mode === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </Button>
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

          <section className="mt-10" aria-labelledby="how">
            <h2 id="how" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">How it works</h2>
            <ol className="mt-4 space-y-0">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < STEPS.length - 1 && (
                    <span aria-hidden className="absolute left-5 top-11 h-[calc(100%-2.75rem)] w-px bg-border" />
                  )}
                  <span className="mm-tint grid size-10 shrink-0 place-items-center rounded-full text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="pt-1">
                    <span className="block font-medium">{title}</span>
                    <span className="block text-sm text-muted-foreground">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <footer className="mt-auto pt-10 text-center text-xs text-muted-foreground">
            Prototype · sample data · AI marking is simulated
          </footer>
        </div>
      </div>
    </>
  );
}
