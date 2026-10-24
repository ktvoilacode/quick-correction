/**
 * /demo/school/insights — class overview: papers, submissions, averages.
 */
import { Link } from 'react-router-dom';
import { PageHeader, Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@bloomneo/uikit';
import { FileText, Users, ClipboardCheck, Percent, FilePlus2 } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { useDemo, pct, STUDENTS, studentById } from '../../data/store';
import { Stat, ScoreTrend, fmt } from '../../components/parts';

export default function SchoolHome() {
  const { papers, submissions } = useDemo();
  const evaluated = submissions.filter((s) => s.status === 'evaluated');
  const pending = submissions.filter((s) => s.status === 'assigned');
  const classAvg = evaluated.length ? Math.round(evaluated.reduce((n, s) => n + pct(s), 0) / evaluated.length) : 0;

  const trend = [...papers]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((p) => {
      const sub = evaluated.filter((s) => s.paperId === p.id);
      return sub.length ? { name: p.title.split(' — ')[0], score: Math.round(sub.reduce((n, s) => n + pct(s), 0) / sub.length) } : null;
    })
    .filter((x): x is { name: string; score: number } => x !== null);

  const recent = [...evaluated].sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? '')).slice(0, 6);

  return (
    <>
      <SEO title="Insights" />
      <PageHeader
        title="Class 10-A · Mathematics"
        description="Papers, submissions and how the class is doing."
        actions={<Button asChild><Link to="/demo/school/papers/new"><FilePlus2 className="size-4" /> Generate paper</Link></Button>}
      />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Papers created" value={papers.length} icon={FileText} />
        <Stat label="Students" value={STUDENTS.length} hint="Class 10-A" icon={Users} />
        <Stat label="Awaiting upload" value={pending.length} hint="assigned, not yet submitted" icon={ClipboardCheck} />
        <Stat label="Class average" value={`${classAvg}%`} hint="across evaluated tests" icon={Percent} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card>
          <CardHeader><CardTitle className="text-base">Class average by test</CardTitle></CardHeader>
          <CardContent><ScoreTrend data={trend} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recently corrected</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {recent.map((s) => {
                const p = papers.find((x) => x.id === s.paperId)!;
                return (
                  <li key={s.id}>
                    <Link to={`/demo/school/results/${s.id}`} className="flex items-center gap-3 px-6 py-3 text-sm hover:bg-accent/40">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{studentById(s.studentId).name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{p.title} · {fmt(s.submittedAt)}</span>
                      </span>
                      <Badge variant={pct(s) < 50 ? 'destructive' : 'secondary'}>{pct(s)}%</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
