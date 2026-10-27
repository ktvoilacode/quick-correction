/**
 * Paper — `/teacher/papers/:id`.
 *
 * The paper as printed (with an answer-key toggle), who it is set for, and the
 * quick way to try it out: "Test it" sets it for a practice student and opens
 * that student's answer sheet, so the whole loop runs from the teacher's side.
 */
import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Button, Input, FormField, Badge, Alert, AlertDescription, toast, useConfirm,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@bloomneo/uikit';
import { ArrowLeft, FlaskConical, UserPlus, Printer, Trash2, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { api } from '@/shared/api';
import { useLoad, fmtDate, inDays } from '../../lib/useLoad';
import { PaperSheet } from '../../components/PaperSheet';
import type { PaperDetail, Student } from '../../lib/types';

const STATUS: Record<string, string> = { assigned: 'Waiting for answers', evaluating: 'Being marked', evaluated: 'Marked', failed: 'Failed' };
const TEST_STUDENT = 'Test student';

export default function PaperPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { data, error, loading, reload } = useLoad(async () => (await api.get<{ paper: PaperDetail }>(`/api/tutor/papers/${id}`)).paper, [id]);
  const [answers, setAnswers] = React.useState(false);
  const [testing, setTesting] = React.useState(false);

  const [assigning, setAssigning] = React.useState(false);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [picked, setPicked] = React.useState<string[]>([]);
  const [due, setDue] = React.useState(inDays(7));
  const [saving, setSaving] = React.useState(false);

  async function openAssign() {
    try {
      const r = await api.get<{ students: Student[] }>('/api/tutor/students');
      setStudents(r.students);
      const already = new Set(data?.submissions.map((s) => s.student.id));
      setPicked(r.students.filter((s) => !already.has(s.id)).map((s) => s.id));
      setAssigning(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load your students.');
    }
  }

  async function assign() {
    if (!picked.length || saving) return;
    setSaving(true);
    try {
      await api.post(`/api/tutor/papers/${id}/assign`, { studentIds: picked, dueDate: due });
      toast.success(`Set for ${picked.length} student${picked.length === 1 ? '' : 's'}`);
      setAssigning(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not assign the paper.');
    } finally {
      setSaving(false);
    }
  }

  /** Set the paper for a practice student (made on the spot) and open their answer sheet. */
  async function testIt() {
    if (testing) return;
    setTesting(true);
    try {
      const list = (await api.get<{ students: Student[] }>('/api/tutor/students')).students;
      const student = list.find((s) => s.name === TEST_STUDENT)
        ?? (await api.post<{ student: Student }>('/api/tutor/students', { name: TEST_STUDENT })).student;
      await api.post(`/api/tutor/papers/${id}/assign`, { studentIds: [student.id], dueDate: inDays(7) });
      const fresh = (await api.get<{ paper: PaperDetail }>(`/api/tutor/papers/${id}`)).paper;
      const sub = fresh.submissions.find((s) => s.student.id === student.id);
      if (!sub) throw new Error('The practice answer sheet was not created.');
      navigate(`/teacher/results/${sub.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start the test.');
      setTesting(false);
    }
  }

  async function remove() {
    if (!data) return;
    const ok = await confirm({ title: `Delete "${data.title}"?`, description: data.submissions.length ? 'Answers and marks for it are deleted too.' : 'This cannot be undone.', confirmLabel: 'Delete', tone: 'destructive' });
    if (!ok) return;
    try { await api.delete(`/api/tutor/papers/${id}`); toast.success('Paper deleted'); navigate('/teacher/papers'); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not delete the paper.'); }
  }

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading" /></div>;
  if (error || !data) return <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertDescription>{error ?? 'Paper not found.'}</AlertDescription></Alert>;

  return (
    <>
      <SEO title={data.title} />
      <Link to="/teacher/papers" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden"><ArrowLeft className="size-4" /> Papers</Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{data.title}</h1>
          <p className="text-sm text-muted-foreground">{data.pattern} · {data.questions.length} questions · {data.marks} marks · {data.durationMins} min · made {fmtDate(data.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={testIt} disabled={testing}>{testing ? <Loader2 className="size-4 animate-spin" /> : <FlaskConical className="size-4" />} Test it</Button>
          <Button variant="outline" onClick={openAssign}><UserPlus className="size-4" /> Set for students</Button>
          <Button variant="outline" size="icon" aria-label="Print" title="Print" onClick={() => window.print()}><Printer className="size-4" /></Button>
          <Button variant="ghost" size="icon" aria-label="Delete paper" title="Delete" onClick={remove}><Trash2 className="size-4 text-destructive" /></Button>
        </div>
      </div>

      <section className="mb-8 print:hidden">
        <h2 className="mb-2 font-semibold">Set for</h2>
        {data.submissions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Not set for anyone yet. Use <strong>Test it</strong> to try it yourself, or set it for your students.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {data.submissions.map((s) => (
              <li key={s.id}>
                <Link to={`/teacher/results/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                  <span className="min-w-0 flex-1 truncate font-medium">{s.student.name}</span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">Due {fmtDate(s.dueDate)}</span>
                  {s.status === 'evaluated' && s.max ? <Badge variant="secondary">{s.score}/{s.max}</Badge> : null}
                  <Badge variant="outline">{STATUS[s.status] ?? s.status}{s.status === 'evaluated' && !s.reviewed ? ' · to check' : ''}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mb-3 flex items-center justify-between print:hidden">
        <h2 className="font-semibold">Paper</h2>
        <Button variant="outline" size="sm" aria-pressed={answers} onClick={() => setAnswers((a) => !a)}>
          {answers ? <EyeOff className="size-4" /> : <Eye className="size-4" />} {answers ? 'Hide answers' : 'Show answers'}
        </Button>
      </div>
      <PaperSheet title={data.title} durationMins={data.durationMins} questions={data.questions} layout={data.layout} showAnswers={answers} />

      <Dialog open={assigning} onOpenChange={(o) => !o && setAssigning(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set for students</DialogTitle>
            <DialogDescription>They can add answer pages until the paper is submitted.</DialogDescription>
          </DialogHeader>
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground">You have no students yet. <Link to="/teacher/students" className="text-primary underline">Add some</Link>, or use <strong>Test it</strong>.</p>
          ) : (
            <div className="space-y-4">
              <ul className="max-h-60 space-y-1 overflow-y-auto">
                {students.map((s) => (
                  <li key={s.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
                      <input type="checkbox" checked={picked.includes(s.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, s.id] : picked.filter((x) => x !== s.id))} />
                      <span className="flex-1 truncate text-sm">{s.name}</span>
                      <span className="text-xs text-muted-foreground">{s.className}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <FormField label="Due date"><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></FormField>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssigning(false)}>Cancel</Button>
            <Button onClick={assign} disabled={!picked.length || saving}>{saving && <Loader2 className="size-4 animate-spin" />} Set paper</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
