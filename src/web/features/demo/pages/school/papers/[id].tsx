/**
 * /demo/school/papers/:id — preview, download (print to PDF) and assign.
 */
import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  PageHeader, Button, Card, CardContent, CardHeader, CardTitle, Badge, Checkbox, Input, Label, EmptyState,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, toast,
} from '@bloomneo/uikit';
import { Download, Send, FileQuestion } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { useDemo, STUDENTS, studentById } from '../../../data/store';
import { PaperView, StatusBadge } from '../../../components/parts';

function AssignDialog({ paperId }: { paperId: string }) {
  const { assignPaper, submissions } = useDemo();
  const already = submissions.filter((s) => s.paperId === paperId).map((s) => s.studentId);
  const [open, setOpen] = React.useState(false);
  const [picked, setPicked] = React.useState<string[]>(STUDENTS.map((s) => s.id).filter((id) => !already.includes(id)));
  const [due, setDue] = React.useState(() => new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10));

  const submit = () => {
    assignPaper(paperId, picked, due);
    toast.success(`Assigned to ${picked.length} student${picked.length === 1 ? '' : 's'}`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Send className="size-4" /> Assign</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign paper</DialogTitle>
          <DialogDescription>Students and their parents are notified. Students download, write and upload their answers.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="due">Due date</Label>
            <Input id="due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Class 10-A</Label>
              <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setPicked(picked.length === STUDENTS.length ? [] : STUDENTS.map((s) => s.id))}>
                {picked.length === STUDENTS.length ? 'Clear' : 'Select all'}
              </Button>
            </div>
            <div className="max-h-60 space-y-1 overflow-y-auto">
              {STUDENTS.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent/40">
                  <Checkbox
                    checked={picked.includes(s.id)}
                    onCheckedChange={() => setPicked((cur) => (cur.includes(s.id) ? cur.filter((x) => x !== s.id) : [...cur, s.id]))}
                  />
                  <span className="flex-1">{s.name}</span>
                  {already.includes(s.id) && <span className="text-xs text-muted-foreground">already assigned</span>}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!picked.length}>Assign to {picked.length}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PaperDetail() {
  const { id } = useParams();
  const { papers, submissions } = useDemo();
  const paper = papers.find((p) => p.id === id);

  if (!paper) {
    return <EmptyState icon={<FileQuestion className="size-6" />} title="Paper not found" action={<Button asChild variant="outline"><Link to="/demo/school/papers">Back to papers</Link></Button>} />;
  }

  const subs = submissions.filter((s) => s.paperId === paper.id);

  return (
    <>
      <SEO title={paper.title} />
      <div className="print:hidden">
        <PageHeader
          title={paper.title}
          description={`${paper.subject} · Class ${paper.className}`}
          breadcrumbs={[{ label: 'Test papers', href: '/demo/school/papers' }, { label: paper.title }]}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()}><Download className="size-4" /> Download PDF</Button>
              <AssignDialog paperId={paper.id} />
            </div>
          }
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] print:mt-0 print:block">
        <PaperView paper={paper} />

        <Card className="self-start print:hidden">
          <CardHeader><CardTitle className="text-base">Submissions</CardTitle></CardHeader>
          <CardContent className="p-0">
            {subs.length ? (
              <ul className="divide-y divide-border">
                {subs.map((s) => {
                  const row = (
                    <>
                      <span className="flex-1 truncate">{studentById(s.studentId).name}</span>
                      <StatusBadge s={s} />
                    </>
                  );
                  return (
                    <li key={s.id}>
                      {s.status === 'evaluated' ? (
                        <Link to={`/demo/school/results/${s.id}`} className="flex items-center gap-3 px-6 py-2.5 text-sm hover:bg-accent/40">{row}</Link>
                      ) : (
                        <div className="flex items-center gap-3 px-6 py-2.5 text-sm">{row}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-6 pb-6 text-sm text-muted-foreground">Not assigned yet. Use <Badge variant="outline">Assign</Badge> to send it to the class.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
