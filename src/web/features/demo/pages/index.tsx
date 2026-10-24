/**
 * /demo — pick who you are. Stands in for sign-in in the prototype.
 */
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Badge } from '@bloomneo/uikit';
import { School, GraduationCap, HeartHandshake, ArrowRight, FilePlus2, Upload, Sparkles, TrendingUp } from 'lucide-react';
import { SEO } from '@/shared/SEO';
import { useDemo, type Role } from '../data/store';

const ROLES: { role: Role; title: string; text: string; icon: typeof School }[] = [
  { role: 'school', title: 'School / Teacher', text: 'Generate CBSE board-pattern papers, assign them to a class and track every student.', icon: School },
  { role: 'student', title: 'Student', text: 'Download assigned papers, write by hand, upload photos and get AI-corrected results.', icon: GraduationCap },
  { role: 'parent', title: 'Parent', text: 'See your child’s scores, weak chapters and upcoming tests in one place.', icon: HeartHandshake },
];

const FLOW = [
  { icon: FilePlus2, label: 'Generate paper' },
  { icon: ArrowRight, label: 'Assign & download' },
  { icon: Upload, label: 'Write & upload' },
  { icon: Sparkles, label: 'AI correction' },
  { icon: TrendingUp, label: 'Track progress' },
];

export default function DemoHome() {
  const { setRole } = useDemo();
  const navigate = useNavigate();
  const go = (r: Role) => { setRole(r); navigate(`/demo/${r}`); };

  return (
    <>
      <SEO title="MedhaMark prototype" description="Board test papers, handwritten answers, AI correction and progress tracking." />
      <div className="mx-auto max-w-4xl py-6 sm:py-12">
        <div className="text-center">
          <Badge variant="secondary">Clickable prototype · CBSE Class 10</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Board-pattern practice, written by hand, marked by AI.
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            MedhaMark lets schools generate board test papers, students answer them on paper and upload a photo,
            and everyone track progress chapter by chapter.
          </p>
        </div>

        <ol className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-2 gap-y-3 text-sm text-muted-foreground">
          {FLOW.map(({ icon: Icon, label }, i) => (
            <li key={label} className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1">
                <Icon className="size-3.5" /> {label}
              </span>
              {i < FLOW.length - 1 && <span aria-hidden>→</span>}
            </li>
          ))}
        </ol>

        <h2 className="mt-12 mb-4 text-center text-sm font-medium text-muted-foreground">Continue as</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {ROLES.map(({ role, title, text, icon: Icon }) => (
            <button key={role} onClick={() => go(role)} className="group cursor-pointer text-left">
              <Card className="h-full transition-colors group-hover:border-primary">
                <CardContent className="flex h-full flex-col gap-3 py-6">
                  <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-semibold">{title}</span>
                  <span className="flex-1 text-sm text-muted-foreground">{text}</span>
                  <span className="flex items-center gap-1 text-sm font-medium text-primary">
                    Open <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
