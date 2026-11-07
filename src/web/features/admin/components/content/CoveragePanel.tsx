/**
 * Coverage: what the question bank should hold against what it does, by chapter,
 * topic and question pattern, at each difficulty. A pattern is one kind of
 * question in one paper slot, with the years the board asked it.
 */
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription, Badge } from '@bloomneo/uikit';
import { AlertTriangle, ChevronDown, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { api } from '@/shared/api';
import { useLoad } from '@/shared/useLoad';
import { MathText } from '@/shared/MathText';
import { PanelTop } from './PanelTop';
import { PageLoading } from '../PageLoading';

type Levels = { easy: number; medium: number; hard: number };
type Pattern = { id: string; slot: string; pattern: string; sample: string; needsFigure: boolean; seenIn: string[]; target: Levels; have: Levels; gap: Levels };
type Topic = { id: string; name: string; scope: string; target: Levels; have: Levels; gap: Levels; figures: number; lastAsked: number | null; patterns: Pattern[] };
type Chapter = { id: string; name: string; target: Levels; have: Levels; gap: Levels; topics: Topic[] };
type Coverage = { chapters: Chapter[]; totals: { target: Levels; have: Levels; gap: Levels } };

const SLOT: Record<string, string> = { 'A-MCQ': 'MCQ · 1', 'A-AR': 'Assertion-reason · 1', B: 'Short · 2', C: 'Short · 3', D: 'Long · 5', E: 'Case · 4' };
const sum = (l: Levels) => l.easy + l.medium + l.hard;
const trio = (l: Levels) => `${l.easy} / ${l.medium} / ${l.hard}`;
const filled = (target: Levels, gap: Levels) => (sum(target) ? Math.round(((sum(target) - sum(gap)) / sum(target)) * 100) : 100);

function Bar({ pct }: { pct: number }) {
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={`${pct}% filled`}>
      <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </span>
  );
}

export function CoveragePanel() {
  const { data, error, loading } = useLoad(() => api.get<Coverage>('/api/questions/coverage'));
  const [open, setOpen] = React.useState<Set<string>>(new Set());
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (loading) return <PageLoading />;
  if (error || !data) return <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertDescription>{error ?? 'Could not load coverage.'}</AlertDescription></Alert>;
  const { totals } = data;

  return (
    <>
      <PanelTop description="What the bank should hold, what it holds, and what's still needed. Difficulty reads easy / medium / hard." />

      <section aria-label="Totals" className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Target</p><p className="text-2xl font-semibold tabular-nums">{sum(totals.target)}</p><p className="text-xs text-muted-foreground">{trio(totals.target)}</p></div>
        <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Still needed</p><p className="text-2xl font-semibold tabular-nums">{sum(totals.gap)}</p><p className="text-xs text-muted-foreground">{trio(totals.gap)}</p></div>
        <div className="col-span-2 rounded-xl border border-border bg-card p-3 sm:col-span-1"><p className="text-xs text-muted-foreground">Filled</p><p className="text-2xl font-semibold tabular-nums">{filled(totals.target, totals.gap)}%</p><Bar pct={filled(totals.target, totals.gap)} /></div>
      </section>

      <ul className="space-y-2">
        {data.chapters.map((c) => {
          const isOpen = open.has(c.id);
          return (
            <li key={c.id} className="rounded-xl border border-border bg-card">
              <button type="button" aria-expanded={isOpen} onClick={() => toggle(c.id)} className="flex w-full cursor-pointer items-center gap-3 p-3 text-left">
                {isOpen ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{c.name}</span>
                  <span className="mt-1 block max-w-xs"><Bar pct={filled(c.target, c.gap)} /></span>
                </span>
                <span className="shrink-0 text-right text-xs text-muted-foreground">
                  <span className="block text-sm font-medium text-foreground tabular-nums">{sum(c.gap)} needed</span>
                  of {sum(c.target)} · {trio(c.gap)}
                </span>
              </button>
              {isOpen && (
                <ul className="divide-y divide-border border-t border-border">
                  {c.topics.map((t) => {
                    const topicOpen = open.has(t.id);
                    return (
                      <li key={t.id}>
                        <button type="button" aria-expanded={topicOpen} onClick={() => toggle(t.id)} className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50">
                          {topicOpen ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
                          <span className="min-w-0 flex-1 text-sm">
                            {t.name}
                            {t.scope === 'verify' && <Badge variant="outline" className="ml-2">Check syllabus</Badge>}
                            <span className="block text-xs text-muted-foreground">{t.lastAsked ? `Last asked ${t.lastAsked}` : 'Not seen on the board'}{t.figures ? ` · ${t.figures} need a figure` : ''}</span>
                          </span>
                          <span className="shrink-0 text-right text-xs tabular-nums text-muted-foreground"><span className="block text-foreground">{sum(t.gap)} needed</span>{trio(t.gap)}</span>
                        </button>
                        {topicOpen && (
                          <div className="px-3 pb-3">
                            <p className="mb-2 text-right text-xs"><Link className="text-primary hover:underline" to={`/admin/content?tab=questions&topic=${t.id}`}>See this topic's questions</Link></p>
                            <ul className="space-y-2">
                              {t.patterns.map((p) => (
                                <li key={p.id} className="rounded-lg bg-muted/50 p-3 text-sm">
                                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                    <Badge variant="outline">{SLOT[p.slot] ?? p.slot}</Badge>
                                    {p.needsFigure && <Badge variant="secondary" className="gap-1"><ImageIcon className="size-3" />Figure</Badge>}
                                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">Have {trio(p.have)} of {trio(p.target)}</span>
                                  </div>
                                  <p className="break-words font-medium"><MathText text={p.pattern} /></p>
                                  <p className="mt-1 break-words text-xs text-muted-foreground">Example: <MathText text={p.sample} /></p>
                                  <p className="mt-1 text-xs text-muted-foreground">{p.seenIn.length ? `Asked: ${p.seenIn.join(', ')}` : 'Not seen on the board'}</p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
