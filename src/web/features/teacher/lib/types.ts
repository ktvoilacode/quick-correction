/** Shapes returned by /api/tutor. The API client is untyped on the way back, so they live here. */

export type SectionPlan = { title: string; type: 'mcq' | 'short' | 'long' | 'case'; count: number; marksEach: number; note: string };
export type Pattern = { id: string; name: string; description: string | null; durationMins: number; totalMarks: number; sections: SectionPlan[] };
export type Subject = { id: string; name: string; label: string; patterns: Pattern[]; chapters: { id: string; name: string }[] };

export type Question = {
  id: string; section: string; chapter: string; topic: string; type: string; complexity: string;
  text: string; options?: (string | number)[]; marks: number; answer?: string;
};
export type LayoutSection = { title: string; note: string; type: string; marksEach: number; questionIds: string[] };

export type PaperRow = {
  id: string; title: string; pattern: string; durationMins: number; createdAt: string;
  questions: number; marks: number; assigned: number; corrected: number;
};

export type Preview = {
  preview: true; title: string; pattern: string; durationMins: number; marks: number;
  shortBy: number; missingQuestions: number; layout: LayoutSection[]; questions: Question[];
};

export type SubmissionStatus = 'assigned' | 'evaluating' | 'evaluated' | 'failed';
export type PaperDetail = {
  id: string; title: string; pattern: string; durationMins: number; createdAt: string;
  layout: LayoutSection[] | null; questions: Question[]; marks: number;
  submissions: { id: string; status: SubmissionStatus; dueDate: string; score: number | null; max: number | null; reviewed: boolean; student: { id: string; name: string } }[];
};

export type Student = {
  id: string; name: string; className: string; inviteCode: string;
  parentLinked: boolean; average: number | null; pending: number;
};

export type QuestionResult = { questionId: string; awarded: number; max: number; feedback: string };
export type SubmissionDetail = {
  id: string; status: SubmissionStatus; dueDate: string; submittedAt: string | null;
  pages: string[]; results: QuestionResult[] | null; score: number | null; max: number | null;
  summary: string | null; reviewed: boolean;
  paper: { id: string; title: string; pattern: string; durationMins: number; layout: LayoutSection[] | null };
  student: { id: string; name: string; className: string };
  questions: Question[];
};
export type ReviewRow = { id: string; score: number | null; max: number | null; submittedAt: string | null; paper: { id: string; title: string }; student: { id: string; name: string } };
