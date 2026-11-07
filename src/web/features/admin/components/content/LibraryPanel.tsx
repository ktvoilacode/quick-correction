/**
 * Categories — `/admin/library`.
 *
 * The curriculum papers are built from: board > class > subject > chapter >
 * topic. The admin adds, renames, hides and removes nodes; teachers will pick
 * from what is here. Data comes from `/api/library`.
 */
import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  Button, Input, FormField, Badge, Card, CardContent, Alert, AlertTitle, AlertDescription, toast, useConfirm,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@bloomneo/uikit';
import { Plus, ChevronRight, Pencil, Trash2, Eye, EyeOff, Check, X, Loader2, AlertTriangle, BookOpen } from 'lucide-react';
import { api } from '@/shared/api';
import { PanelTop } from './PanelTop';
import { PageLoading } from '../PageLoading';

const KINDS = ['board', 'class', 'subject', 'chapter', 'topic'] as const;
type Kind = (typeof KINDS)[number];
const LABEL: Record<Kind, string> = { board: 'Board', class: 'Class', subject: 'Subject', chapter: 'Chapter', topic: 'Topic' };

type QType = 'mcq' | 'short' | 'long' | 'case';
type Complexity = 'easy' | 'medium' | 'hard';
const QTYPES: { id: QType; label: string }[] = [
  { id: 'mcq', label: 'Multiple choice' }, { id: 'short', label: 'Short answer' },
  { id: 'long', label: 'Long answer' }, { id: 'case', label: 'Case study' },
];
const COMPLEXITIES: { id: Complexity; label: string }[] = [
  { id: 'easy', label: 'Easy' }, { id: 'medium', label: 'Medium' }, { id: 'hard', label: 'Hard' },
];

type NodeT = {
  id: string; kind: Kind; name: string; parentId: string | null; isActive: boolean; children: NodeT[];
  questionTypes: QType[] | null; complexity: Complexity | null; marks: number | null;
  /** Questions under this node (all topics beneath it). */
  questionCount: number;
};

type TopicForm = { id: string | null; parentId: string; name: string; types: QType[]; complexity: Complexity | ''; marks: string };

function count(nodes: NodeT[], kind: Kind): number {
  return nodes.reduce((n, x) => n + (x.kind === kind ? 1 : 0) + count(x.children, kind), 0);
}

const tally = (nodes: NodeT[], kind: Kind, one: string, many: string) => {
  const n = count(nodes, kind);
  return `${n} ${n === 1 ? one : many}`;
};

/** One line to type a name into: used for adding and renaming. */
function NameInput({ initial = '', placeholder, onSave, onCancel }: {
  initial?: string; placeholder: string; onSave: (name: string) => Promise<void>; onCancel: () => void;
}) {
  const [value, setValue] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || busy) return;
    setBusy(true);
    try { await onSave(value.trim()); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="flex items-center gap-1.5">
      <Input autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()} className="h-8 min-w-0 flex-1" aria-label={placeholder} />
      <Button type="submit" size="icon" className="size-8 shrink-0" aria-label="Save" disabled={busy || !value.trim()}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
      </Button>
      <Button type="button" size="icon" variant="ghost" className="size-8 shrink-0" aria-label="Cancel" onClick={onCancel}><X className="size-4" /></Button>
    </form>
  );
}

