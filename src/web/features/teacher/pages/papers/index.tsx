/**
 * Papers — `/teacher/papers`. Everything this teacher has made.
 */
import { Link } from 'react-router-dom';
import { Button, Badge, Alert, AlertDescription, toast, useConfirm } from '@bloomneo/uikit';
import { Plus, Trash2, Loader2, AlertTriangle, ChevronRight, FileText } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { api } from '@/shared/api';
import { useLoad, fmtDate } from '../../lib/useLoad';
import type { PaperRow } from '../../lib/types';

export default function PapersPage() {
  const confirm = useConfirm();
  const { data, error, loading, reload } = useLoad(async () => (await api.get<{ papers: PaperRow[] }>('/api/tutor/papers')).papers);

  async function remove(p: PaperRow) {
    const ok = await confirm({
      title: `Delete "${p.title}"?`,
      description: p.assigned ? `It is set for ${p.assigned} student${p.assigned === 1 ? '' : 's'}. Their answers and marks for it are deleted too.` : 'This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'destructive',
    });
    if (!ok) return;
    try { await api.delete(`/api/tutor/papers/${p.id}`); toast.success('Paper deleted'); await reload(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not delete the paper.'); }
  }

  return (
    <>
      <SEO title="Papers" />
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Papers</h1>
        <Button asChild><Link to="/teacher/papers/new"><Plus className="size-4" /> New paper</Link></Button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16"><Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading" /></div>
      ) : error || !data ? (
        <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <FileText className="size-8" aria-hidden />
          <p>No papers yet.</p>
          <Button asChild><Link to="/teacher/papers/new">Make a paper</Link></Button>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {data.map((p) => (
            <li key={p.id} className="flex items-center gap-2 pr-2">
              <Link to={`/teacher/papers/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 hover:bg-muted/50">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.title}</span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>{p.questions} questions · {p.marks} marks · {p.durationMins} min</span>
                    <span>{fmtDate(p.createdAt)}</span>
                  </span>
                </span>
                {p.assigned > 0 && <Badge variant="outline" className="shrink-0">{p.corrected}/{p.assigned} marked</Badge>}
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
              <Button variant="ghost" size="icon" aria-label={`Delete ${p.title}`} title="Delete" onClick={() => remove(p)}><Trash2 className="size-4 text-destructive" /></Button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
