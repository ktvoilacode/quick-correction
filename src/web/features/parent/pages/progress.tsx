/**
 * Progress — `/parent/progress`. How each child is doing: scores paper by
 * paper, and the chapters where marks were lost.
 */
import { Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@bloomneo/uikit';
import { Loader2, AlertTriangle, TrendingUp } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { api } from '@/shared/api';
import { useLoad, fmtDate } from '@/shared/useLoad';
import { pct, type Child, type SubRow, type SubDetail } from '../lib/types';

type Chapter = { name: string; got: number; max: number };

export default function ProgressPage() {
  const { data, error, loading } = useLoad(async () => {
    const [c, s] = await Promise.all([
      api.get<{ children: Child[] }>('/api/parent/children'),
      api.get<{ submissions: SubRow[] }>('/api/parent/submissions'),
    ]);
    const marked = s.submissions.filter((x) => x.status === 'evaluated');
    // Chapter strengths come from the question-wise marks, so each marked paper is read in full.
    const details = await Promise.all(marked.map(async (x) => (await api.get<{ submission: SubDetail }>(`/api/parent/submissions/${x.id}`)).submission));
    return { children: c.children, marked, details };
  });

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading" /></div>;
  if (error || !data) return <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>;

  return (
    <>
      <SEO title="Progress" />
      <h1 className="mb-6 text-2xl font-semibold">Progress</h1>
      {data.marked.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <TrendingUp className="size-8" aria-hidden />
          <p>Nothing marked yet. Once a paper comes back, the scores appear here.</p>
          <Link to="/parent/papers" className="text-sm text-primary hover:underline">See papers</Link>
        </div>
      ) : (
        <div className="space-y-8">
          {data.children.map((child) => {
            const mine = data.marked.filter((s) => s.student.id === child.id).sort((a, b) => (a.submittedAt ?? '').localeCompare(b.submittedAt ?? ''));
            if (!mine.length) return null;
            const avg = Math.round(mine.reduce((n, s) => n + pct(s), 0) / mine.length);
            const byChapter = new Map<string, Chapter>();
            for (const d of data.details.filter((x) => x.student.id === child.id)) {
              const q = new Map(d.questions.map((x) => [x.id, x]));
              for (const r of d.results ?? []) {
                const name = q.get(r.questionId)?.chapter;
                if (!name) continue;
                const c = byChapter.get(name) ?? { name, got: 0, max: 0 };
                c.got += r.awarded; c.max += r.max; byChapter.set(name, c);
              }
            }
            const chapters = [...byChapter.values()].filter((c) => c.max > 0).map((c) => ({ ...c, p: Math.round((c.got / c.max) * 100) })).sort((a, b) => a.p - b.p);
            const weak = chapters.filter((c) => c.p < 70).slice(0, 3);
            return (
              <section key={child.id}>
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="text-lg font-semibold">{child.name}</h2>
                  <p className="text-sm text-muted-foreground">Average <strong className="text-foreground">{avg}%</strong> over {mine.length} paper{mine.length === 1 ? '' : 's'}</p>
                </div>

                <ul className="mb-4 space-y-2" aria-label="Scores by paper">
                  {mine.map((s) => (
                    <li key={s.id}>
                      <Link to={`/parent/papers/${s.id}`} className="block rounded-lg border border-border px-4 py-2.5 hover:bg-muted/50">
                        <span className="flex items-center justify-between gap-3 text-sm"><span className="truncate font-medium">{s.paper.title}</span><span className="shrink-0 font-semibold">{pct(s)}%</span></span>
                        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${pct(s)}%` }} /></span>
                        <span className="mt-1 block text-xs text-muted-foreground">{s.score}/{s.max}{s.submittedAt ? ` · ${fmtDate(s.submittedAt)}` : ''}</span>
                      </Link>
                    </li>
                  ))}
                </ul>

                {chapters.length > 0 && (
                  <div className="rounded-xl border border-border p-4">
                    <h3 className="mb-2 text-sm font-medium">{weak.length ? `Work on ${weak.map((c) => c.name).join(', ')}` : 'Doing well in every chapter so far'}</h3>
                    <ul className="space-y-1.5 text-sm">
                      {chapters.map((c) => (
                        <li key={c.name} className="flex items-center gap-3">
                          <span className="w-40 shrink-0 truncate text-muted-foreground">{c.name}</span>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><span className={`block h-full rounded-full ${c.p < 50 ? 'bg-destructive' : c.p < 70 ? 'bg-amber-500' : 'bg-success'}`} style={{ width: `${c.p}%` }} /></span>
                          <span className="w-10 shrink-0 text-right tabular-nums">{c.p}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
