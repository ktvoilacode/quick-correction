/**
 * /demo/parent/tests/:id — the three steps a parent takes: download the
 * paper, have the child write it on paper, upload photos of the pages, submit.
 * Paying the teacher's correction fee submits the pages for (simulated) AI marking.
 */
import * as React from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  PageHeader, Card, CardContent, Button, Badge, EmptyState, Dialog, DialogContent, DialogHeader, DialogTitle, toast,
} from '@bloomneo/uikit';
import { Download, Upload, Sparkles, X, FileQuestion, Loader2, CheckCircle2, Eye, Camera } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { useDemo, studentById, ME_STUDENT, rupees } from '../../../data/store';
import { PaperView, fmt } from '../../../components/parts';
import { PayDialog } from '../../../components/PayDialog';

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex gap-4 py-5">
        <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${done ? 'bg-success text-white' : 'bg-primary text-primary-foreground'}`}>
          {done ? <CheckCircle2 className="size-4" /> : n}
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <p className="font-medium">{title}</p>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

const STAGES = ['Reading handwriting', 'Matching answers to questions', 'Marking against CBSE scheme', 'Writing feedback'];

export default function UploadAnswers() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { submissions, papers, uploadPages, payAndSubmit } = useDemo();
  const s = submissions.find((x) => x.id === id);
  const paper = s && papers.find((p) => p.id === s.paperId);
  const [downloaded, setDownloaded] = React.useState(false);
  const [preview, setPreview] = React.useState(false);
  const [stage, setStage] = React.useState(0);
  const [paying, setPaying] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Walk the progress labels while the simulated correction runs.
  React.useEffect(() => {
    if (s?.status !== 'evaluating') return;
    const t = window.setInterval(() => setStage((x) => Math.min(x + 1, STAGES.length - 1)), 1100);
    return () => window.clearInterval(t);
  }, [s?.status]);

  // Correction finished while on this page — take the student to the result.
  const prevStatus = React.useRef(s?.status);
  React.useEffect(() => {
    if (prevStatus.current === 'evaluating' && s?.status === 'evaluated') {
      toast.success('The paper has been corrected');
      navigate(`/demo/parent/results/${s.id}`);
    }
    prevStatus.current = s?.status;
  }, [s?.status, s?.id, navigate]);

  if (!s || !paper) {
    return <EmptyState icon={<FileQuestion className="size-6" />} title="Test not found" action={<Button asChild variant="outline"><Link to="/demo/parent">Home</Link></Button>} />;
  }

  const pages = s.pages.filter((p) => p.startsWith('data:'));

  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    Promise.all(
      [...files].map(
        (f) => new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.readAsDataURL(f);
        }),
      ),
    ).then((urls) => uploadPages(s.id, [...pages, ...urls]));
  };

  return (
    <>
      <SEO title={paper.title} />
      <div className="print:hidden">
        <PageHeader
          title={paper.title}
          description={`${paper.subject} · ${paper.durationMins} min · due ${fmt(s.dueDate)}`}
          breadcrumbs={[{ label: 'Home', href: '/demo/parent' }, { label: paper.title }]}
        />
      </div>

      {s.status === 'evaluating' ? (
        <Card className="mx-auto mt-10 max-w-lg print:hidden">
          <CardContent className="space-y-5 py-10 text-center">
            <Sparkles className="mx-auto size-8 animate-pulse text-primary" />
            <div>
              <p className="text-lg font-semibold">AI is correcting the paper</p>
              <p className="text-sm text-muted-foreground">You can leave this page — we’ll notify you and the teacher when it’s ready.</p>
            </div>
            <ol className="mx-auto max-w-xs space-y-2 text-left text-sm">
              {STAGES.map((label, i) => (
                <li key={label} className={`flex items-center gap-2 ${i > stage ? 'text-muted-foreground' : ''}`}>
                  {i < stage ? <CheckCircle2 className="size-4 text-success" /> : i === stage ? <Loader2 className="size-4 animate-spin" /> : <span className="size-4" />}
                  {label}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 max-w-3xl space-y-4 print:hidden">
          <Step n={1} title="Download & print the paper" done={downloaded}>
            <p className="text-sm text-muted-foreground">Print it (or show it on a tablet). Your child writes the answers on plain sheets, with a timer.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setPreview(true)}><Eye className="size-4" /> Preview</Button>
              <Button onClick={() => { setDownloaded(true); window.print(); }}><Download className="size-4" /> Download PDF</Button>
            </div>
          </Step>

          <Step n={2} title="Snap the answer sheets" done={pages.length > 0}>
            <p className="text-sm text-muted-foreground">One photo per page, in order. Good light, whole page in frame.</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }}
            />
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {pages.map((src, i) => (
                <div key={i} className="group relative">
                  <img src={src} alt={`Page ${i + 1}`} className="aspect-[3/4] w-full rounded-md border border-border object-cover" />
                  <Badge className="absolute bottom-1.5 left-1.5">p{i + 1}</Badge>
                  <button
                    aria-label={`Remove page ${i + 1}`}
                    onClick={() => uploadPages(s.id, pages.filter((_, j) => j !== i))}
                    className="absolute right-1.5 top-1.5 grid size-6 cursor-pointer place-items-center rounded-full bg-background/90 shadow"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileRef.current?.click()}
                className="grid aspect-[3/4] cursor-pointer place-items-center rounded-md border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-foreground"
              >
                <span className="flex flex-col items-center gap-1.5">
                  <Camera className="size-5" />
                  {pages.length ? 'Add page' : 'Add photos'}
                </span>
              </button>
            </div>
          </Step>

          <Step n={3} title="Pay & submit for marking">
            <p className="text-sm text-muted-foreground">
              {pages.length ? `${pages.length} page${pages.length > 1 ? 's' : ''} ready.` : 'Add at least one page to submit.'} Correction fee {rupees(s.fee)}, set by the teacher. Marks usually arrive within minutes.
            </p>
            <Button disabled={!pages.length} onClick={() => setPaying(true)}>
              <Upload className="size-4" /> Pay {rupees(s.fee)} & submit
            </Button>
          </Step>
        </div>
      )}

      {/* Printed when the student downloads. Hidden on screen. */}
      <div className="hidden print:block">
        <PaperView paper={paper} studentName={studentById(ME_STUDENT).name} />
      </div>

      <PayDialog
        open={paying}
        onOpenChange={setPaying}
        amount={s.fee}
        paperTitle={paper.title}
        childName={studentById(ME_STUDENT).name}
        onPaid={() => { setStage(0); payAndSubmit(s.id); }}
      />

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle>{paper.title}</DialogTitle></DialogHeader>
          <PaperView paper={paper} studentName={studentById(ME_STUDENT).name} />
        </DialogContent>
      </Dialog>
    </>
  );
}
