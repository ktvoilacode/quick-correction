/**
 * Prototype store — everything the clickable demo needs, held in memory and
 * mirrored to localStorage so a refresh keeps the walkthrough where it was.
 *
 * No API calls: this is the stand-in for the real backend while the flow is
 * being validated. "AI correction" is simulated in `evaluate()`.
 */
import * as React from 'react';
import { QUESTION_BANK, buildPaper, CHAPTERS, type Question } from './questions';

export type Role = 'school' | 'parent';

export type Student = { id: string; name: string; className: string; roll: number; parent: string };

export type Paper = {
  id: string;
  title: string;
  subject: string;
  className: string;
  pattern: 'board' | 'unit';
  durationMins: number;
  questionIds: string[];
  createdAt: string;
};

export type QuestionResult = { questionId: string; awarded: number; max: number; feedback: string };

export type Submission = {
  id: string;
  paperId: string;
  studentId: string;
  status: 'assigned' | 'evaluating' | 'evaluated';
  dueDate: string;
  pages: string[];
  submittedAt?: string;
  results?: QuestionResult[];
  score?: number;
  max?: number;
  summary?: string;
};

type State = { role: Role; papers: Paper[]; submissions: Submission[] };

export const SCHOOL = { name: 'Delhi Public School, Hyderabad', board: 'CBSE' };

export const STUDENTS: Student[] = [
  { id: 's1', name: 'Aarav Sharma', className: '10-A', roll: 1, parent: 'Rohit Sharma' },
  { id: 's2', name: 'Diya Reddy', className: '10-A', roll: 2, parent: 'Lakshmi Reddy' },
  { id: 's3', name: 'Ishaan Rao', className: '10-A', roll: 3, parent: 'Suresh Rao' },
  { id: 's4', name: 'Meera Iyer', className: '10-A', roll: 4, parent: 'Anand Iyer' },
  { id: 's5', name: 'Kabir Khan', className: '10-A', roll: 5, parent: 'Farah Khan' },
  { id: 's6', name: 'Saanvi Gupta', className: '10-A', roll: 6, parent: 'Neha Gupta' },
];

/** The child whose parent is signed in to the demo. */
export const ME_STUDENT = 's1';

const FEEDBACK_GOOD = ['Correct method and answer.', 'Well presented with all steps.', 'Correct — neat working.'];
const FEEDBACK_PART = [
  'Method is right but a calculation slip in the last step.',
  'Formula correct; final answer not simplified.',
  'Missing the concluding statement — partial marks.',
  'Diagram not labelled; reasoning otherwise correct.',
];
const FEEDBACK_BAD = ['Incorrect option chosen.', 'Wrong formula applied.', 'Not attempted.'];

/** Deterministic pseudo-random so seeded results look the same every load. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function gradePaper(paper: Paper, skill: number, seed: number): Pick<Submission, 'results' | 'score' | 'max' | 'summary'> {
  const r = rng(seed);
  const results: QuestionResult[] = paper.questionIds.map((qid) => {
    const qn = QUESTION_BANK.find((x) => x.id === qid)!;
    const roll = r() * 0.6 + skill * 0.55;
    let awarded: number;
    let feedback: string;
    if (roll > 0.75) {
      awarded = qn.marks;
      feedback = FEEDBACK_GOOD[Math.floor(r() * FEEDBACK_GOOD.length)];
    } else if (roll > 0.45 && qn.marks > 1) {
      awarded = Math.max(1, Math.round(qn.marks * (0.4 + r() * 0.4)));
      feedback = FEEDBACK_PART[Math.floor(r() * FEEDBACK_PART.length)];
    } else {
      awarded = 0;
      feedback = FEEDBACK_BAD[Math.floor(r() * FEEDBACK_BAD.length)];
    }
    return { questionId: qid, awarded, max: qn.marks, feedback };
  });
  const score = results.reduce((n, x) => n + x.awarded, 0);
  const max = results.reduce((n, x) => n + x.max, 0);
  const weak = weakChapters(results).slice(0, 2).map((w) => w.chapter);
  const summary =
    `Scored ${score}/${max}. ` +
    (weak.length ? `Focus next on ${weak.join(' and ')}. ` : '') +
    'Show every step in long answers — method marks were lost where working was skipped.';
  return { results, score, max, summary };
}

export function weakChapters(results: QuestionResult[]) {
  const by = new Map<string, { got: number; max: number }>();
  results.forEach((x) => {
    const ch = QUESTION_BANK.find((q) => q.id === x.questionId)!.chapter;
    const cur = by.get(ch) ?? { got: 0, max: 0 };
    cur.got += x.awarded;
    cur.max += x.max;
    by.set(ch, cur);
  });
  return [...by.entries()]
    .map(([chapter, v]) => ({ chapter, pct: Math.round((v.got / v.max) * 100) }))
    .sort((a, b) => a.pct - b.pct);
}

/* ── seed ──────────────────────────────────────────────────────────────── */

