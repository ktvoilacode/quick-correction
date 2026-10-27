/**
 * Paper patterns — `/admin/patterns`.
 *
 * How a paper is laid out for a subject in the skill library: sections, the
 * question type, how many questions and marks each. Data comes from
 * `/api/patterns`; subjects come from `/api/library`.
 */
import * as React from 'react';
import {
  Button, Input, FormField, Badge, Card, CardContent,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Alert, AlertDescription, AlertTitle, toast, useConfirm,
} from '@bloomneo/uikit';
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2, AlertTriangle, ClipboardList, X } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { api } from '@/shared/api';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { PageLoading } from '../../components/PageLoading';

type SectionType = 'mcq' | 'short' | 'long' | 'case';
type Section = { title: string; type: SectionType; count: number; marksEach: number; note: string };
type Pattern = {
  id: string; subjectId: string; subjectPath: string; name: string; description: string | null;
  durationMins: number; sections: Section[]; totalMarks: number; isActive: boolean;
};
type LibNode = { id: string; kind: string; name: string; children: LibNode[] };

const TYPE_LABEL: Record<SectionType, string> = { mcq: 'Multiple choice', short: 'Short answer', long: 'Long answer', case: 'Case study' };
const BLANK_SECTION: Section = { title: '', type: 'short', count: 5, marksEach: 2, note: '' };

/** Every subject in the library with its "Board › Class › Subject" label. */
function subjectsOf(nodes: LibNode[], trail: string[] = []): { id: string; label: string }[] {
  return nodes.flatMap((n) => {
    const here = [...trail, n.name];
    return n.kind === 'subject' ? [{ id: n.id, label: here.join(' › ') }] : subjectsOf(n.children, here);
  });
}

const sum = (sections: Section[]) => sections.reduce((n, s) => n + (Number(s.count) || 0) * (Number(s.marksEach) || 0), 0);
const questions = (sections: Section[]) => sections.reduce((n, s) => n + (Number(s.count) || 0), 0);

type Form = { id: string | null; subjectId: string; name: string; description: string; durationMins: string; sections: Section[] };
const blank = (subjectId = ''): Form => ({ id: null, subjectId, name: '', description: '', durationMins: '60', sections: [{ ...BLANK_SECTION, title: 'Section A' }] });

