/**
 * /demo/school/review — answer sheets the AI has marked that the teacher
 * hasn't checked yet. Opened from the "To review" card on the assistant.
 */
import { Link } from 'react-router-dom';
import { PageHeader, Card, Badge, EmptyState } from '@bloomneo/uikit';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { useDemo, pct, studentById } from '../../data/store';
import { fmt } from '../../components/parts';

export default function Review() {
  const { submissions, papers } = useDemo();
  const todo = submissions
    .filter((s) => s.status === 'evaluated' && !s.reviewed)
    .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''));

  return (
    <>
      <SEO title="To review" />
      <PageHeader
        title="To review"
        description="Marked by AI. Check the marks, fix anything that looks off, then approve."
        breadcrumbs={[{ label: 'Assistant', href: '/demo/school' }, { label: 'To review' }]}
      />
      {todo.length === 0 ? (
        <EmptyState className="mt-6" icon={<CheckCircle2 className="size-6" />} title="All caught up" description="Every marked paper has been approved." />
      ) : (
        <Card className="mt-6 overflow-hidden p-0">
          <ul className="divide-y divide-border">
            {todo.map((s) => {
              const p = papers.find((x) => x.id === s.paperId)!;
              return (
                <li key={s.id}>
                  <Link to={`/demo/school/results/${s.id}`} className="flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-accent/40 sm:px-6">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{studentById(s.studentId).name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{p.title} · {fmt(s.submittedAt)}</span>
                    </span>
                    <Badge variant={pct(s) < 50 ? 'destructive' : 'secondary'}>{s.score}/{s.max}</Badge>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
