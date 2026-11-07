/**
 * Faculty paper builder — `/faculty`.
 *
 * Choose the pattern (board paper, unit test) and chapters; the page sets a
 * paper in board format, shows it as it will print, and downloads it as a PDF
 * (the browser's "Save as PDF" on the print sheet) with or without the answer
 * key. Nothing is stored. Shuffle sets another paper from the same bank.
 */
import * as React from 'react';
import { Button, Input, FormField, Alert, AlertDescription, AlertTitle, toast } from '@bloomneo/uikit';
import { Shuffle, Loader2, AlertTriangle, Check, Printer } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { api } from '@/shared/api';
import { PaperSheet } from '@/features/teacher/components/PaperSheet';
import { useLoad } from '@/features/teacher/lib/useLoad';
import type { Subject, LayoutSection } from '@/features/teacher/lib/types';
import type { Question } from '@/features/teacher/lib/types';

type FacultyPreview = {
  title: string; pattern: string; durationMins: number; marks: number; chapterNames: string[];
  shortBy: number; missingQuestions: number; drafts: number; layout: LayoutSection[]; questions: Question[];
};
type Setup = { subjects: Subject[]; bank: { approved: number; drafts: number } };

/** The paper's general instructions, written from the sections actually on it. */
function instructionsFor(p: FacultyPreview): string[] {
  const n = p.questions.length;
  const out = [`This question paper has ${n} questions. All questions are compulsory.`];
  for (const s of p.layout) {
    const alt = Object.keys(s.alternates ?? {}).length;
    out.push(`${s.title} has ${s.questionIds.length} question${s.questionIds.length === 1 ? '' : 's'} of ${s.marksEach} mark${s.marksEach === 1 ? '' : 's'} each${alt ? `, ${alt} with an internal choice (OR)` : ''}.`);
  }
  out.push('Draw neat figures wherever required. Take π = 22/7 wherever required, if not stated.');
  return out;
}

