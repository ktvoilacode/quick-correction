/**
 * Teacher home — `/teacher`. What needs doing, and the shortest path to a new paper.
 */
import { Link } from 'react-router-dom';
import { Button, Card, CardContent, Alert, AlertDescription } from '@bloomneo/uikit';
import { Plus, FileText, Users, ClipboardCheck, ChevronRight, AlertTriangle, Loader2, FlaskConical } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { api } from '@/shared/api';
import { useAuth } from '@/features/auth/hooks';
import { useLoad, fmtDate } from '../lib/useLoad';
import type { PaperRow, Student, ReviewRow } from '../lib/types';

export default function TeacherHome() {
  const { user } = useAuth();
  const { data, error, loading } = useLoad(async () => {
    const [papers, students, review] = await Promise.all([
      api.get<{ papers: PaperRow[] }>('/api/tutor/papers'),
      api.get<{ students: Student[] } | Student[]>('/api/tutor/students'),
      api.get<{ submissions: ReviewRow[] }>('/api/tutor/review'),
    ]);
    return { papers: papers.papers, students: Array.isArray(students) ? students : students.students, review: review.submissions };
  });

  const first = (user?.name || '').split(' ')[0];
  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading" /></div>;
  if (error || !data) return <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertDescription>{error ?? 'Could not load your dashboard.'}</AlertDescription></Alert>;

  const { papers, students, review } = data;
  const tile = 'flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition hover:bg-muted/50';

  return (
    <>
      <SEO title="Teacher" />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{first ? `Hello, ${first}` : 'Hello'}</h1>
          <p className="text-sm text-muted-foreground">Make a paper, try it out, and check the marks.</p>
        </div>
        <Button asChild><Link to="/teacher/papers/new"><Plus className="size-4" /> New paper</Link></Button>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Link to="/teacher/papers" className={tile}>
          <FileText className="size-5 text-primary" aria-hidden />
          <span><span className="block text-xl font-semibold">{papers.length}</span><span className="text-sm text-muted-foreground">Papers</span></span>
        </Link>
        <Link to="/teacher/students" className={tile}>
          <Users className="size-5 text-primary" aria-hidden />
          <span><span className="block text-xl font-semibold">{students.length}</span><span className="text-sm text-muted-foreground">Students</span></span>
        </Link>
        <Link to="/teacher/review" className={tile}>
          <ClipboardCheck className="size-5 text-primary" aria-hidden />
          <span><span className="block text-xl font-semibold">{review.length}</span><span className="text-sm text-muted-foreground">To review</span></span>
        </Link>
      </div>

      <Card className="mb-8">
        <CardContent className="flex items-start gap-3 p-4">
          <FlaskConical className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div className="text-sm">
            <p className="font-medium">Try a paper yourself</p>
            <p className="mt-1 text-muted-foreground">
              Create a paper, open it and press <strong>Test it</strong>. It is set for a practice student, you add a photo of an
              answer page, and the marks come back for you to check. No parent account needed.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Recent papers</h2>
        {papers.length > 0 && <Link to="/teacher/papers" className="text-sm text-primary hover:underline">All papers</Link>}
      </div>
      {papers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No papers yet. Make your first one.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {papers.slice(0, 5).map((p) => (
            <li key={p.id}>
              <Link to={`/teacher/papers/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.title}</span>
                  <span className="text-xs text-muted-foreground">{p.questions} questions · {p.marks} marks · {fmtDate(p.createdAt)}</span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
