/**
 * Papers — `/parent/papers`. What to do, what is being marked, what came back.
 */
import { Link } from 'react-router-dom';
import { Badge, Alert, AlertDescription } from '@bloomneo/uikit';
import { ChevronRight, Loader2, AlertTriangle, FileText } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { api } from '@/shared/api';
import { useLoad, fmtDate } from '@/shared/useLoad';
import type { SubRow } from '../../lib/types';

function Group({ title, rows, many }: { title: string; rows: SubRow[]; many: boolean }) {
  if (!rows.length) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">{title}</h2>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {rows.map((s) => (
          <li key={s.id}>
            <Link to={`/parent/papers/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{s.paper.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {many ? `${s.student.name} · ` : ''}{s.status === 'assigned' ? `Due ${fmtDate(s.dueDate)}` : s.submittedAt ? `Sent ${fmtDate(s.submittedAt)}` : ''}
                </span>
              </span>
              {s.status === 'evaluated' && s.max ? <span className="font-semibold">{s.score}/{s.max}</span> : null}
              {s.status === 'evaluated' && !s.reviewed ? <Badge variant="outline">Teacher checking</Badge> : null}
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function PapersPage() {
  const { data, error, loading } = useLoad(async () => (await api.get<{ submissions: SubRow[] }>('/api/parent/submissions')).submissions);
  const many = new Set(data?.map((s) => s.student.id)).size > 1;

  return (
    <>
      <SEO title="Papers" />
      <h1 className="mb-6 text-2xl font-semibold">Papers</h1>
      {loading ? (
        <div className="grid place-items-center py-16"><Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading" /></div>
      ) : error || !data ? (
        <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <FileText className="size-8" aria-hidden />
          <p>No papers yet. When the teacher sets one, it shows here.</p>
        </div>
      ) : (
        <>
          <Group title="To do" rows={data.filter((s) => s.status === 'assigned').sort((a, b) => a.dueDate.localeCompare(b.dueDate))} many={many} />
          <Group title="Being marked" rows={data.filter((s) => s.status === 'evaluating')} many={many} />
          <Group title="Marked" rows={data.filter((s) => s.status === 'evaluated')} many={many} />
          <Group title="Needs another try" rows={data.filter((s) => s.status === 'failed')} many={many} />
        </>
      )}
    </>
  );
}
