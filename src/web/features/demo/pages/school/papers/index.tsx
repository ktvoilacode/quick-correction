/**
 * /demo/school/papers — every paper with its submission status.
 */
import { Link } from 'react-router-dom';
import { PageHeader, Button, Card, Badge } from '@bloomneo/uikit';
import { FilePlus2, ChevronRight } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { totalMarks } from '../../../data/questions';
import { useDemo, questionsOf } from '../../../data/store';
import { fmt } from '../../../components/parts';

export default function Papers() {
  const { papers, submissions } = useDemo();
  return (
    <>
      <SEO title="Test papers" />
      <PageHeader
        title="Test papers"
        description="Generated papers for Class 10-A. Open one to preview, download or assign."
        actions={<Button asChild><Link to="/demo/school/papers/new"><FilePlus2 className="size-4" /> Generate paper</Link></Button>}
      />
      <Card className="mt-6 overflow-hidden p-0">
        <ul className="divide-y divide-border">
          {papers.map((p) => {
            const subs = submissions.filter((s) => s.paperId === p.id);
            const done = subs.filter((s) => s.status === 'evaluated').length;
            return (
              <li key={p.id}>
                <Link to={`/demo/school/papers/${p.id}`} className="flex items-center gap-3 px-4 py-4 hover:bg-accent/40 sm:px-5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.title}</span>
                    <span className="block text-sm text-muted-foreground">
                      {questionsOf(p).length} questions · {totalMarks(questionsOf(p))} marks · {fmt(p.createdAt)}
                    </span>
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="outline">{p.pattern === 'board' ? 'Full board pattern' : 'Unit test'}</Badge>
                      {subs.length ? (
                        <Badge variant={done === subs.length ? 'secondary' : 'default'}>{done}/{subs.length} corrected</Badge>
                      ) : (
                        <Badge variant="outline">Not assigned</Badge>
                      )}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
