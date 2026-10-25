/**
 * One corrected submission: score, AI summary, per-question marks and the
 * uploaded answer pages. Shared by the teacher and parent views.
 */
import { Link } from 'react-router-dom';
import { PageHeader, Card, CardContent, CardHeader, CardTitle, Badge, Button, EmptyState } from '@bloomneo/uikit';
import { Sparkles, FileQuestion, ImageIcon, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { QUESTION_BANK, SECTIONS } from '../data/questions';
import { useDemo, pct, studentById, weakChapters } from '../data/store';
import { fmt } from './parts';

export function ResultView({ submissionId, back, review = false }: {
  submissionId: string;
  back: { label: string; href: string };
  /** Teacher view: show the "check the AI's marks" banner. */
  review?: boolean;
}) {
  const { submissions, papers, approve } = useDemo();
  const s = submissions.find((x) => x.id === submissionId);
  const paper = s && papers.find((p) => p.id === s.paperId);

  if (!s || !paper) {
    return <EmptyState icon={<FileQuestion className="size-6" />} title="Result not found" action={<Button asChild variant="outline"><Link to={back.href}>{back.label}</Link></Button>} />;
  }

  const st = studentById(s.studentId);

  if (s.status !== 'evaluated' || !s.results) {
    return (
      <EmptyState
        icon={s.status === 'evaluating' ? <Loader2 className="size-6 animate-spin" /> : <FileQuestion className="size-6" />}
        title={s.status === 'evaluating' ? 'AI is correcting the answer sheet…' : 'Not submitted yet'}
        description={s.status === 'evaluating' ? 'Reading handwriting and marking each answer against the CBSE scheme. This page updates automatically.' : `Due ${fmt(s.dueDate)}.`}
      />
    );
  }

  const p = pct(s);
  const chapters = weakChapters(s.results);
  let n = 0;

  return (
    <>
      <PageHeader
        title={paper.title}
        description={`${st.name} · Class ${st.className} · submitted ${fmt(s.submittedAt)}`}
        breadcrumbs={[{ label: back.label, href: back.href }, { label: 'Result' }]}
      />

      {review && (s.reviewed ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-success"><CheckCircle2 className="size-4" /> You approved these marks.</p>
      ) : (
        <Card className="mt-4 border-primary/30">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
            <ShieldCheck className="hidden size-5 shrink-0 text-primary sm:block" />
            <p className="flex-1 text-sm">
              <span className="font-medium">Marked by AI — check before you approve.</span>{' '}
              <span className="text-muted-foreground">Look over the question-wise marks below; the parent is told once you approve.</span>
            </p>
            <Button onClick={() => approve(s.id)} className="shrink-0"><CheckCircle2 className="size-4" /> Approve marks</Button>
          </CardContent>
        </Card>
      ))}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground">Score</p>
              <p className="text-4xl font-semibold tracking-tight">{s.score}<span className="text-xl text-muted-foreground">/{s.max}</span></p>
              <Badge className="mt-2" variant={p < 50 ? 'destructive' : 'secondary'}>{p}%</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="size-4" /> AI feedback</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">{s.summary}</CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">By chapter</CardTitle></CardHeader>
            <CardContent className="space-y-2.5">
              {chapters.map((c) => (
                <div key={c.chapter} className="text-sm">
                  <div className="mb-1 flex justify-between"><span>{c.chapter}</span><span className="text-muted-foreground">{c.pct}%</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${c.pct < 50 ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Uploaded pages</CardTitle></CardHeader>
            <CardContent>
              {s.pages.some((x) => x.startsWith('data:')) ? (
                <div className="grid grid-cols-3 gap-2">
                  {s.pages.map((src, i) => <img key={i} src={src} alt={`Page ${i + 1}`} className="aspect-[3/4] w-full rounded-md border border-border object-cover" />)}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="grid aspect-[3/4] place-items-center rounded-md border border-dashed border-border bg-muted/50 text-xs text-muted-foreground">
                      <ImageIcon className="size-4" /> p{i}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="self-start">
          <CardHeader><CardTitle className="text-base">Question-wise marks</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {s.results.map((r) => {
                const q = QUESTION_BANK.find((x) => x.id === r.questionId)!;
                n += 1;
                const full = r.awarded === r.max;
                const zero = r.awarded === 0;
                return (
                  <li key={r.questionId} className="flex gap-4 px-6 py-3.5 text-sm">
                    <span className="w-6 shrink-0 font-medium text-muted-foreground">{n}.</span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2">{q.text}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{SECTIONS[q.section].title} · {q.chapter}</p>
                      <p className={`mt-1.5 text-xs ${zero ? 'text-destructive' : full ? 'text-success' : 'text-warning'}`}>{r.feedback}</p>
                    </div>
                    <Badge variant={zero ? 'destructive' : full ? 'secondary' : 'outline'} className="h-fit shrink-0">
                      {r.awarded}/{r.max}
                    </Badge>
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
