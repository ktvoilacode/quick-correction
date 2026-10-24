/**
 * /demo/school/students — class roster with progress at a glance.
 */
import { Link } from 'react-router-dom';
import { PageHeader, Card, Badge, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@bloomneo/uikit';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { STUDENTS } from '../../../data/store';
import { useStudentProgress } from '../../../components/parts';

function StudentRow({ id }: { id: string }) {
  const s = STUDENTS.find((x) => x.id === id)!;
  const { avg, trend, chapters, pending } = useStudentProgress(id);
  const last = trend[trend.length - 1]?.score ?? 0;
  const prev = trend[trend.length - 2]?.score ?? last;
  const delta = last - prev;
  const weakest = chapters[0];
  const Trend = delta > 2 ? TrendingUp : delta < -2 ? TrendingDown : Minus;

  return (
    <TableRow>
      <TableCell>
        <Link to={`/demo/school/students/${id}`} className="font-medium hover:underline">{s.name}</Link>
        <div className="text-xs text-muted-foreground">Roll {s.roll}</div>
      </TableCell>
      <TableCell><Badge variant={avg < 50 ? 'destructive' : 'secondary'}>{avg}%</Badge></TableCell>
      <TableCell>
        <span className={`inline-flex items-center gap-1 text-sm ${delta > 2 ? 'text-success' : delta < -2 ? 'text-destructive' : 'text-muted-foreground'}`}>
          <Trend className="size-4" /> {last}% {delta !== 0 && `(${delta > 0 ? '+' : ''}${delta})`}
        </span>
      </TableCell>
      <TableCell className="hidden md:table-cell">{weakest ? <span className="text-sm">{weakest.chapter} <span className="text-muted-foreground">· {weakest.pct}%</span></span> : '—'}</TableCell>
      <TableCell className="hidden sm:table-cell">{pending.length ? <Badge variant="outline">{pending.length} pending</Badge> : <span className="text-sm text-muted-foreground">All submitted</span>}</TableCell>
    </TableRow>
  );
}

export default function Students() {
  return (
    <>
      <SEO title="Students" />
      <PageHeader title="Students" description="Class 10-A · Mathematics. Open a student for the full progress report." />
      <Card className="mt-6 overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Average</TableHead>
              <TableHead>Last test</TableHead>
              <TableHead className="hidden md:table-cell">Weakest chapter</TableHead>
              <TableHead className="hidden sm:table-cell">Pending</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {STUDENTS.map((s) => <StudentRow key={s.id} id={s.id} />)}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
