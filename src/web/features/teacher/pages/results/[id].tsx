/**
 * Answer sheet and marks — `/teacher/results/:id`.
 *
 * One page for the whole life of a submission: add photos of the answer pages
 * (the teacher can do it for a practice student), send for marking, watch it
 * finish, then check and correct the marks and approve them.
 */
import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Input, Badge, Alert, AlertDescription, AlertTitle, toast } from '@bloomneo/uikit';
import { ArrowLeft, Camera, ImagePlus, Send, Loader2, AlertTriangle, CheckCircle2, ChevronDown, Info } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { api, sendFile, fetchBlob } from '@/shared/api';
import { MathText } from '@/shared/MathText';
import { useLoad, fmtDate } from '../../lib/useLoad';
import type { SubmissionDetail, QuestionResult } from '../../lib/types';

/** A plain page of lined paper with a title, so a test needs no real photo. */
function samplePage(): Promise<Blob> {
  const c = document.createElement('canvas');
  c.width = 800; c.height = 1100;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#cbd5e1';
  for (let y = 120; y < 1060; y += 40) { g.beginPath(); g.moveTo(50, y); g.lineTo(750, y); g.stroke(); }
  g.fillStyle = '#334155'; g.font = '28px sans-serif';
  g.fillText('Sample answer page (for testing)', 50, 80);
  return new Promise((resolve) => c.toBlob((b) => resolve(b!), 'image/png'));
}

function PageThumb({ submissionId, n }: { submissionId: string; n: number }) {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    let revoke: string | null = null;
    let live = true;
    fetchBlob(`/api/tutor/submissions/${submissionId}/pages/${n}`).then((b) => {
      if (!live) return;
      revoke = URL.createObjectURL(b);
      setUrl(revoke);
    }).catch(() => undefined);
    return () => { live = false; if (revoke) URL.revokeObjectURL(revoke); };
  }, [submissionId, n]);
  return url
    ? <img src={url} alt={`Answer page ${n + 1}`} className="h-28 w-20 rounded-md border border-border object-cover" />
    : <div className="grid h-28 w-20 place-items-center rounded-md border border-border bg-muted"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>;
}