function seed(): State {
  const papers: Paper[] = [
    {
      id: 'p1', title: 'Unit Test 1 — Algebra', subject: 'Mathematics (Standard)', className: '10-A',
      pattern: 'unit', durationMins: 60, createdAt: '2026-07-14',
      questionIds: buildPaper(['Real Numbers', 'Polynomials', 'Pair of Linear Equations', 'Quadratic Equations', 'Arithmetic Progressions'], 'unit').map((x) => x.id),
    },
    {
      id: 'p2', title: 'Unit Test 2 — Geometry & Trigonometry', subject: 'Mathematics (Standard)', className: '10-A',
      pattern: 'unit', durationMins: 60, createdAt: '2026-08-18',
      questionIds: buildPaper(['Triangles', 'Coordinate Geometry', 'Trigonometry', 'Circles', 'Areas Related to Circles'], 'unit').map((x) => x.id),
    },
    {
      id: 'p3', title: 'Half-Yearly Pre-Board', subject: 'Mathematics (Standard)', className: '10-A',
      pattern: 'board', durationMins: 180, createdAt: '2026-09-22',
      questionIds: buildPaper([...CHAPTERS], 'board').map((x) => x.id),
    },
    {
      id: 'p4', title: 'Practice Paper — Statistics & Probability', subject: 'Mathematics (Standard)', className: '10-A',
      pattern: 'unit', durationMins: 45, createdAt: '2026-10-20',
      questionIds: buildPaper(['Statistics', 'Probability', 'Surface Areas and Volumes'], 'unit').map((x) => x.id),
    },
  ];

  const skills: Record<string, number> = { s1: 0.62, s2: 0.85, s3: 0.45, s4: 0.74, s5: 0.38, s6: 0.68 };
  const dates: Record<string, [string, string]> = {
    p1: ['2026-07-21', '2026-07-20'],
    p2: ['2026-08-25', '2026-08-24'],
    p3: ['2026-10-02', '2026-10-01'],
    p4: ['2026-10-28', ''],
  };

  const submissions: Submission[] = [];
  papers.forEach((p, pi) => {
    STUDENTS.forEach((s, si) => {
      const [due, done] = dates[p.id];
      const id = `${p.id}-${s.id}`;
      if (p.id === 'p4') {
        submissions.push({ id, paperId: p.id, studentId: s.id, status: 'assigned', dueDate: due, pages: [] });
        return;
      }
      // Aarav improves across the term — gives the progress chart a story.
      const skill = s.id === 's1' ? skills.s1 + pi * 0.08 : skills[s.id];
      submissions.push({
        id, paperId: p.id, studentId: s.id, status: 'evaluated', dueDate: due,
        pages: [], submittedAt: done,
        ...gradePaper(p, skill, (pi + 1) * 31 + (si + 1) * 7),
      });
    });
  });

  return { role: 'school', papers, submissions };
}

/* ── context ───────────────────────────────────────────────────────────── */

const KEY = 'medhamark:demo:v2';

function load(): State {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    // Storage blocked — fall through to a fresh seed.
  }
  return seed();
}

type Ctx = State & {
  setRole: (r: Role) => void;
  createPaper: (p: Omit<Paper, 'id' | 'createdAt'>) => Paper;
  assignPaper: (paperId: string, studentIds: string[], dueDate: string) => void;
  uploadPages: (submissionId: string, pages: string[]) => void;
  evaluate: (submissionId: string) => void;
  reset: () => void;
};

const DemoContext = React.createContext<Ctx | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<State>(load);

  React.useEffect(() => {
    try {
      // Uploaded page images are data URLs and can be large; keep them out of storage.
      const slim = { ...state, submissions: state.submissions.map((s) => ({ ...s, pages: s.pages.length ? ['stored'] : [] })) };
      window.localStorage.setItem(KEY, JSON.stringify(slim));
    } catch {
      // Quota or private mode — the demo still works for this session.
    }
  }, [state]);

  const value: Ctx = {
    ...state,
    setRole: (role) => setState((s) => ({ ...s, role })),
    createPaper: (p) => {
      const paper: Paper = { ...p, id: `p${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10) };
      setState((s) => ({ ...s, papers: [paper, ...s.papers] }));
      return paper;
    },
    assignPaper: (paperId, studentIds, dueDate) =>
      setState((s) => ({
        ...s,
        submissions: [
          ...s.submissions.filter((x) => !(x.paperId === paperId && studentIds.includes(x.studentId))),
          ...studentIds.map((studentId) => ({
            id: `${paperId}-${studentId}`, paperId, studentId, status: 'assigned' as const, dueDate, pages: [],
          })),
        ],
      })),
    uploadPages: (id, pages) =>
      setState((s) => ({ ...s, submissions: s.submissions.map((x) => (x.id === id ? { ...x, pages } : x)) })),
    evaluate: (id) => {
      setState((s) => ({
        ...s,
        submissions: s.submissions.map((x) =>
          x.id === id ? { ...x, status: 'evaluating', submittedAt: new Date().toISOString().slice(0, 10) } : x,
        ),
      }));
      // Simulated AI turnaround.
      window.setTimeout(() => {
        setState((s) => ({
          ...s,
          submissions: s.submissions.map((x) => {
            if (x.id !== id) return x;
            const paper = s.papers.find((p) => p.id === x.paperId)!;
            return { ...x, status: 'evaluated', ...gradePaper(paper, 0.82, Date.now() % 1000) };
          }),
        }));
      }, 4500);
    },
    reset: () => setState({ ...seed(), role: state.role }),
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = React.useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used inside <DemoProvider>');
  return ctx;
}

/* ── selectors ─────────────────────────────────────────────────────────── */

export const questionsOf = (paper: Paper): Question[] =>
  paper.questionIds.map((id) => QUESTION_BANK.find((x) => x.id === id)!).filter(Boolean);

export const pct = (s: Pick<Submission, 'score' | 'max'>) =>
  s.max ? Math.round(((s.score ?? 0) / s.max) * 100) : 0;

export const studentById = (id: string) => STUDENTS.find((s) => s.id === id)!;