export default function FacultyBuilder() {
  const setup = useLoad(async () => api.get<Setup>('/api/faculty/setup'));
  const subject = setup.data?.subjects[0];

  const [patternId, setPatternId] = React.useState('');
  const [chapterIds, setChapterIds] = React.useState<string[]>([]);
  const [marks, setMarks] = React.useState('');
  const [variant, setVariant] = React.useState(0);
  const [includeDrafts, setIncludeDrafts] = React.useState(false);
  const [showAnswers, setShowAnswers] = React.useState(false);
  const [paper, setPaper] = React.useState<FacultyPreview | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (subject && !patternId) { setPatternId(subject.patterns[0].id); setChapterIds(subject.chapters.map((c) => c.id)); }
  }, [subject, patternId]);

  React.useEffect(() => {
    if (!subject || !patternId || chapterIds.length === 0) { setPaper(null); return; }
    let live = true;
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const r = await api.post<{ paper: FacultyPreview }>('/api/faculty/preview', {
          patternId, variant, includeDrafts,
          chapterIds: chapterIds.length === subject.chapters.length ? [] : chapterIds,
          ...(Number(marks) > 0 ? { targetMarks: Number(marks) } : {}),
        });
        if (live) { setPaper(r.paper); setError(null); }
      } catch (err) {
        if (live) { setPaper(null); setError(err instanceof Error ? err.message : 'Could not set a paper.'); }
      } finally { if (live) setBusy(false); }
    }, 350);
    return () => { live = false; clearTimeout(t); };
  }, [subject, patternId, chapterIds, variant, includeDrafts, marks]);

  if (setup.loading) return <div className="grid place-items-center py-20"><Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading" /></div>;
  if (setup.error || !subject || !setup.data) {
    return <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertTitle>Cannot set papers yet</AlertTitle><AlertDescription>{setup.error ?? 'No subject with paper patterns and chapters is set up.'}</AlertDescription></Alert>;
  }
  const { bank } = setup.data;
  const allChapters = chapterIds.length === subject.chapters.length;

  function download() {
    const name = (paper?.title ?? 'paper').replace(/[^\w]+/g, '-');
    const old = document.title;
    document.title = `${name}${showAnswers ? '-with-answers' : ''}`;
    toast.success('In the print window choose "Save as PDF" as the destination.');
    setTimeout(() => { window.print(); document.title = old; }, 300);
  }

  return (
    <>
      <SEO title="Paper builder" />
      <div className="print:hidden">
        <h1 className="mb-1 text-2xl font-semibold">Set a paper</h1>
        <p className="mb-6 text-sm text-muted-foreground">{subject.label}. Pick a pattern and chapters, review the paper in board format, then download it.</p>

        <div className="mb-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
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
                  return <Button key={c.id} type="button" size="sm" variant={on ? 'default' : 'outline'} aria-pressed={on}
                    onClick={() => setChapterIds(on ? chapterIds.filter((x) => x !== c.id) : [...chapterIds, c.id])}>{c.name}</Button>;
                })}
              </div>
            </section>
            <section className="grid gap-4 sm:grid-cols-2">
              <FormField label="Total marks" helper="Optional. Leave blank for the pattern's own marks.">
                <Input type="number" min={1} max={200} inputMode="numeric" value={marks} onChange={(e) => setMarks(e.target.value)} placeholder="e.g. 40" />
              </FormField>
            </section>
            <section className="space-y-2 text-sm">
              <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={includeDrafts} onChange={(e) => setIncludeDrafts(e.target.checked)} />
                <span>Include new draft questions <span className="text-muted-foreground">({bank.drafts.toLocaleString()} AI-written drafts not yet approved, marked "Draft" on the page, never printed as such). Off uses only the {bank.approved.toLocaleString()} approved questions.</span></span></label>
            </section>
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-medium">This paper</h2>{busy && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Updating" />}</div>
              {chapterIds.length === 0 ? <p className="text-sm text-muted-foreground">Pick at least one chapter.</p>
                : error ? <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>
                : !paper ? <p className="text-sm text-muted-foreground">Setting the paper…</p> : (
                  <>
                    <p className="font-semibold">{paper.title}</p>
                    <p className="mb-3 text-sm text-muted-foreground"><strong className="text-foreground">{paper.marks}</strong> marks · <strong className="text-foreground">{paper.questions.length}</strong> questions · {paper.durationMins} min{paper.drafts > 0 && ` · ${paper.drafts} draft`}</p>
                    {(paper.shortBy > 0 || paper.missingQuestions > 0) && (
                      <Alert className="mb-3 border-amber-500/40 bg-amber-500/10"><AlertTriangle className="size-4" /><AlertDescription className="text-xs">
                        {paper.shortBy > 0 ? `The bank has ${paper.shortBy} marks fewer than the ${marks} asked for on these chapters.` : `The bank is short by ${paper.missingQuestions} question${paper.missingQuestions === 1 ? '' : 's'} for this pattern on these chapters. Add chapters${includeDrafts ? '' : ' or include drafts'}.`}
                      </AlertDescription></Alert>
                    )}
                    <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={showAnswers} onChange={(e) => setShowAnswers(e.target.checked)} /> Answer key (shown and downloaded)</label>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setVariant((v) => v + 1)} disabled={busy}><Shuffle className="size-4" /> Shuffle</Button>
                      <Button className="flex-1" onClick={download} disabled={busy}><Printer className="size-4" /> Download PDF</Button>
                    </div>
                  </>
                )}
            </div>
          </aside>
        </div>
        <h2 className="mb-3 text-sm font-medium">Preview</h2>
      </div>

      {paper && (
        <PaperSheet title={`${paper.pattern}${allChapters ? '' : ` — ${paper.chapterNames.length === 1 ? paper.chapterNames[0] : `${paper.chapterNames.length} chapters`}`}`}
          eyebrow="Class X · Mathematics (Standard) · Code 041" durationMins={paper.durationMins} questions={paper.questions} layout={paper.layout}
          instructions={instructionsFor(paper)} showAnswers={showAnswers} answersInPrint={showAnswers} />
      )}
    </>
  );
}
