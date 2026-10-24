/**
 * /demo/school/papers/new — generate a board-pattern paper.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Checkbox,
  RadioGroup, RadioGroupItem, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, toast,
} from '@bloomneo/uikit';
import { Sparkles, Loader2 } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { CHAPTERS, SUBJECTS, SECTIONS, buildPaper, totalMarks, type SectionId } from '../../../data/questions';
import { useDemo } from '../../../data/store';

export default function NewPaper() {
  const { createPaper } = useDemo();
  const navigate = useNavigate();
  const [title, setTitle] = React.useState('Unit Test 3 — Revision');
  const [subject, setSubject] = React.useState<string>('maths');
  const [pattern, setPattern] = React.useState<'board' | 'unit'>('unit');
  const [chapters, setChapters] = React.useState<string[]>(['Quadratic Equations', 'Trigonometry', 'Statistics', 'Probability']);
  const [busy, setBusy] = React.useState(false);

  const preview = buildPaper(chapters, pattern);
  const toggle = (c: string) => setChapters((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));
  const all = chapters.length === CHAPTERS.length;

  const generate = () => {
    if (!preview.length) {
      toast.error('Pick at least one chapter.');
      return;
    }
    setBusy(true);
    window.setTimeout(() => {
      const paper = createPaper({
        title: title.trim() || 'Untitled paper',
        subject: SUBJECTS.find((s) => s.id === subject)!.name,
        className: '10-A',
        pattern,
        durationMins: pattern === 'board' ? 180 : 60,
        questionIds: preview.map((q) => q.id),
      });
      toast.success('Paper generated');
      navigate(`/demo/school/papers/${paper.id}`);
    }, 1400);
  };

  return (
    <>
      <SEO title="Generate paper" />
      <PageHeader
        title="Generate a test paper"
        description="Choose the pattern and chapters. MedhaMark picks questions to match the CBSE blueprint."
        breadcrumbs={[{ label: 'Test papers', href: '/demo/school/papers' }, { label: 'Generate' }]}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardContent className="space-y-6 py-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="title">Paper title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s.id} value={s.id} disabled={!s.ready}>
                        {s.name}{!s.ready && ' (coming soon)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Class</Label>
                <Select value="10-A" onValueChange={() => {}}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="10-A">Class 10 · Section A</SelectItem></SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pattern</Label>
              <RadioGroup value={pattern} onValueChange={(v) => setPattern(v as 'board' | 'unit')} className="grid gap-3 sm:grid-cols-2">
                {[
                  { v: 'unit', t: 'Unit test', d: 'Shorter paper, same section mix · 60 min' },
                  { v: 'board', t: 'Full board pattern', d: 'Sections A–E as in the CBSE exam · 80 marks · 3 h' },
                ].map((o) => (
                  <label key={o.v} className="flex cursor-pointer gap-3 rounded-lg border border-border p-3 has-[[data-state=checked]]:border-primary">
                    <RadioGroupItem value={o.v} className="mt-0.5" />
                    <span>
                      <span className="block text-sm font-medium">{o.t}</span>
                      <span className="block text-xs text-muted-foreground">{o.d}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Chapters</Label>
                <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setChapters(all ? [] : [...CHAPTERS])}>
                  {all ? 'Clear all' : 'Select all'}
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {CHAPTERS.map((c) => (
                  <label key={c} className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent/40">
                    <Checkbox checked={chapters.includes(c)} onCheckedChange={() => toggle(c)} />
                    {c}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader><CardTitle className="text-base">Blueprint</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(Object.keys(SECTIONS) as SectionId[]).map((s) => {
                const n = preview.filter((q) => q.section === s).length;
                return (
                  <div key={s} className="flex justify-between">
                    <span className="text-muted-foreground">{SECTIONS[s].title} · {SECTIONS[s].marks} mark{SECTIONS[s].marks > 1 && 's'}</span>
                    <span className="font-medium">{n} Q · {n * SECTIONS[s].marks} m</span>
                  </div>
                );
              })}
              <div className="flex justify-between border-t border-border pt-2 font-semibold">
                <span>Total</span>
                <span>{preview.length} questions · {totalMarks(preview)} marks</span>
              </div>
            </CardContent>
          </Card>
          <Button className="w-full" size="lg" onClick={generate} disabled={busy}>
            {busy ? <><Loader2 className="size-4 animate-spin" /> Generating…</> : <><Sparkles className="size-4" /> Generate paper</>}
          </Button>
        </div>
      </div>
    </>
  );
}
