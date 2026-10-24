/**
 * /demo/parent — the parent's home. Two jobs only: upload the answer sheets
 * for any paper the teacher has set, and see how the child did.
 */
import { Link } from 'react-router-dom';
import { Card, CardContent, Button, Badge } from '@bloomneo/uikit';
import { Camera, ChevronRight, PartyPopper, Loader2 } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { useDemo, ME_STUDENT, studentById, pct } from '../../data/store';
import { fmt, useStudentProgress } from '../../components/parts';

export default function ParentHome() {
  const { papers } = useDemo();
  const child = studentById(ME_STUDENT);
  const first = child.name.split(' ')[0];
  const { avg, done, pending, trend } = useStudentProgress(ME_STUDENT);
  const last = trend[trend.length - 1];
  const prev = trend[trend.length - 2];
  const paperOf = (id: string) => papers.find((p) => p.id === id)!;

  return (
    <>
      <SEO title="Home" />
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Class {child.className} · Mathematics</p>
          <h1 className="text-2xl font-semibold tracking-tight">{first}’s tests</h1>
        </div>

        {/* ── to do ─────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">To do</h2>
          {pending.length === 0 && (
            <Card>
              <CardContent className="flex items-center gap-3 py-5 text-sm text-muted-foreground">
                <PartyPopper className="size-5 text-[var(--color-highlight-ink)]" /> Nothing to upload. All caught up!
              </CardContent>
            </Card>
          )}
          {pending.map((s) => {
            const p = paperOf(s.paperId);
            const busy = s.status === 'evaluating';
            return (
              <Link
                key={s.id}
                to={`/demo/parent/tests/${s.id}`}
                className="flex items-center gap-4 rounded-2xl bg-primary p-4 text-primary-foreground shadow-lg shadow-primary/20 transition active:scale-[0.98]"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-foreground/15">
                  {busy ? <Loader2 className="size-6 animate-spin" /> : <Camera className="size-6" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.title}</span>
                  <span className="block text-sm text-primary-foreground/80">
                    {busy ? 'Being marked…' : `Due ${fmt(s.dueDate)} · tap to upload answers`}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0" />
              </Link>
            );
          })}
        </section>

        {/* ── how it's going ───────────────────────────────────────────── */}
        {last && (
          <Card>
            <CardContent className="grid grid-cols-3 divide-x divide-border py-5 text-center">
              <div>
                <p className="text-2xl font-semibold">{last.score}%</p>
                <p className="text-xs text-muted-foreground">Last test</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">{avg}%</p>
                <p className="text-xs text-muted-foreground">Average</p>
              </div>
              <div>
                <p className={`text-2xl font-semibold ${prev && last.score < prev.score ? 'text-destructive' : 'text-success'}`}>
                  {prev ? `${last.score - prev.score > 0 ? '+' : ''}${last.score - prev.score}` : '—'}
                </p>
                <p className="text-xs text-muted-foreground">vs previous</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── results ──────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Results</h2>
            <Button variant="link" size="sm" className="h-auto p-0" asChild>
              <Link to="/demo/parent/progress">See progress</Link>
            </Button>
          </div>
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-border">
              {[...done].reverse().map(({ s, paper }) => (
                <li key={s.id}>
                  <Link to={`/demo/parent/results/${s.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-accent/40">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{paper.title}</span>
                      <span className="text-xs text-muted-foreground">{fmt(s.submittedAt)} · {s.score}/{s.max}</span>
                    </span>
                    <Badge variant={pct(s) < 50 ? 'destructive' : 'secondary'}>{pct(s)}%</Badge>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      </div>
    </>
  );
}
