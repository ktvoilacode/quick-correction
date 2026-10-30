/**
 * Students — `/teacher/students`. The class list and the invite code each
 * parent uses to link their child.
 */
import * as React from 'react';
import {
  Button, Input, Textarea, FormField, Badge, Alert, AlertDescription, toast, useConfirm,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@bloomneo/uikit';
import { Plus, Copy, Loader2, AlertTriangle, Users, Check, Pencil, Trash2, Search, ListPlus } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { api } from '@/shared/api';
import { useLoad } from '../../lib/useLoad';
import type { Student } from '../../lib/types';

export default function StudentsPage() {
  const { data, error, loading, reload } = useLoad(async () => (await api.get<{ students: Student[] }>('/api/tutor/students')).students);
  const confirm = useConfirm();
  const [adding, setAdding] = React.useState(false);
  const [bulk, setBulk] = React.useState(false);
  const [bulkText, setBulkText] = React.useState('');
  const [editing, setEditing] = React.useState<Student | null>(null);
  const [cls, setCls] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [name, setName] = React.useState('');
  const [className, setClassName] = React.useState('10');
  const [saving, setSaving] = React.useState(false);
  const [copied, setCopied] = React.useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await api.post('/api/tutor/students', { name: name.trim(), className: className.trim() || '10' });
      toast.success(`${name.trim()} added`);
      setName(''); setAdding(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add the student.');
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || saving) return;
    setSaving(true);
    try {
      await api.patch(`/api/tutor/students/${editing.id}`, { name: editing.name, className: editing.className });
      setEditing(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save.');
    } finally { setSaving(false); }
  }

  async function remove(s: Student) {
    const ok = await confirm({ title: `Remove ${s.name}?`, description: 'Their papers and marks are deleted too. The parent loses access.', confirmLabel: 'Remove', tone: 'destructive' });
    if (!ok) return;
    try { await api.delete(`/api/tutor/students/${s.id}`); await reload(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not remove.'); }
  }

  async function addMany(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const r = await api.post<{ added: number }>('/api/tutor/students/import', { text: bulkText, className: cls === 'all' ? '10' : cls });
      toast.success(`${r.added} student${r.added === 1 ? '' : 's'} added`);
      setBulkText(''); setBulk(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add them.');
    } finally { setSaving(false); }
  }

  const classes = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const s of data ?? []) m.set(s.className, (m.get(s.className) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  }, [data]);
  const shown = (data ?? []).filter((s) => (cls === 'all' || s.className === cls) && s.name.toLowerCase().includes(q.trim().toLowerCase()));

  function copy(code: string) {
    void navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied((c) => (c === code ? null : c)), 1500);
  }

  return (
    <>
      <SEO title="Students" />
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Students</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulk(true)}><ListPlus className="size-4" /> Add several</Button>
          <Button onClick={() => setAdding(true)}><Plus className="size-4" /> Add student</Button>
        </div>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">Give each parent their child's invite code. They enter it after signing up to see the child's papers.</p>

      {loading ? (
        <div className="grid place-items-center py-16"><Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading" /></div>
      ) : error || !data ? (
        <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <Users className="size-8" aria-hidden />
          <p>No students yet.</p>
        </div>
      ) : (
        <>
        <div className="mb-3 space-y-2">
          {classes.length > 1 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Class">
              <Button size="sm" variant={cls === 'all' ? 'default' : 'outline'} onClick={() => setCls('all')}>All <span className="ml-1.5 opacity-70">{data.length}</span></Button>
              {classes.map(([c, n]) => <Button key={c} size="sm" variant={cls === c ? 'default' : 'outline'} onClick={() => setCls(c)}>Class {c} <span className="ml-1.5 opacity-70">{n}</span></Button>)}
            </div>
          )}
          {data.length > 6 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input className="pl-9" placeholder="Search by name" aria-label="Search students" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          )}
        </div>
        {shown.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No one matches.</p>}
        <ul className="divide-y divide-border rounded-xl border border-border">
          {shown.map((s) => (
            <li key={s.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{s.name}</span>
                  <span className="text-xs text-muted-foreground">Class {s.className}{s.average !== null ? ` · average ${s.average}%` : ''}{s.pending ? ` · ${s.pending} waiting` : ''}</span>
                </span>
                <span className="-mr-2 -mt-1 flex shrink-0">
                  <Button variant="ghost" size="icon" aria-label={`Edit ${s.name}`} onClick={() => setEditing(s)}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Remove ${s.name}`} onClick={() => remove(s)}><Trash2 className="size-4 text-destructive" /></Button>
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={s.parentLinked ? 'secondary' : 'outline'}>{s.parentLinked ? 'Parent linked' : 'No parent yet'}</Badge>
                <Button variant="outline" size="sm" className="font-mono" onClick={() => copy(s.inviteCode)} aria-label={`Copy invite code for ${s.name}`}>
                  {copied === s.inviteCode ? <Check className="size-4" /> : <Copy className="size-4" />} {s.inviteCode}
                </Button>
              </div>
            </li>
          ))}
        </ul>
        </>
      )}

      <Dialog open={bulk} onOpenChange={(o) => !o && setBulk(false)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={addMany}>
            <DialogHeader>
              <DialogTitle>Add several students</DialogTitle>
              <DialogDescription>One per line. Add a class after a comma, like <span className="font-mono">Asha, 10-A</span>. Without one they go in {cls === 'all' ? 'class 10' : `class ${cls}`}.</DialogDescription>
            </DialogHeader>
            <div className="py-4"><Textarea rows={8} autoFocus value={bulkText} onChange={(e) => setBulkText(e.target.value)} aria-label="Student names" /></div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setBulk(false)}>Cancel</Button>
              <Button type="submit" disabled={!bulkText.trim() || saving}>{saving && <Loader2 className="size-4 animate-spin" />} Add them</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-sm">
          {editing && (
            <form onSubmit={saveEdit}>
              <DialogHeader><DialogTitle>Edit student</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <FormField label="Name" required><Input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></FormField>
                <FormField label="Class"><Input value={editing.className} onChange={(e) => setEditing({ ...editing, className: e.target.value })} /></FormField>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                <Button type="submit" disabled={!editing.name.trim() || saving}>{saving && <Loader2 className="size-4 animate-spin" />} Save</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={adding} onOpenChange={(o) => !o && setAdding(false)}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={add}>
            <DialogHeader>
              <DialogTitle>Add a student</DialogTitle>
              <DialogDescription>An invite code is made for their parent.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField label="Name" required><Input autoFocus required value={name} onChange={(e) => setName(e.target.value)} /></FormField>
              <FormField label="Class"><Input value={className} onChange={(e) => setClassName(e.target.value)} /></FormField>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
              <Button type="submit" disabled={!name.trim() || saving}>{saving && <Loader2 className="size-4 animate-spin" />} Add student</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
