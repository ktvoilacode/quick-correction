/**
 * /demo/parent/corrections — every marked paper, newest first, with the
 * headline numbers on top.
 */
import { Link } from 'react-router-dom';
import { Card, CardContent, Badge, EmptyState } from '@bloomneo/uikit';
import { ChevronRight, Sparkles } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { ME_STUDENT, studentById, pct } from '../../data/store';
import { fmt, useStudentProgress } from '../../components/parts';

export default function ParentCorrections() {
  const first = studentById(ME_STUDENT).name.split(' ')[0];
  const { avg, done, trend } = useStudentProgress(ME_STUDENT);
  const last = trend[trend.length - 1];
  const prev = trend[trend.length - 2];

  return (
    <>
      <SEO title="Corrections" />
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Marked by AI, checked by Ms. Kavya</p>
          <h1 className="text-2xl font-semibold tracking-tight">{first}’s corrections</h1>
        </div>

        {last && (
          <Card>
            <CardContent className="grid grid-cols-3 divide-x divide-border py-5 text-center">
              <div>
                <p className="text-2xl font-semibold">{last.score}%</p>
                <p className="text-xs text-muted-foreground">Last paper</p>
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

        {done.length === 0 ? (
          <EmptyState icon={<Sparkles className="size-6" />} title="No corrections yet" description="Upload an answer sheet and the marks show up here." />
        ) : (
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
        )}
      </div>
    </>
  );
}
