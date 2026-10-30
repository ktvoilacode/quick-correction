/**
 * Review — `/teacher/review`. Marks waiting for the teacher's check.
 */
import { Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@bloomneo/uikit';
import { ChevronRight, Loader2, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { api } from '@/shared/api';
import { useLoad, fmtDate } from '../lib/useLoad';
import type { ReviewRow } from '../lib/types';

export default function ReviewPage() {
  const { data, error, loading } = useLoad(async () => (await api.get<{ submissions: ReviewRow[] }>('/api/tutor/review')).submissions);
  return (
    <>
      <SEO title="Review" />
      <h1 className="mb-2 text-2xl font-semibold">Review</h1>
      <p className="mb-6 text-sm text-muted-foreground">Marks to check before parents rely on them.</p>
      {loading ? (
        <div className="grid place-items-center py-16"><Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading" /></div>
      ) : error || !data ? (
        <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <ClipboardCheck className="size-8" aria-hidden />
          <p>Nothing to check.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {data.map((s) => (
            <li key={s.id}>
              <Link to={`/teacher/results/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.student.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{s.paper.title}{s.submittedAt ? ` · ${fmtDate(s.submittedAt)}` : ''}</span>
                </span>
                <span className="font-semibold">{s.score}/{s.max}</span>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