export default function AdminPatternsPage() {
  const confirm = useConfirm();
  const [patterns, setPatterns] = React.useState<Pattern[] | null>(null);
  const [subjects, setSubjects] = React.useState<{ id: string; label: string }[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<Form | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoadError(null);
    try {
      const [p, lib] = await Promise.all([
        api.get<{ patterns: Pattern[] }>('/api/patterns'),
        api.get<{ nodes: LibNode[] }>('/api/library'),
      ]);
      setPatterns(p.patterns);
      setSubjects(subjectsOf(lib.nodes));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load patterns.');
    }
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  function edit(p: Pattern) {
    setFormError(null);
    setForm({ id: p.id, subjectId: p.subjectId, name: p.name, description: p.description ?? '', durationMins: String(p.durationMins), sections: p.sections.map((s) => ({ ...s })) });
  }

  const setSection = (i: number, patch: Partial<Section>) =>
    setForm((f) => f && ({ ...f, sections: f.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form || saving) return;
    setFormError(null);
    setSaving(true);
    const body = {
      name: form.name, description: form.description, durationMins: Number(form.durationMins),
      sections: form.sections.map((s) => ({ ...s, count: Number(s.count), marksEach: Number(s.marksEach) })),
    };
    try {
      if (form.id) await api.patch(`/api/patterns/${form.id}`, body);
      else await api.post('/api/patterns', { ...body, subjectId: form.subjectId });
      setForm(null);
      toast.success('Pattern saved');
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the pattern.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(p: Pattern) {
    try { await api.patch(`/api/patterns/${p.id}`, { isActive: !p.isActive }); await load(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not update it.'); }
  }

  async function remove(p: Pattern) {
    const ok = await confirm({ title: `Delete "${p.name}"?`, description: 'Papers already made from it are not affected.', confirmLabel: 'Delete', tone: 'destructive' });
    if (!ok) return;
    try { await api.delete(`/api/patterns/${p.id}`); await load(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not delete it.'); }
  }

  return (
    <>
      <SEO title="Paper patterns" />
      <AdminPageHeader
        title="Paper patterns"
        description="Sections, question types and marks for each subject in the skill library."
        actions={
          <Button onClick={() => { setFormError(null); setForm(blank(subjects[0]?.id)); }} disabled={subjects.length === 0}>
            <Plus className="size-4" /> Add pattern
          </Button>
        }
      />

      {loadError ? (
        <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertTitle>Could not load patterns</AlertTitle><AlertDescription>{loadError}</AlertDescription></Alert>
      ) : !patterns ? (
        <PageLoading />
      ) : patterns.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <ClipboardList className="size-8" aria-hidden />
          <p>{subjects.length ? 'No patterns yet. Add one for a subject.' : 'Add a subject in the Skill library first, then come back to add a pattern.'}</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {patterns.map((p) => (
            <Card key={p.id} className={p.isActive ? '' : 'opacity-70'}>
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold">
                      {p.name} {!p.isActive && <Badge variant="secondary">Hidden</Badge>}
                    </h2>
                    <p className="truncate text-sm text-muted-foreground">{p.subjectPath}</p>
                  </div>
                  <Button variant="ghost" size="icon" aria-label={`Edit ${p.name}`} title="Edit" onClick={() => edit(p)}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label={p.isActive ? `Hide ${p.name}` : `Show ${p.name}`} title={p.isActive ? 'Hide from teachers' : 'Show to teachers'} onClick={() => toggle(p)}>
                    {p.isActive ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${p.name}`} title="Delete" onClick={() => remove(p)}><Trash2 className="size-4 text-destructive" /></Button>
                </div>
                {p.description && <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
                <p className="mt-3 text-sm"><strong>{p.totalMarks}</strong> marks · <strong>{questions(p.sections)}</strong> questions · <strong>{p.durationMins}</strong> min</p>
                <ul className="mt-2 divide-y divide-border rounded-lg border border-border text-sm">
                  {p.sections.map((s, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 px-3 py-1.5">
                      <span className="min-w-0 truncate">{s.title} <span className="text-muted-foreground">· {TYPE_LABEL[s.type]}</span></span>
                      <span className="shrink-0 text-muted-foreground">{s.count} × {s.marksEach}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {form && (
            <form onSubmit={save}>
              <DialogHeader>
                <DialogTitle>{form.id ? 'Edit pattern' : 'Add pattern'}</DialogTitle>
                <DialogDescription>Set the sections; the total marks add up as you go.</DialogDescription>
              </DialogHeader>

              {formError && (
                <Alert className="my-4 border-destructive/40 bg-destructive/8">
                  <AlertTriangle className="size-4 text-destructive" />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 py-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FormField label="Subject" required helper={form.id ? 'A pattern stays with its subject.' : undefined}>
                    <Select value={form.subjectId} onValueChange={(v) => setForm({ ...form, subjectId: v })} disabled={!!form.id}>
                      <SelectTrigger><SelectValue placeholder="Pick a subject" /></SelectTrigger>
                      <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormField>
                </div>
                <FormField label="Name" required>
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Board paper" />
                </FormField>
                <FormField label="Duration (minutes)" required>
                  <Input required type="number" min={5} max={600} value={form.durationMins} onChange={(e) => setForm({ ...form, durationMins: e.target.value })} />
                </FormField>
                <div className="sm:col-span-2">
                  <FormField label="Description">
                    <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </FormField>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Sections</h3>
                  <span className="text-sm text-muted-foreground"><strong>{sum(form.sections)}</strong> marks · {questions(form.sections)} questions</span>
                </div>
                {form.sections.map((s, i) => (
                  <div key={i} className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_9rem_5rem_5rem_auto]">
                    <div className="col-span-2 sm:col-span-1"><Input required aria-label="Section title" placeholder="Section A" value={s.title} onChange={(e) => setSection(i, { title: e.target.value })} /></div>
                    <div className="col-span-2 sm:col-span-1">
                      <Select value={s.type} onValueChange={(v) => setSection(i, { type: v as SectionType })}>
                        <SelectTrigger aria-label="Question type"><SelectValue /></SelectTrigger>
                        <SelectContent>{(Object.keys(TYPE_LABEL) as SectionType[]).map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Input required type="number" min={1} max={100} aria-label="Number of questions" title="Questions" value={s.count} onChange={(e) => setSection(i, { count: e.target.value as unknown as number })} />
                    <Input required type="number" min={1} max={20} aria-label="Marks each" title="Marks each" value={s.marksEach} onChange={(e) => setSection(i, { marksEach: e.target.value as unknown as number })} />
                    <Button type="button" variant="ghost" size="icon" className="justify-self-end" aria-label={`Remove ${s.title || 'section'}`} disabled={form.sections.length === 1}
                      onClick={() => setForm({ ...form, sections: form.sections.filter((_, j) => j !== i) })}><X className="size-4" /></Button>
                    <div className="col-span-2 sm:col-span-5"><Input aria-label="Instruction for students" placeholder="Instruction shown on the paper (optional)" value={s.note} onChange={(e) => setSection(i, { note: e.target.value })} /></div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Per section: questions, then marks each.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, sections: [...form.sections, { ...BLANK_SECTION, title: `Section ${String.fromCharCode(65 + form.sections.length)}` }] })}>
                  <Plus className="size-4" /> Add section
                </Button>
              </div>

              <DialogFooter className="mt-4">
                <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
                <Button type="submit" disabled={saving || !form.subjectId}>{saving && <Loader2 className="size-4 animate-spin" />} Save pattern</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
