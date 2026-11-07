/**
 * New paper — `/teacher/papers/new`.
 *
 * Pick a pattern and chapters; the page asks the generator for a preview as
 * you change things, so the marks, sections and any shortfall in the question
 * bank are visible before anything is saved. Shuffle tries another selection.
 */
import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, FormField, Alert, AlertDescription, AlertTitle, toast } from '@bloomneo/uikit';
import { Shuffle, Loader2, AlertTriangle, Check, ArrowLeft } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { api } from '@/shared/api';
import { useLoad } from '../../lib/useLoad';
import type { Subject, Preview } from '../../lib/types';

export default function NewPaperPage() {
  const navigate = useNavigate();
  const setup = useLoad(async () => (await api.get<{ subjects: Subject[] }>('/api/tutor/setup')).subjects);
  const subject = setup.data?.[0];

  const [patternId, setPatternId] = React.useState('');
  const [chapterIds, setChapterIds] = React.useState<string[]>([]);
  const [marks, setMarks] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [variant, setVariant] = React.useState(0);
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [previewError, setPreviewError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Start with the first pattern and every chapter, as most tests are.
  React.useEffect(() => {
    if (subject && !patternId) { setPatternId(subject.patterns[0].id); setChapterIds(subject.chapters.map((c) => c.id)); }
  }, [subject, patternId]);

  const body = React.useMemo(() => ({
    patternId, chapterIds: chapterIds.length === subject?.chapters.length ? [] : chapterIds, variant,
    ...(Number(marks) > 0 ? { targetMarks: Number(marks) } : {}),
  }), [patternId, chapterIds, variant, marks, subject]);

  // Ask for a preview a moment after the last change.
  React.useEffect(() => {
    if (!patternId || chapterIds.length === 0) { setPreview(null); return; }
    let live = true;
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const r = await api.post<{ paper: Preview }>('/api/tutor/papers', { ...body, preview: true });
        if (live) { setPreview(r.paper); setPreviewError(null); }
      } catch (err) {
        if (live) { setPreview(null); setPreviewError(err instanceof Error ? err.message : 'Could not build a preview.'); }
      } finally {
        if (live) setBusy(false);
      }
    }, 350);
    return () => { live = false; clearTimeout(t); };
  }, [body, patternId, chapterIds.length]);

  async function create() {
    if (saving || !preview) return;
    setSaving(true);
    try {
      const r = await api.post<{ paper: { id: string } }>('/api/tutor/papers', { ...body, ...(title.trim() ? { title: title.trim() } : {}) });
      toast.success('Paper created');
      navigate(`/teacher/papers/${r.paper.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the paper.');
      setSaving(false);
    }
  }

  if (setup.loading) return <div className="grid place-items-center py-20"><Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading" /></div>;
  if (setup.error || !subject) {
    return <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertTitle>Cannot make papers yet</AlertTitle><AlertDescription>{setup.error ?? 'No subject with paper patterns and chapters is set up. Ask the admin to add one.'}</AlertDescription></Alert>;
  }

  const allChapters = chapterIds.length === subject.chapters.length;
  const bySection = preview ? preview.layout.map((s) => ({ title: s.title, n: s.questionIds.length, marks: s.questionIds.length * s.marksEach })) : [];

  return (
    <>
      <SEO title="New paper" />
      <Link to="/teacher/papers" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Papers</Link>
      <h1 className="mb-1 text-2xl font-semibold">New paper</h1>
      <p className="mb-6 text-sm text-muted-foreground">{subject.label}</p>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-sm font-medium">Pattern</h2>
            <div role="radiogroup" aria-label="Paper pattern" className="grid gap-2 sm:grid-cols-2">
              {subject.patterns.map((p) => {
                const on = p.id === patternId;
                return (
                  <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => setPatternId(p.id)}
                    className={`rounded-xl border p-3 text-left transition ${on ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
                    <span className="flex items-center justify-between font-medium">{p.name}{on && <Check className="size-4 text-primary" />}</span>
                    <span className="block text-xs text-muted-foreground">{p.totalMarks} marks · {p.durationMins} min · {p.sections.reduce((n, s) => n + s.count, 0)} questions</span>
                    {p.description && <span className="mt-1 block text-xs text-muted-foreground">{p.description}</span>}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-medium">Chapters <span className="text-muted-foreground">({chapterIds.length} of {subject.chapters.length})</span></h2>
              <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setChapterIds(allChapters ? [] : subject.chapters.map((c) => c.id))}>{allChapters ? 'Clear' : 'Select all'}</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {subject.chapters.map((c) => {
                const on = chapterIds.includes(c.id);
                return (
                  <Button key={c.id} type="button" size="sm" variant={on ? 'default' : 'outline'} aria-pressed={on}
                    onClick={() => setChapterIds(on ? chapterIds.filter((x) => x !== c.id) : [...chapterIds, c.id])}>{c.name}</Button>
                );
              })}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <FormField label="Total marks" helper="Optional. Leave blank to use the pattern's marks.">
              <Input type="number" min={1} max={200} inputMode="numeric" value={marks} onChange={(e) => setMarks(e.target.value)} placeholder="e.g. 20" />
            </FormField>
            <FormField label="Title" helper="Optional. A name is made up from the pattern and chapters.">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={preview?.title ?? 'Unit test'} />
            </FormField>
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium">Preview</h2>
              {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Updating" />}
            </div>
            {chapterIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">Pick at least one chapter.</p>
            ) : previewError ? (
              <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertDescription>{previewError}</AlertDescription></Alert>
            ) : !preview ? (
              <p className="text-sm text-muted-foreground">Building…</p>
            ) : (
              <>
                <p className="font-semibold">{preview.title}</p>
                <p className="mb-3 text-sm text-muted-foreground">
                  <strong className="text-foreground">{preview.marks}</strong> marks · <strong className="text-foreground">{preview.questions.length}</strong> questions · {preview.durationMins} min
                </p>
                <ul className="mb-3 divide-y divide-border rounded-lg border border-border text-sm">
                  {bySection.map((s) => (
                    <li key={s.title} className="flex justify-between gap-2 px-3 py-1.5"><span className="truncate">{s.title}</span><span className="shrink-0 text-muted-foreground">{s.n} Q · {s.marks} m</span></li>
                  ))}
                </ul>
                {(preview.shortBy > 0 || preview.missingQuestions > 0) && (
                  <Alert className="mb-3 border-amber-500/40 bg-amber-500/10">
                    <AlertTriangle className="size-4" />
                    <AlertDescription className="text-xs">
                      {preview.shortBy > 0
                        ? `The question bank has ${preview.shortBy} marks fewer than the ${marks} you asked for on these chapters.`
                        : `The question bank is short by ${preview.missingQuestions} question${preview.missingQuestions === 1 ? '' : 's'} for this pattern on these chapters. Add chapters or lower the marks.`}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setVariant((v) => v + 1)} disabled={busy}><Shuffle className="size-4" /> Shuffle</Button>
                  <Button className="flex-1" onClick={create} disabled={saving || busy}>{saving && <Loader2 className="size-4 animate-spin" />} Create paper</Button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
