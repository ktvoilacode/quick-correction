/**
 * Students — `/teacher/students`. The class list and the invite code each
 * parent uses to link their child.
 */
import * as React from 'react';
import {
  Button, Input, FormField, Badge, Alert, AlertDescription, toast,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@bloomneo/uikit';
import { Plus, Copy, Loader2, AlertTriangle, Users, Check } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { api } from '@/shared/api';
import { useLoad } from '../../lib/useLoad';
import type { Student } from '../../lib/types';

export default function StudentsPage() {
  const { data, error, loading, reload } = useLoad(async () => (await api.get<{ students: Student[] }>('/api/tutor/students')).students);
  const [adding, setAdding] = React.useState(false);
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

  function copy(code: string) {
    void navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied((c) => (c === code ? null : c)), 1500);
  }

  return (
    <>
      <SEO title="Students" />
      <div className="mb-2 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Students</h1>
        <Button onClick={() => setAdding(true)}><Plus className="size-4" /> Add student</Button>
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
        <ul className="divide-y divide-border rounded-xl border border-border">
          {data.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{s.name}</span>
                <span className="text-xs text-muted-foreground">Class {s.className}{s.average !== null ? ` · average ${s.average}%` : ''}{s.pending ? ` · ${s.pending} waiting` : ''}</span>
              </span>
              <Badge variant={s.parentLinked ? 'secondary' : 'outline'}>{s.parentLinked ? 'Parent linked' : 'No parent yet'}</Badge>
              <Button variant="outline" size="sm" className="font-mono" onClick={() => copy(s.inviteCode)} aria-label={`Copy invite code for ${s.name}`}>
                {copied === s.inviteCode ? <Check className="size-4" /> : <Copy className="size-4" />} {s.inviteCode}
              </Button>
            </li>
          ))}
        </ul>
      )}

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