export function LibraryPanel() {
  const confirm = useConfirm();
  const [nodes, setNodes] = React.useState<NodeT[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState<Set<string>>(new Set());
  // Which row is being edited ("rename:<id>"), or where a child is being added ("add:<parentId|root>").
  const [editing, setEditing] = React.useState<string | null>(null);
  // Topics carry extra fields, so they are added and edited in a dialog rather than inline.
  const [topic, setTopic] = React.useState<TopicForm | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [topicError, setTopicError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoadError(null);
    try {
      setNodes((await api.get<{ nodes: NodeT[] }>('/api/library')).nodes);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load the library.');
    }
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function run(fn: () => Promise<unknown>, failed: string) {
    try { await fn(); await load(); } catch (err) { toast.error(err instanceof Error ? err.message : failed); throw err; }
  }

  const add = (kind: Kind, parentId: string | null) => async (name: string) => {
    await run(() => api.post('/api/library', { kind, name, parentId }), 'Could not add it.');
    if (parentId) setOpen((s) => new Set(s).add(parentId));
    setEditing(null);
  };
  const openTopic = (t: NodeT | null, parentId: string) => {
    setTopicError(null);
    setTopic(t
      ? { id: t.id, parentId, name: t.name, types: t.questionTypes ?? [], complexity: t.complexity ?? '', marks: t.marks ? String(t.marks) : '' }
      : { id: null, parentId, name: '', types: [], complexity: '', marks: '' });
  };

  async function saveTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!topic || saving) return;
    setSaving(true);
    setTopicError(null);
    const fields = {
      name: topic.name,
      questionTypes: topic.types.length ? topic.types : null,
      complexity: topic.complexity || null,
      marks: topic.marks ? Number(topic.marks) : null,
    };
    try {
      if (topic.id) await api.patch(`/api/library/${topic.id}`, fields);
      else await api.post('/api/library', { kind: 'topic', parentId: topic.parentId, ...fields });
      setOpen((o) => new Set(o).add(topic.parentId));
      setTopic(null);
      await load();
    } catch (err) {
      setTopicError(err instanceof Error ? err.message : 'Could not save the topic.');
    } finally {
      setSaving(false);
    }
  }

  const rename = (n: NodeT) => async (name: string) => {
    await run(() => api.patch(`/api/library/${n.id}`, { name }), 'Could not rename it.');
    setEditing(null);
  };
  const setActive = (n: NodeT) => run(() => api.patch(`/api/library/${n.id}`, { isActive: !n.isActive }), 'Could not update it.').catch(() => {});
  async function remove(n: NodeT) {
    const inside = n.children.length;
    const ok = await confirm({
      title: `Delete ${LABEL[n.kind].toLowerCase()} "${n.name}"?`,
      description: inside ? `Everything under it (${inside} item${inside > 1 ? 's' : ''} and what they contain) is deleted too. This cannot be undone.` : 'This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'destructive',
    });
    if (ok) await run(() => api.delete(`/api/library/${n.id}`), 'Could not delete it.').catch(() => {});
  }

  const renderRow = (n: NodeT, depth: number): React.ReactNode => {
    const next = KINDS[KINDS.indexOf(n.kind) + 1] as Kind | undefined;
    const expanded = open.has(n.id);
    const renaming = editing === `rename:${n.id}`;
    return (
      <li key={n.id}>
        <div className="group flex items-center gap-1 rounded-md py-1 pr-1 hover:bg-muted/50" style={{ paddingLeft: depth * 20 + 4 }}>
          {next ? (
            <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label={expanded ? 'Collapse' : 'Expand'} aria-expanded={expanded} onClick={() => toggle(n.id)}>
              <ChevronRight className={`size-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </Button>
          ) : <span className="size-7 shrink-0" />}
          {renaming ? (
            <div className="flex-1"><NameInput initial={n.name} placeholder="Name" onSave={rename(n)} onCancel={() => setEditing(null)} /></div>
          ) : (
            <>
              <span className="min-w-0 flex-1">
                <span className={`line-clamp-2 block break-words leading-tight ${n.isActive ? '' : 'text-muted-foreground line-through'}`}>{n.name}</span>
                {(n.kind === 'chapter' || n.kind === 'topic') && (
                  <Link to={`/admin/content?tab=questions&${n.kind}=${n.id}`} className="block w-fit text-xs leading-tight text-muted-foreground hover:text-primary hover:underline" aria-label={`${n.questionCount} questions in ${n.name}`}>
                    {n.questionCount} {n.questionCount === 1 ? 'question' : 'questions'}
                  </Link>
                )}
              </span>
              {n.kind === 'topic' && (
                <span className="hidden shrink-0 items-center gap-1 md:flex">
                  {n.questionTypes?.map((t) => <Badge key={t} variant="outline">{QTYPES.find((q) => q.id === t)?.label}</Badge>)}
                  {n.complexity && <Badge variant="secondary">{COMPLEXITIES.find((c) => c.id === n.complexity)?.label}</Badge>}
                  {n.marks && <Badge variant="secondary">{n.marks} {n.marks === 1 ? 'mark' : 'marks'}</Badge>}
                </span>
              )}
              <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">{LABEL[n.kind]}</Badge>
              {!n.isActive && <Badge variant="secondary" className="shrink-0">Hidden</Badge>}
              <div className="flex shrink-0 items-center">
                {next && (
                  <Button variant="ghost" size="icon" className="size-8" aria-label={`Add ${LABEL[next].toLowerCase()} to ${n.name}`} title={`Add ${LABEL[next].toLowerCase()}`}
                    onClick={() => { if (next === 'topic') { openTopic(null, n.id); return; } setOpen((s) => new Set(s).add(n.id)); setEditing(`add:${n.id}`); }}>
                    <Plus className="size-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="size-8" aria-label={`Rename ${n.name}`} title={n.kind === 'topic' ? 'Edit topic' : 'Rename'} onClick={() => (n.kind === 'topic' ? openTopic(n, n.parentId!) : setEditing(`rename:${n.id}`))}><Pencil className="size-4" /></Button>
                <Button variant="ghost" size="icon" className="size-8" aria-label={n.isActive ? `Hide ${n.name}` : `Show ${n.name}`} title={n.isActive ? 'Hide from teachers' : 'Show to teachers'} onClick={() => setActive(n)}>
                  {n.isActive ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="size-8" aria-label={`Delete ${n.name}`} title="Delete" onClick={() => remove(n)}><Trash2 className="size-4 text-destructive" /></Button>
              </div>
            </>
          )}
        </div>
        {next && expanded && (
          <ul>
            {n.children.map((c) => renderRow(c, depth + 1))}
            {editing === `add:${n.id}` ? (
              <li style={{ paddingLeft: (depth + 1) * 20 + 36 }} className="py-1 pr-1">
                <NameInput placeholder={`New ${LABEL[next].toLowerCase()} name`} onSave={add(next, n.id)} onCancel={() => setEditing(null)} />
              </li>
            ) : n.children.length === 0 && (
              <li style={{ paddingLeft: (depth + 1) * 20 + 36 }} className="py-1 text-sm text-muted-foreground">
                No {LABEL[next].toLowerCase()}s yet — use + to add one.
              </li>
            )}
          </ul>
        )}
      </li>
    );
  };

  return (
    <>
      <PanelTop
        description="Board, class, subject, chapter and topic — the curriculum papers are built from."
        actions={<Button onClick={() => setEditing('add:root')}><Plus className="size-4" /> Add board</Button>}
      />
      {loadError ? (
        <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertTitle>Could not load the library</AlertTitle><AlertDescription>{loadError}</AlertDescription></Alert>
      ) : !nodes ? (
        <PageLoading />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {tally(nodes, 'board', 'board', 'boards')} · {tally(nodes, 'class', 'class', 'classes')} · {tally(nodes, 'subject', 'subject', 'subjects')} · {tally(nodes, 'chapter', 'chapter', 'chapters')} · {tally(nodes, 'topic', 'topic', 'topics')}
          </p>
          <Card>
            <CardContent className="p-2 sm:p-3">
              {nodes.length === 0 && editing !== 'add:root' && (
                <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                  <BookOpen className="size-8" aria-hidden />
                  <p>The library is empty. Add a board to start, for example CBSE.</p>
                </div>
              )}
              <ul>{nodes.map((n) => renderRow(n, 0))}</ul>
              {editing === 'add:root' && (
                <div className="px-1 py-1"><NameInput placeholder="New board name" onSave={add('board', null)} onCancel={() => setEditing(null)} /></div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={topic !== null} onOpenChange={(o) => !o && setTopic(null)}>
        <DialogContent className="sm:max-w-lg">
          {topic && (
            <form onSubmit={saveTopic}>
              <DialogHeader>
                <DialogTitle>{topic.id ? 'Edit topic' : 'Add topic'}</DialogTitle>
                <DialogDescription>How this topic is usually tested. Papers use it to pick questions.</DialogDescription>
              </DialogHeader>
              {topicError && (
                <Alert className="my-4 border-destructive/40 bg-destructive/8"><AlertTriangle className="size-4 text-destructive" /><AlertDescription>{topicError}</AlertDescription></Alert>
              )}
              <div className="grid gap-4 py-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FormField label="Topic name" required>
                    <Input required autoFocus value={topic.name} onChange={(e) => setTopic({ ...topic, name: e.target.value })} placeholder="Nature of roots" />
                  </FormField>
                </div>
                <div className="sm:col-span-2">
                  <FormField label="Question types">
                    <div className="flex flex-wrap gap-2">
                      {QTYPES.map((t) => {
                        const on = topic.types.includes(t.id);
                        return (
                          <Button key={t.id} type="button" size="sm" variant={on ? 'default' : 'outline'} aria-pressed={on}
                            onClick={() => setTopic({ ...topic, types: on ? topic.types.filter((x) => x !== t.id) : [...topic.types, t.id] })}>
                            {t.label}
                          </Button>
                        );
                      })}
                    </div>
                  </FormField>
                </div>
                <FormField label="Complexity">
                  <Select value={topic.complexity || 'none'} onValueChange={(v) => setTopic({ ...topic, complexity: v === 'none' ? '' : (v as Complexity) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not set</SelectItem>
                      {COMPLEXITIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Marks per question" helper="Usual marks for a question on this topic.">
                  <Input type="number" min={1} max={20} value={topic.marks} onChange={(e) => setTopic({ ...topic, marks: e.target.value })} />
                </FormField>
              </div>
              <DialogFooter className="mt-2">
                <Button type="button" variant="ghost" onClick={() => setTopic(null)}>Cancel</Button>
                <Button type="submit" disabled={saving || !topic.name.trim()}>{saving && <Loader2 className="size-4 animate-spin" />} Save topic</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
