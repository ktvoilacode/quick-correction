/**
 * /demo/parent — a parent's view of their child.
 */
import { PageHeader, Card, CardContent, CardHeader, CardTitle, Alert, AlertTitle, AlertDescription } from '@bloomneo/uikit';
import { Percent, CheckCircle2, ClipboardList, Trophy, Bell } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { useDemo, ME_STUDENT, studentById, pct } from '../../data/store';
import { Stat, StudentReport, StatusBadge, useStudentProgress } from '../../components/parts';

export default function ParentHome() {
  const { papers, submissions } = useDemo();
  const child = studentById(ME_STUDENT);
  const first = child.name.split(' ')[0];
  const { avg, done, pending, trend } = useStudentProgress(ME_STUDENT);
  const last = trend[trend.length - 1];

  // Class rank on the most recent evaluated paper.
  const lastPaper = done[done.length - 1]?.paper;
  const peers = lastPaper ? submissions.filter((s) => s.paperId === lastPaper.id && s.status === 'evaluated').sort((a, b) => pct(b) - pct(a)) : [];
  // A rank among one or two finishers says nothing, so only show it once most of the class is in.
  const rank = peers.length >= 3 ? peers.findIndex((s) => s.studentId === ME_STUDENT) + 1 : 0;

  return (
    <>
      <SEO title="Child overview" />
      <PageHeader title={`${first}’s progress`} description={`Class ${child.className} · Mathematics · ${child.name}`} />

      {last && (
        <Alert className="mt-6">
          <Bell className="size-4" />
          <AlertTitle>Latest: {done[done.length - 1]!.paper.title}</AlertTitle>
          <AlertDescription>
            {first} scored {last.score}%
            {peers.length >= 3
              ? ` against a class average of ${last.classAvg}% — rank ${rank} of ${peers.length}.`
              : '. Class comparison appears once more classmates have submitted.'}
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Average score" value={`${avg}%`} icon={Percent} />
        <Stat label="Tests completed" value={done.length} icon={CheckCircle2} />
        <Stat label="Pending" value={pending.length} icon={ClipboardList} />
        <Stat label="Last test rank" value={rank ? `#${rank}` : '—'} hint={rank ? `of ${peers.length} in class` : 'waiting for classmates'} icon={Trophy} />
      </div>

      {pending.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base">Upcoming / awaiting submission</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pending.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 text-sm">
                <span>{papers.find((p) => p.id === s.paperId)?.title}</span>
                <StatusBadge s={s} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="mt-6"><StudentReport studentId={ME_STUDENT} resultBase="/demo/parent/results" /></div>
    </>
  );
}
