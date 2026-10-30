/**
 * One paper — `/parent/papers/:id`.
 *
 * Before it is done: the paper to print or read, and where to add photos of
 * the written answers. Then it is sent for marking; this page updates by
 * itself and shows the marks question by question.
 */
import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Badge, Alert, AlertDescription, AlertTitle, toast } from '@bloomneo/uikit';
import { ArrowLeft, Camera, ImagePlus, Send, Loader2, AlertTriangle, Info, Printer } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { api, sendFile } from '@/shared/api';
import { MathText } from '@/shared/MathText';
import { PageThumb, samplePage, prepareImage } from '@/shared/AnswerPages';
import { useLoad, fmtDate } from '@/shared/useLoad';
import { PaperSheet } from '@/features/teacher/components/PaperSheet';
import type { SubDetail } from '../../lib/types';

export default function ParentPaperPage() {
  const { id = '' } = useParams();
  const { data, error, loading, reload } = useLoad(async () => (await api.get<{ submission: SubDetail }>(`/api/parent/submissions/${id}`)).submission, [id]);
  const [busy, setBusy] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // While the marker works, check again every couple of seconds.
  const status = data?.status;
  React.useEffect(() => {
    if (status !== 'evaluating') return;
    const t = setInterval(() => void reload(), 2000);
    return () => clearInterval(t);
  }, [status, reload]);

  async function run(label: string, fn: () => Promise<unknown>, done?: string) {
    setBusy(label);
    try { await fn(); if (done) toast.success(done); await reload(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Something went wrong.'); }
    finally { setBusy(null); }
  }
  const upload = (files: Blob[]) => run('upload', async () => { for (const f of files) await sendFile(`/api/parent/submissions/${id}/pages`, await prepareImage(f)); });

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading" /></div>;
  if (error || !data) return <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertDescription>{error ?? 'Not found.'}</AlertDescription></Alert>;

  const qById = new Map(data.questions.map((q) => [q.id, q]));
  const placeholder = /placeholder marking/i.test(data.summary ?? '');
  const pagesBase = `/api/parent/submissions/${id}/pages`;

  return (
    <>
      <SEO title={`${data.paper.title} · ${data.student.name}`} />
      <Link to="/parent/papers" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden"><ArrowLeft className="size-4" /> Papers</Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{data.paper.title}</h1>
          <p className="text-sm text-muted-foreground">{data.student.name} · {data.paper.durationMins} min · due {fmtDate(data.dueDate)}</p>
        </div>
        <Badge variant="outline">{data.status === 'assigned' ? 'To do' : data.status === 'evaluating' ? 'Being marked' : data.status === 'failed' ? 'Marking failed' : data.reviewed ? 'Marked' : 'Marked · teacher checking'}</Badge>
      </div>

      {data.pages.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2 print:hidden" aria-label="Answer pages">
          {data.pages.map((_, n) => <PageThumb key={n} base={pagesBase} n={n} />)}
        </div>
      )}

      {data.status === 'assigned' && (
        <section className="mb-8 rounded-xl border border-border bg-card p-5 print:hidden">
          <h2 className="font-semibold">When {data.student.name.split(' ')[0]} has finished</h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">Photograph each page of the written answers, in order, and add them here. Then send them for marking. You cannot change them after that.</p>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ''; if (f.length) void upload(f); }} />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={!!busy} onClick={() => fileRef.current?.click()}>
              {busy === 'upload' ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />} Add photos
            </Button>
            {import.meta.env.DEV && (
              <Button variant="outline" disabled={!!busy} onClick={async () => upload([await samplePage()])}><ImagePlus className="size-4" /> Use a sample page</Button>
            )}
            <Button disabled={!!busy || data.pages.length === 0} onClick={() => run('submit', () => api.post(`/api/parent/submissions/${id}/submit`, {}), 'Sent for marking')}>
              {busy === 'submit' ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send for marking {data.pages.length > 0 && `(${data.pages.length} page${data.pages.length === 1 ? '' : 's'})`}
            </Button>
          </div>
        </section>
      )}

      {data.status === 'evaluating' && (
        <section className="mb-8 flex items-center gap-3 rounded-xl border border-border bg-card p-5 print:hidden">
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
          <div><p className="font-medium">Marking the answers…</p><p className="text-sm text-muted-foreground">This page updates by itself when the marks are ready.</p></div>
        </section>
      )}

      {data.status === 'failed' && (
        <Alert variant="destructive" className="mb-8"><AlertTriangle className="size-4" /><AlertTitle>Marking did not finish</AlertTitle><AlertDescription>Please tell the teacher. They can set the paper again.</AlertDescription></Alert>
      )}

      {data.status === 'evaluated' && data.results && (
        <section className="mb-8">
          {placeholder && (
            <Alert className="mb-4 border-amber-500/40 bg-amber-500/10">
              <Info className="size-4" />
              <AlertTitle>Practice marks</AlertTitle>
              <AlertDescription>The AI marker is not connected yet, so these marks are made up to show how the page will look.</AlertDescription>
            </Alert>
          )}
          {!data.reviewed && !placeholder && (
            <Alert className="mb-4"><Info className="size-4" /><AlertDescription>Your child's teacher has not checked these marks yet. They may change.</AlertDescription></Alert>
          )}
          <div className="mb-4 rounded-xl border border-border bg-card p-5">
            <p className="text-3xl font-semibold">{data.score}<span className="text-lg text-muted-foreground">/{data.max}</span></p>
            {data.summary && <p className="mt-1 text-sm text-muted-foreground">{data.summary}</p>}
          </div>
          <ol className="space-y-2">
            {data.results.map((r, i) => {
              const q = qById.get(r.questionId);
              return (
                <li key={r.questionId} className="flex gap-3 rounded-xl border border-border px-4 py-3">
                  <span className="w-6 shrink-0 text-sm text-muted-foreground">{i + 1}.</span>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="line-clamp-3">{q ? <MathText text={q.text} /> : r.questionId}</p>
                    {r.feedback && <p className="mt-1 text-xs text-muted-foreground">{r.feedback}</p>}
                  </div>
                  <span className={`shrink-0 text-sm font-semibold ${r.awarded === r.max ? 'text-success' : r.awarded === 0 ? 'text-destructive' : ''}`}>{r.awarded}/{r.max}</span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {data.status !== 'evaluated' && (
        <>
          <div className="mb-3 flex items-center justify-between print:hidden">
            <h2 className="font-semibold">The paper</h2>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="size-4" /> Print</Button>
          </div>
          <PaperSheet title={data.paper.title} durationMins={data.paper.durationMins} questions={data.questions} layout={data.paper.layout} />
        </>
      )}
    </>
  );
}
