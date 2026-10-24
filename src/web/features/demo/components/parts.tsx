/**
 * Building blocks shared by the prototype pages.
 */
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@bloomneo/uikit';
import type { LucideIcon } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar,
} from 'recharts';
import { SECTIONS, totalMarks, type SectionId } from '../data/questions';
import {
  useDemo, questionsOf, pct, weakChapters, SCHOOL, studentById,
  type Paper, type Submission,
} from '../data/store';

export function Stat({ label, value, hint, icon: Icon }: { label: string; value: React.ReactNode; hint?: string; icon: LucideIcon }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ s }: { s: Submission }) {
  if (s.status === 'evaluated') return <Badge>{pct(s)}% · {s.score}/{s.max}</Badge>;
  if (s.status === 'evaluating') return <Badge variant="secondary" className="animate-pulse">AI correcting…</Badge>;
  return <Badge variant="outline">Due {fmt(s.dueDate)}</Badge>;
}

export const fmt = (d?: string) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';

/* ── the question paper ────────────────────────────────────────────────── */

export function PaperView({ paper, studentName }: { paper: Paper; studentName?: string }) {
  const qs = questionsOf(paper);
  const sections = (Object.keys(SECTIONS) as SectionId[]).filter((s) => qs.some((q) => q.section === s));
  let n = 0;
  return (
    <article className="mx-auto max-w-3xl rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm sm:p-10 print:max-w-none print:border-0 print:p-0 print:shadow-none">
      <header className="border-b-2 border-foreground pb-4 text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{SCHOOL.name}</p>
        <h1 className="mt-1 text-xl font-bold">{paper.title}</h1>
        <p className="text-sm">{paper.subject} · Class {paper.className} · {SCHOOL.board} pattern</p>
        <div className="mt-3 flex justify-between text-sm font-medium">
          <span>Time: {paper.durationMins >= 60 ? `${paper.durationMins / 60} hour${paper.durationMins > 60 ? 's' : ''}` : `${paper.durationMins} min`}</span>
          <span>Maximum marks: {totalMarks(qs)}</span>
        </div>
        {studentName !== undefined && (
          <div className="mt-3 grid grid-cols-2 gap-4 text-left text-sm">
            <span>Name: <span className="inline-block min-w-32 border-b border-dotted border-foreground">{studentName}</span></span>
            <span>Roll no: <span className="inline-block min-w-16 border-b border-dotted border-foreground" /></span>
          </div>
        )}
      </header>

      <section className="mt-4 text-sm">
        <p className="font-semibold">General instructions</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-muted-foreground print:text-foreground">
          <li>All questions are compulsory. Write answers on separate sheets, numbering each answer clearly.</li>
          <li>Write your name and roll number on every page you upload.</li>
          <li>Show all steps — method marks are awarded.</li>
        </ol>
      </section>

      {sections.map((s) => (
        <section key={s} className="mt-6 break-inside-avoid-page">
          <h2 className="text-center font-semibold">{SECTIONS[s].title}</h2>
          <p className="mb-3 text-center text-xs italic text-muted-foreground print:text-foreground">{SECTIONS[s].note}</p>
          <ol className="space-y-3">
            {qs.filter((q) => q.section === s).map((q) => {
              n += 1;
              return (
                <li key={q.id} className="flex gap-3 text-sm break-inside-avoid">
                  <span className="w-6 shrink-0 font-medium">{n}.</span>
                  <div className="flex-1">
                    <p>{q.text}</p>
                    {q.options && (
                      <div className="mt-1.5 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 print:grid-cols-2">
                        {q.options.map((o, i) => <span key={i}>({String.fromCharCode(97 + i)}) {o}</span>)}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground print:text-foreground">[{q.marks}]</span>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
      <p className="mt-8 text-center text-xs text-muted-foreground">— End of question paper —</p>
    </article>
  );
}

/* ── charts ─────────────────────────────────────────────────────────────── */

const axis = { stroke: 'var(--color-muted-foreground)', fontSize: 12 };
const tip = {
  contentStyle: {
    background: 'var(--color-popover)', border: '1px solid var(--color-border)',
    borderRadius: 8, fontSize: 12, color: 'var(--color-popover-foreground)',
  },
};

export function ScoreTrend({ data }: { data: { name: string; score: number; classAvg?: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={axis} tickLine={false} axisLine={false} unit="%" />
        <Tooltip {...tip} formatter={(v: number) => `${v}%`} />
        <Line type="monotone" dataKey="score" name="Score" stroke="var(--color-chart1)" strokeWidth={2.5} dot={{ r: 4 }} />
        {data.some((d) => d.classAvg !== undefined) && (
          <Line type="monotone" dataKey="classAvg" name="Class average" stroke="var(--color-chart2)" strokeWidth={2} strokeDasharray="5 4" dot={false} />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ChapterBars({ data }: { data: { chapter: string; pct: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 30)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={axis} tickLine={false} axisLine={false} unit="%" />
        <YAxis type="category" dataKey="chapter" width={150} tick={axis} tickLine={false} axisLine={false} />
        <Tooltip {...tip} formatter={(v: number) => `${v}%`} cursor={{ fill: 'var(--color-accent)' }} />
        <Bar dataKey="pct" name="Mastery" fill="var(--color-chart1)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── one student's progress, used by the teacher and parent views ───────── */

export function useStudentProgress(studentId: string) {
  const { submissions, papers } = useDemo();
  const done = submissions
    .filter((s) => s.studentId === studentId && s.status === 'evaluated')
    .map((s) => ({ s, paper: papers.find((p) => p.id === s.paperId)! }))
    .filter((x) => x.paper)
    .sort((a, b) => (a.s.submittedAt ?? '').localeCompare(b.s.submittedAt ?? ''));

  const trend = done.map(({ s, paper }) => {
    const peers = submissions.filter((x) => x.paperId === paper.id && x.status === 'evaluated');
    const classAvg = Math.round(peers.reduce((n, x) => n + pct(x), 0) / (peers.length || 1));
    return { name: paper.title.split(' — ')[0], score: pct(s), classAvg };
  });

  const chapters = weakChapters(done.flatMap((x) => x.s.results ?? []));
  const avg = done.length ? Math.round(done.reduce((n, x) => n + pct(x.s), 0) / done.length) : 0;
  const pending = submissions.filter((s) => s.studentId === studentId && s.status !== 'evaluated');
  return { done, trend, chapters, avg, pending };
}

export function StudentReport({ studentId, resultBase }: { studentId: string; resultBase: string }) {
  const { done, trend, chapters } = useStudentProgress(studentId);
  const st = studentById(studentId);
  const weak = chapters.filter((c) => c.pct < 60).slice(0, 3);
  const strong = [...chapters].reverse().filter((c) => c.pct >= 75).slice(0, 3);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Score trend vs class average</CardTitle></CardHeader>
        <CardContent>{trend.length ? <ScoreTrend data={trend} /> : <p className="text-sm text-muted-foreground">No evaluated tests yet.</p>}</CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Chapter mastery</CardTitle></CardHeader>
        <CardContent><ChapterBars data={chapters} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">What to work on</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="mb-1.5 font-medium">Needs attention</p>
            <div className="flex flex-wrap gap-1.5">
              {weak.length ? weak.map((c) => <Badge key={c.chapter} variant="destructive">{c.chapter} · {c.pct}%</Badge>) : <span className="text-muted-foreground">Nothing below 60% — great.</span>}
            </div>
          </div>
          <div>
            <p className="mb-1.5 font-medium">Strengths</p>
            <div className="flex flex-wrap gap-1.5">
              {strong.length ? strong.map((c) => <Badge key={c.chapter} variant="secondary">{c.chapter} · {c.pct}%</Badge>) : <span className="text-muted-foreground">Keep going — strengths appear after a few tests.</span>}
            </div>
          </div>
          <p className="rounded-lg bg-muted p-3 text-muted-foreground">
            <span className="font-medium text-foreground">AI suggestion: </span>
            {weak.length
              ? `${st.name.split(' ')[0]} should revise ${weak.map((w) => w.chapter).join(', ')} and attempt a short practice paper on ${weak.length > 1 ? 'these chapters' : 'this chapter'} this week.`
              : `${st.name.split(' ')[0]} is on track. A full board-pattern paper would be a good next step.`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Test history</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {[...done].reverse().map(({ s, paper }) => (
              <li key={s.id}>
                <Link to={`${resultBase}/${s.id}`} className="flex items-center gap-3 px-6 py-3 text-sm hover:bg-accent/40">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{paper.title}</span>
                    <span className="text-xs text-muted-foreground">Submitted {fmt(s.submittedAt)}</span>
                  </span>
                  <StatusBadge s={s} />
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
