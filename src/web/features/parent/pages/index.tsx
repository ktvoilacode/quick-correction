/**
 * Parent home — `/parent`. Each linked child at a glance, and the way to link
 * another with the teacher's invite code.
 */
import { Link } from 'react-router-dom';
import { Card, CardContent, Alert, AlertDescription } from '@bloomneo/uikit';
import { ChevronRight, Loader2, AlertTriangle, ClipboardList, CheckCircle2, UserPlus } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { api } from '@/shared/api';
import { useAuth } from '@/features/auth/hooks';
import { useLoad, fmtDate } from '@/shared/useLoad';
import { LinkChild } from '../components/LinkChild';
import { pct, type Child, type SubRow } from '../lib/types';

export default function ParentHome() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useLoad(async () => {
    const [c, s] = await Promise.all([
      api.get<{ children: Child[] }>('/api/parent/children'),
      api.get<{ submissions: SubRow[] }>('/api/parent/submissions'),
    ]);
    return { children: c.children, subs: s.submissions };
  });

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading" /></div>;
  if (error || !data) return <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertDescription>{error ?? 'Could not load your children.'}</AlertDescription></Alert>;

  const first = (user?.name || '').split(' ')[0];

  if (data.children.length === 0) {
    return (
      <>
        <SEO title="Parent" />
        <h1 className="mb-1 text-2xl font-semibold">{first ? `Welcome, ${first}` : 'Welcome'}</h1>
        <p className="mb-6 text-sm text-muted-foreground">Link your child to see their papers and marks.</p>
        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="flex items-center gap-2 font-medium"><UserPlus className="size-4 text-primary" aria-hidden /> Enter the invite code</p>
            <p className="text-sm text-muted-foreground">Your child's teacher gives you a short code. Enter it once and the papers appear here.</p>
            <LinkChild onLinked={reload} />
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <SEO title="Parent" />
      <h1 className="mb-1 text-2xl font-semibold">{first ? `Hello, ${first}` : 'Hello'}</h1>
      <p className="mb-6 text-sm text-muted-foreground">Papers to do and the marks that came back.</p>

      <div className="space-y-4">
        {data.children.map((child) => {
          const mine = data.subs.filter((s) => s.student.id === child.id);
          const todo = mine.filter((s) => s.status === 'assigned').sort((a, b) => a.dueDate.localeCompare(b.dueDate));
          const marked = mine.filter((s) => s.status === 'evaluated');
          const avg = marked.length ? Math.round(marked.reduce((n, s) => n + pct(s), 0) / marked.length) : null;
          const next = todo[0];
          return (
            <Card key={child.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{child.name}</h2>
                    <p className="text-sm text-muted-foreground">Class {child.className}{child.teacher?.name ? ` · ${child.teacher.name}` : ''}</p>
                  </div>
                  {avg !== null && <div className="text-right"><p className="text-2xl font-semibold">{avg}%</p><p className="text-xs text-muted-foreground">average</p></div>}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <Link to="/parent/papers" className="flex items-center gap-2 rounded-lg border border-border p-3 hover:bg-muted/50">
                    <ClipboardList className="size-4 text-primary" aria-hidden /> <span><strong>{todo.length}</strong> to do</span>
                  </Link>
                  <Link to="/parent/progress" className="flex items-center gap-2 rounded-lg border border-border p-3 hover:bg-muted/50">
                    <CheckCircle2 className="size-4 text-primary" aria-hidden /> <span><strong>{marked.length}</strong> marked</span>
                  </Link>
                </div>

                {next && (
                  <Link to={`/parent/papers/${next.id}`} className="mt-4 flex items-center gap-3 rounded-lg bg-primary/10 px-4 py-3 hover:bg-primary/15">
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs uppercase tracking-wide text-muted-foreground">Next paper · due {fmtDate(next.dueDate)}</span>
                      <span className="block truncate font-medium">{next.paper.title}</span>
                    </span>
                    <ChevronRight className="size-4 text-primary" aria-hidden />
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <details className="mt-8 rounded-xl border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium">Link another child</summary>
        <div className="mt-3"><LinkChild onLinked={reload} /></div>
      </details>
    </>
  );
}