export default function ResultPage() {
  const { id = '' } = useParams();
  const { data, error, loading, reload } = useLoad(async () => (await api.get<{ submission: SubmissionDetail }>(`/api/tutor/submissions/${id}`)).submission, [id]);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [edits, setEdits] = React.useState<Record<string, { awarded: number; feedback: string }>>({});
  const [open, setOpen] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // While the marker works, check again every couple of seconds.
  const status = data?.status;
  React.useEffect(() => {
    if (status !== 'evaluating') return;
    const t = setInterval(() => void reload(), 2000);
    return () => clearInterval(t);
  }, [status, reload]);

  // A fresh result starts from the marker's marks.
  React.useEffect(() => { setEdits({}); }, [data?.id, data?.status]);

  async function run<T>(label: string, fn: () => Promise<T>, done?: string) {
    setBusy(label);
    try { const r = await fn(); if (done) toast.success(done); await reload(); return r; }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Something went wrong.'); }
    finally { setBusy(null); }
  }

  async function upload(files: Blob[]) {
    await run('upload', async () => { for (const f of files) await sendFile(`/api/tutor/submissions/${id}/pages`, f); });
  }

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading" /></div>;
  if (error || !data) return <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertDescription>{error ?? 'Not found.'}</AlertDescription></Alert>;

  const qById = new Map(data.questions.map((q) => [q.id, q]));
  const results: QuestionResult[] = (data.results ?? []).map((r) => ({ ...r, ...(edits[r.questionId] ?? {}) }));
  const score = results.reduce((n, r) => n + r.awarded, 0);
  const max = results.reduce((n, r) => n + r.max, 0);
  const dirty = Object.keys(edits).length > 0;
  const placeholder = /placeholder marking/i.test(data.summary ?? '');
  const setEdit = (r: QuestionResult, patch: Partial<{ awarded: number; feedback: string }>) =>
    setEdits((e) => ({ ...e, [r.questionId]: { ...(e[r.questionId] ?? { awarded: r.awarded, feedback: r.feedback }), ...patch } }));

  return (
    <>
      <SEO title={`${data.student.name} · ${data.paper.title}`} />
      <Link to={`/teacher/papers/${data.paper.id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> {data.paper.title}</Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{data.student.name}</h1>
          <p className="text-sm text-muted-foreground">Class {data.student.className} · due {fmtDate(data.dueDate)}</p>
        </div>
        <Badge variant="outline">{data.status === 'assigned' ? 'Waiting for answers' : data.status === 'evaluating' ? 'Being marked' : data.status === 'failed' ? 'Marking failed' : data.reviewed ? 'Approved' : 'Marked · to check'}</Badge>
      </div>

      {data.pages.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2" aria-label="Answer pages">
          {data.pages.map((_, n) => <PageThumb key={n} submissionId={id} n={n} />)}
        </div>
      )}

      {data.status === 'assigned' && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Add the answer pages</h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">Photograph each page of the written answers and add them in order. A sample page is enough to try the flow.</p>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ''; if (f.length) void upload(f); }} />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={!!busy} onClick={() => fileRef.current?.click()}>
              {busy === 'upload' ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />} Add photos
            </Button>
            <Button variant="outline" disabled={!!busy} onClick={async () => upload([await samplePage()])}><ImagePlus className="size-4" /> Use a sample page</Button>
            <Button disabled={!!busy || data.pages.length === 0} onClick={() => run('submit', () => api.post(`/api/tutor/submissions/${id}/submit`, {}), 'Sent for marking')}>
              {busy === 'submit' ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send for marking {data.pages.length > 0 && `(${data.pages.length} page${data.pages.length === 1 ? '' : 's'})`}
            </Button>
          </div>
        </section>
      )}

      {data.status === 'evaluating' && (
        <section className="flex items-center gap-3 rounded-xl border border-border bg-card p-5">
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
          <div><p className="font-medium">Marking the answers…</p><p className="text-sm text-muted-foreground">This page updates by itself when the marks are ready.</p></div>
        </section>
      )}

      {data.status === 'failed' && (
        <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertTitle>Marking failed</AlertTitle><AlertDescription>The marks could not be worked out. Try another paper or add the pages again.</AlertDescription></Alert>
      )}

      {data.status === 'evaluated' && (
        <>
          {placeholder && (
            <Alert className="mb-4 border-amber-500/40 bg-amber-500/10">
              <Info className="size-4" />
              <AlertTitle>Practice marks</AlertTitle>
              <AlertDescription>The AI marker is not connected yet, so these marks are made up to show the flow. Do not use them for real students.</AlertDescription>
            </Alert>
          )}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <div>
              <p className="text-3xl font-semibold">{score}<span className="text-lg text-muted-foreground">/{max}</span></p>
              {data.summary && <p className="mt-1 max-w-xl text-sm text-muted-foreground">{data.summary}</p>}
            </div>
            <div className="flex gap-2">
              {dirty && (
                <Button variant="outline" disabled={!!busy} onClick={() => run('save', () => api.patch(`/api/tutor/submissions/${id}/results`, { results: Object.entries(edits).map(([questionId, e]) => ({ questionId, ...e })) }), 'Marks saved and approved')}>
                  {busy === 'save' && <Loader2 className="size-4 animate-spin" />} Save changes
                </Button>
              )}
              {!data.reviewed && !dirty && (
                <Button disabled={!!busy} onClick={() => run('approve', () => api.post(`/api/tutor/submissions/${id}/approve`, {}), 'Marks approved')}>
                  {busy === 'approve' ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Approve marks
                </Button>
              )}
            </div>
          </div>

          <ol className="space-y-2">
            {results.map((r, i) => {
              const q = qById.get(r.questionId);
              const expanded = open === r.questionId;
              return (
                <li key={r.questionId} className="rounded-xl border border-border">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="w-6 shrink-0 text-sm text-muted-foreground">{i + 1}.</span>
                    <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : r.questionId)}>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-sm">{q ? <MathText text={q.text} /> : r.questionId}</span>
                        <span className="block text-xs text-muted-foreground">{q?.section}{q?.chapter ? ` · ${q.chapter}` : ''}</span>
                      </span>
                      <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition ${expanded ? 'rotate-180' : ''}`} aria-hidden />
                    </button>
                    <span className="flex shrink-0 items-center gap-1 text-sm">
                      <Input type="number" min={0} max={r.max} aria-label={`Marks for question ${i + 1}`} className="h-8 w-14 px-2 text-right"
                        value={r.awarded} onChange={(e) => setEdit(r, { awarded: Math.max(0, Math.min(r.max, Math.round(Number(e.target.value) || 0))) })} />
                      <span className="text-muted-foreground">/ {r.max}</span>
                    </span>
                  </div>
                  {expanded && (
                    <div className="space-y-3 border-t border-border px-4 py-3 text-sm">
                      {q && <p className="whitespace-pre-wrap"><MathText text={q.text} /></p>}
                      {q?.options && <ol className="list-[upper-alpha] space-y-0.5 pl-6">{q.options.map((o, k) => <li key={k}><MathText text={String(o)} /></li>)}</ol>}
                      <Input aria-label={`Feedback for question ${i + 1}`} value={r.feedback} onChange={(e) => setEdit(r, { feedback: e.target.value })} />
                      {q?.answer && <div className="rounded-lg border border-border bg-muted/50 p-3"><p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Answer key</p><p className="whitespace-pre-wrap"><MathText text={q.answer} /></p></div>}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </>
  );
}
