/**
 * /demo/parent/papers — every paper the teacher has set: the ones waiting
 * for answers to be uploaded first, then the finished ones.
 */
import { Link } from 'react-router-dom';
import { Card, CardContent, Badge } from '@bloomneo/uikit';
import { Camera, ChevronRight, PartyPopper, Loader2 } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { useDemo, ME_STUDENT, studentById } from '../../data/store';
import { fmt, useStudentProgress } from '../../components/parts';

export default function ParentPapers() {
  const { papers } = useDemo();
  const child = studentById(ME_STUDENT);
  const first = child.name.split(' ')[0];
  const { done, pending } = useStudentProgress(ME_STUDENT);
  const paperOf = (id: string) => papers.find((p) => p.id === id)!;

  return (
    <>
      <SEO title="Papers" />
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Class {child.className} · Mathematics</p>
          <h1 className="text-2xl font-semibold tracking-tight">{first}’s papers</h1>
        </div>

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
                className="mm-gradient mm-glow flex items-center gap-4 rounded-2xl p-4 transition active:scale-[0.98]"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/20">
                  {busy ? <Loader2 className="size-6 animate-spin" /> : <Camera className="size-6" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.title}</span>
                  <span className="block text-sm text-white/85">
                    {busy ? 'Being marked…' : `Due ${fmt(s.dueDate)} · download, then upload answers`}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0" />
              </Link>
            );
          })}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Done</h2>
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-border">
              {[...done].reverse().map(({ s, paper }) => (
                <li key={s.id}>
                  <Link to={`/demo/parent/results/${s.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-accent/40">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{paper.title}</span>
                      <span className="text-xs text-muted-foreground">{paper.durationMins} min · submitted {fmt(s.submittedAt)}</span>
                    </span>
                    <Badge variant="secondary">Marked</Badge>
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
