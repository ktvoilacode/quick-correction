/**
 * Question bank — `/admin/questions`.
 *
 * Every question is tagged to a topic of the categories, with a type,
 * complexity and marks. The paper generator fills a pattern's sections from
 * here. Data comes from `/api/questions`; topics from `/api/library`.
 */
import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Button, Input, Textarea, FormField, Badge,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Alert, AlertDescription, AlertTitle, toast, useConfirm,
} from '@bloomneo/uikit';
import { Plus, Pencil, Trash2, Eye, EyeOff, Search, Loader2, AlertTriangle, FileQuestion, ChevronLeft, ChevronRight, Check, X, Sparkles } from 'lucide-react';
import { api } from '@/shared/api';
import { MathText } from '@/shared/MathText';
import { PanelTop } from './PanelTop';
import { PageLoading } from '../PageLoading';

type QType = 'mcq' | 'short' | 'long' | 'case';
type Complexity = 'easy' | 'medium' | 'hard';
type Review = 'draft' | 'approved' | 'rejected' | 'flagged';
type Question = {
  id: string; topicId: string; topicPath: string[]; type: QType; complexity: Complexity; marks: number;
  text: string; options: string[] | null; answer: string | null; isActive: boolean; used?: boolean;
  source: 'seed' | 'ai' | 'manual'; reviewStatus: Review; reviewNote: string | null;
};
type Counts = Record<Review, number>;
type LibNode = { id: string; kind: string; name: string; children: LibNode[] };
type Choice = { id: string; label: string; chapterId: string };

const TYPE_LABEL: Record<QType, string> = { mcq: 'Multiple choice', short: 'Short answer', long: 'Long answer', case: 'Case study' };
const REVIEW_TABS: { id: 'all' | Review; label: string }[] = [
  { id: 'draft', label: 'To review' }, { id: 'flagged', label: 'Flagged' }, { id: 'approved', label: 'Approved' }, { id: 'rejected', label: 'Rejected' }, { id: 'all', label: 'All' },
];
const COMPLEXITY_LABEL: Record<Complexity, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

/** Every topic with its "Class › Subject › Chapter › Topic" label, and every chapter. */
function flatten(nodes: LibNode[], trail: string[] = [], chapterId = ''): { topics: Choice[]; chapters: { id: string; label: string }[] } {
  const topics: Choice[] = [];
  const chapters: { id: string; label: string }[] = [];
  for (const n of nodes) {
    const here = n.kind === 'board' ? [] : [...trail, n.name];
    if (n.kind === 'chapter') chapters.push({ id: n.id, label: here.slice(-2).join(' › ') });
    if (n.kind === 'topic') topics.push({ id: n.id, label: here.slice(-3).join(' › '), chapterId });
    const sub = flatten(n.children, here, n.kind === 'chapter' ? n.id : chapterId);
    topics.push(...sub.topics);
    chapters.push(...sub.chapters);
  }
  return { topics, chapters };
}

type Form = { id: string | null; topicId: string; type: QType; complexity: Complexity; marks: string; text: string; options: string[]; answer: string };
const blank = (topicId = ''): Form => ({ id: null, topicId, type: 'short', complexity: 'medium', marks: '2', text: '', options: ['', '', '', ''], answer: '' });

