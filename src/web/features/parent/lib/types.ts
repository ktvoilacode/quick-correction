/** Shapes returned by /api/parent. */
import type { Question, LayoutSection, QuestionResult, SubmissionStatus } from '@/features/teacher/lib/types';

export type { Question, LayoutSection, QuestionResult, SubmissionStatus };

export type Child = { id: string; name: string; className: string; teacher: { name: string | null } };

export type SubRow = {
  id: string; status: SubmissionStatus; dueDate: string; submittedAt: string | null;
  score: number | null; max: number | null; reviewed: boolean;
  paper: { id: string; title: string; pattern: string; durationMins: number };
  student: { id: string; name: string };
};

export type SubDetail = {
  id: string; status: SubmissionStatus; dueDate: string; submittedAt: string | null;
  pages: string[]; results: QuestionResult[] | null; score: number | null; max: number | null;
  summary: string | null; reviewed: boolean;
  paper: { id: string; title: string; pattern: string; durationMins: number; layout: LayoutSection[] | null };
  student: { id: string; name: string; className: string };
  questions: Question[];
};

export const pct = (s: { score: number | null; max: number | null }) => (s.max ? Math.round(((s.score ?? 0) / s.max) * 100) : 0);
