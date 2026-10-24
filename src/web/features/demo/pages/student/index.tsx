/**
 * /demo/student — the student's assigned and completed tests.
 */
import { Link } from 'react-router-dom';
import { PageHeader, Card, CardContent, CardHeader, CardTitle, Button } from '@bloomneo/uikit';
import { ClipboardList, CheckCircle2, Percent, ArrowRight, Upload } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { useDemo, ME_STUDENT, studentById } from '../../data/store';
import { Stat, StatusBadge, fmt, useStudentProgress } from '../../components/parts';

export default function StudentHome() {
  const { submissions, papers } = useDemo();
  const me = studentById(ME_STUDENT);
  const { avg, done } = useStudentProgress(ME_STUDENT);
  const mine = submissions.filter((s) => s.studentId === ME_STUDENT);
  const todo = mine.filter((s) => s.status !== 'evaluated');
  const paperOf = (id: string) => papers.find((p) => p.id === id)!;

  return (
    <>
      <SEO title="My tests" />
      <PageHeader title={`Hi ${me.name.split(' ')[0]} 👋`} description="Download your paper, write the answers on paper, then upload photos for correction." />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="To do" value={todo.length} icon={ClipboardList} />
        <Stat label="Completed" value={done.length} icon={CheckCircle2} />
        <Stat label="Average score" value={`${avg}%`} icon={Percent} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Assigned to you</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {todo.length === 0 && <p className="text-sm text-muted-foreground">You’re all caught up.</p>}
            {todo.map((s) => {
              const p = paperOf(s.paperId);
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.title}</p>
                    <p className="text-sm text-muted-foreground">{p.subject} · {p.durationMins} min</p>
                  </div>
                  <StatusBadge s={s} />
                  <Button size="sm" asChild>
                    <Link to={`/demo/student/tests/${s.id}`}>
                      {s.status === 'evaluating' ? 'View status' : <><Upload className="size-4" /> Open</>}
                    </Link>
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Results</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {[...done].reverse().map(({ s, paper }) => (
                <li key={s.id}>
                  <Link to={`/demo/student/results/${s.id}`} className="flex items-center gap-3 px-6 py-3 text-sm hover:bg-accent/40">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{paper.title}</span>
                      <span className="text-xs text-muted-foreground">Submitted {fmt(s.submittedAt)}</span>
                    </span>
                    <StatusBadge s={s} />
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