export function QuestionsPanel() {
  const confirm = useConfirm();
  const [rows, setRows] = React.useState<Question[] | null>(null);
  const [total, setTotal] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(50);
  const [page, setPage] = React.useState(1);
  const [params] = useSearchParams();
  const [filters, setFilters] = React.useState({ q: '', chapterId: params.get('chapter') ?? 'all', type: 'all', complexity: 'all', status: 'all', topicId: params.get('topic') ?? '', review: ['draft', 'flagged', 'approved', 'rejected'].includes(params.get('review') ?? '') ? params.get('review')! : 'all' });
  const [counts, setCounts] = React.useState<Counts>({ draft: 0, approved: 0, rejected: 0, flagged: 0 });
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [reviewing, setReviewing] = React.useState(false);
  const [preview, setPreview] = React.useState<Question | null>(null);
  const [topics, setTopics] = React.useState<Choice[]>([]);
  const [chapters, setChapters] = React.useState<{ id: string; label: string }[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<Form | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    api.get<{ nodes: LibNode[] }>('/api/library').then((r) => {
      const f = flatten(r.nodes);
      setTopics(f.topics);
      setChapters(f.chapters);
    }).catch(() => { /* the list's own error covers a dead API */ });
  }, []);

  const load = React.useCallback(async () => {
    setLoadError(null);
    try {
      const query: Record<string, string> = { page: String(page) };
      if (filters.q.trim()) query.q = filters.q.trim();
      for (const k of ['type', 'complexity', 'status', 'review'] as const) if (filters[k] !== 'all') query[k] = filters[k];
      if (filters.topicId) query.topicId = filters.topicId;
      else if (filters.chapterId !== 'all') query.chapterId = filters.chapterId;
      const r = await api.get<{ questions: Question[]; total: number; pageSize: number; counts: Counts }>('/api/questions', { query });
      setRows(r.questions);
      setCounts(r.counts);
      setPicked(new Set());
      setTotal(r.total);
      setPageSize(r.pageSize);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load questions.');
    }
  }, [filters, page]);

  // Typing in the search box waits a beat; the selects load straight away.
  React.useEffect(() => {
    const t = setTimeout(() => void load(), filters.q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, filters.q]);

  async function review(ids: string[], status: 'approved' | 'rejected') {
    if (!ids.length || reviewing) return;
    setReviewing(true);
    try {
      const r = await api.post<{ updated: number }>('/api/questions/review', { ids, status });
      toast.success(`${r.updated} question${r.updated === 1 ? '' : 's'} ${status}`);
      setPreview(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the review.');
    } finally {
      setReviewing(false);
    }
  }

  const setFilter = (patch: Partial<typeof filters>) => { setPage(1); setFilters((f) => ({ ...f, ...patch })); };

  function edit(q: Question) {
    setFormError(null);
    setForm({ id: q.id, topicId: q.topicId, type: q.type, complexity: q.complexity, marks: String(q.marks), text: q.text, options: [...(q.options ?? []), '', '', '', ''].slice(0, Math.max(4, q.options?.length ?? 0)), answer: q.answer ?? '' });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form || saving) return;
    setSaving(true);
    setFormError(null);
    const body = {
      topicId: form.topicId, type: form.type, complexity: form.complexity, marks: Number(form.marks), text: form.text,
      options: form.type === 'mcq' ? form.options : null, answer: form.answer,
    };
    try {
      if (form.id) await api.patch(`/api/questions/${form.id}`, body);
      else await api.post('/api/questions', body);
      setForm(null);
      toast.success('Question saved');
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the question.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(q: Question) {
    try { await api.patch(`/api/questions/${q.id}`, { isActive: !q.isActive }); await load(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not update it.'); }
  }

  async function remove(q: Question) {
    const ok = await confirm({ title: 'Delete this question?', description: q.text.slice(0, 120), confirmLabel: 'Delete', tone: 'destructive' });
    if (!ok) return;
    try { await api.delete(`/api/questions/${q.id}`); await load(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not delete it.'); }
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <PanelTop
        description={`${total} question${total === 1 ? '' : 's'}, each tagged to a topic in Categories.`}
        actions={<Button onClick={() => { setFormError(null); setForm(blank(topics[0]?.id)); }} disabled={topics.length === 0}><Plus className="size-4" /> Add question</Button>}
      />

      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Review status">
        {REVIEW_TABS.map((t) => {
          const n = t.id === 'all' ? counts.draft + counts.approved + counts.rejected + counts.flagged : counts[t.id];
          const on = filters.review === t.id;
          return (
            <Button key={t.id} size="sm" variant={on ? 'default' : 'outline'} role="tab" aria-selected={on} onClick={() => setFilter({ review: t.id })}>
              {t.label} <span className="ml-1.5 opacity-70">{n}</span>
            </Button>
          );
        })}
      </div>

      {filters.topicId && (
        <p className="mb-3 flex items-center gap-2 text-sm">
          <Badge variant="secondary" className="gap-1 py-1">
            Topic: {topics.find((t) => t.id === filters.topicId)?.label.split(' › ').slice(-2).join(' › ') ?? 'selected topic'}
            <button type="button" aria-label="Clear the topic filter" className="ml-1 rounded hover:text-destructive" onClick={() => setFilter({ topicId: '' })}><X className="size-3" /></button>
          </Badge>
        </p>
      )}

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_12rem_10rem_9rem_9rem]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input className="pl-9" placeholder="Search question text" aria-label="Search question text" value={filters.q} onChange={(e) => setFilter({ q: e.target.value })} />
        </div>
        <Select value={filters.chapterId} onValueChange={(v) => setFilter({ chapterId: v })}>
          <SelectTrigger aria-label="Chapter"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All chapters</SelectItem>{chapters.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filters.type} onValueChange={(v) => setFilter({ type: v })}>
          <SelectTrigger aria-label="Type"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All types</SelectItem>{(Object.keys(TYPE_LABEL) as QType[]).map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filters.complexity} onValueChange={(v) => setFilter({ complexity: v })}>
          <SelectTrigger aria-label="Complexity"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Any complexity</SelectItem>{(Object.keys(COMPLEXITY_LABEL) as Complexity[]).map((c) => <SelectItem key={c} value={c}>{COMPLEXITY_LABEL[c]}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filters.status} onValueChange={(v) => setFilter({ status: v })}>
          <SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Any status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="hidden">Hidden</SelectItem></SelectContent>
        </Select>
      </div>

      {loadError ? (
        <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertTitle>Could not load questions</AlertTitle><AlertDescription>{loadError}</AlertDescription></Alert>
      ) : !rows ? (
        <PageLoading />
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <FileQuestion className="size-8" aria-hidden />
          <p>No questions match. Change the filters or add one.</p>
        </div>
      ) : (
        <>
          {picked.size > 0 && (
            <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm">
              <span>{picked.size} selected</span>
              <Button size="sm" disabled={reviewing} onClick={() => review([...picked], 'approved')}><Check className="size-4" /> Approve</Button>
              <Button size="sm" variant="outline" disabled={reviewing} onClick={() => review([...picked], 'rejected')}><X className="size-4" /> Reject</Button>
              <Button size="sm" variant="ghost" onClick={() => setPicked(new Set())}>Clear</Button>
            </div>
          )}
          <div className="rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <input type="checkbox" aria-label="Select all on this page" checked={rows.length > 0 && picked.size === rows.length}
                      onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} />
                  </TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead className="hidden lg:table-cell">Topic</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((q) => (
                  <TableRow key={q.id} className={q.isActive || q.reviewStatus === 'draft' || q.reviewStatus === 'flagged' ? '' : 'opacity-60'}>
                    <TableCell className="align-top">
                      <input type="checkbox" aria-label="Select question" checked={picked.has(q.id)}
                        onChange={(e) => setPicked((s) => { const n = new Set(s); e.target.checked ? n.add(q.id) : n.delete(q.id); return n; })} />
                    </TableCell>
                    <TableCell className="min-w-44 align-top">
                      <button type="button" className="text-left" onClick={() => setPreview(q)} aria-label="Open question">
                        <p className="line-clamp-2 whitespace-normal text-sm"><MathText text={q.text} /></p>
                      </button>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {q.source === 'ai' && <Badge variant="outline"><Sparkles className="mr-1 size-3" />AI</Badge>}
                        {q.reviewStatus === 'draft' && <Badge variant="secondary">To review</Badge>}
                        {q.reviewStatus === 'flagged' && <Badge variant="outline" className="text-destructive">Flagged</Badge>}
                        {q.reviewStatus === 'rejected' && <Badge variant="outline">Rejected</Badge>}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:hidden">
                        <Badge variant="outline">{TYPE_LABEL[q.type]}</Badge>
                        <Badge variant="secondary">{COMPLEXITY_LABEL[q.complexity]}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="hidden align-top text-sm text-muted-foreground lg:table-cell">{q.topicPath.slice(-2).join(' › ')}</TableCell>
                    <TableCell className="hidden align-top sm:table-cell">
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant="outline">{TYPE_LABEL[q.type]}</Badge>
                        <span className="text-xs text-muted-foreground">{COMPLEXITY_LABEL[q.complexity]}</span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">{q.marks}{!q.isActive && q.reviewStatus === 'approved' && <Badge variant="secondary" className="ml-2">Hidden</Badge>}</TableCell>
                    <TableCell className="whitespace-nowrap text-right align-top">
                      {(q.reviewStatus === 'draft' || q.reviewStatus === 'flagged') && (
                        <Button size="icon" variant="ghost" aria-label="Approve question" title="Approve — makes it live" disabled={reviewing} onClick={() => review([q.id], 'approved')}><Check className="size-4 text-success" /></Button>
                      )}
                      <Button variant="ghost" size="icon" aria-label="Edit question" title="Edit" onClick={() => edit(q)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" aria-label={q.isActive ? 'Hide question' : 'Show question'} title={q.isActive ? 'Hide from new papers' : 'Show in new papers'} onClick={() => toggle(q)}>
                        {q.isActive ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Delete question" title={q.used ? 'Used by a paper — hide it instead' : 'Delete'} disabled={q.used} onClick={() => remove(q)}><Trash2 className="size-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {pages > 1 && (
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>Page {page} of {pages}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="size-4" /></Button>
                <Button variant="outline" size="icon" aria-label="Next page" disabled={page >= pages} onClick={() => setPage(page + 1)}><ChevronRight className="size-4" /></Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={preview !== null} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle>{preview.topicPath.slice(-2).join(' › ')}</DialogTitle>
                <DialogDescription>
                  {TYPE_LABEL[preview.type]} · {COMPLEXITY_LABEL[preview.complexity]} · {preview.marks} mark{preview.marks === 1 ? '' : 's'}
                  {preview.source === 'ai' ? ' · written by AI' : ''}
                </DialogDescription>
              </DialogHeader>
              {preview.reviewNote && (
                <Alert className="border-destructive/40 bg-destructive/8"><AlertTriangle className="size-4 text-destructive" /><AlertTitle>Reviewer note</AlertTitle><AlertDescription>{preview.reviewNote}</AlertDescription></Alert>
              )}
              <div className="space-y-3 text-sm">
                <p className="whitespace-pre-wrap"><MathText text={preview.text} /></p>
                {preview.options && (
                  <ol className="list-[upper-alpha] space-y-1 pl-6">{preview.options.map((o, i) => <li key={i}><MathText text={String(o)} /></li>)}</ol>
                )}
                <div className="rounded-lg border border-border bg-muted p-3">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Answer</p>
                  <p className="whitespace-pre-wrap">{preview.answer ? <MathText text={preview.answer} /> : 'No answer recorded.'}</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => { const q = preview; setPreview(null); edit(q); }}><Pencil className="size-4" /> Edit</Button>
                <Button variant="outline" disabled={reviewing} onClick={() => review([preview.id], 'rejected')}><X className="size-4" /> Reject</Button>
                <Button disabled={reviewing || preview.reviewStatus === 'approved'} onClick={() => review([preview.id], 'approved')}><Check className="size-4" /> Approve</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {form && (
            <form onSubmit={save}>
              <DialogHeader>
                <DialogTitle>{form.id ? 'Edit question' : 'Add question'}</DialogTitle>
                <DialogDescription>Tag it to a topic so papers pick it up for that chapter.</DialogDescription>
              </DialogHeader>
              {formError && (
                <Alert className="my-4 border-destructive/40 bg-destructive/8"><AlertTriangle className="size-4 text-destructive" /><AlertDescription>{formError}</AlertDescription></Alert>
              )}
              <div className="grid gap-4 py-4 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <FormField label="Topic" required>
                    <Select value={form.topicId} onValueChange={(v) => setForm({ ...form, topicId: v })}>
                      <SelectTrigger><SelectValue placeholder="Pick a topic" /></SelectTrigger>
                      <SelectContent>{topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormField>
                </div>
                <FormField label="Type" required>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as QType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{(Object.keys(TYPE_LABEL) as QType[]).map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
                <FormField label="Complexity" required>
                  <Select value={form.complexity} onValueChange={(v) => setForm({ ...form, complexity: v as Complexity })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{(Object.keys(COMPLEXITY_LABEL) as Complexity[]).map((c) => <SelectItem key={c} value={c}>{COMPLEXITY_LABEL[c]}</SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
                <FormField label="Marks" required>
                  <Input required type="number" min={1} max={20} value={form.marks} onChange={(e) => setForm({ ...form, marks: e.target.value })} />
                </FormField>
                <div className="sm:col-span-3">
                  <FormField label="Question" required helper="Put maths between dollar signs, for example $x^2 - 3x - 10 = 0$ or $\frac{a}{b}$.">
                    <Textarea required rows={4} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
                  </FormField>
                  {form.text.includes('$') && (
                    <div className="mt-2 rounded-lg border border-border bg-muted/50 p-3 text-sm" aria-label="Preview">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
                      <p className="whitespace-pre-wrap"><MathText text={form.text} /></p>
                    </div>
                  )}
                </div>
                {form.type === 'mcq' && (
                  <div className="grid gap-2 sm:col-span-3 sm:grid-cols-2">
                    {form.options.map((o, i) => (
                      <Input key={i} aria-label={`Option ${i + 1}`} placeholder={`Option ${String.fromCharCode(65 + i)}`} value={o}
                        onChange={(e) => setForm({ ...form, options: form.options.map((x, j) => (j === i ? e.target.value : x)) })} />
                    ))}
                  </div>
                )}
                <div className="sm:col-span-3">
                  <FormField label="Answer / marking scheme" helper="Used when marking. Never shown to students or parents.">
                    <Textarea rows={3} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
                  </FormField>
                </div>
              </div>
              <DialogFooter className="mt-2">
                <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
                <Button type="submit" disabled={saving || !form.topicId || !form.text.trim()}>{saving && <Loader2 className="size-4 animate-spin" />} Save question</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
