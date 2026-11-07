/**
 * Questions as papers see them: read from the `questions` table, tagged with
 * the chapter and topic they belong to in Categories.
 */
import { databaseClass } from '@bloomneo/appkit/database';

export type QuestionType = 'mcq' | 'assertion_reason' | 'short' | 'long' | 'case';

export type Question = {
  id: string;
  /** Section title on the paper this question was set in ("Section A"). */
  section: string;
  chapter: string;
  topic: string;
  type: QuestionType;
  complexity: string;
  text: string;
  options?: string[];
  marks: number;
  figureSvg?: string;
  figureAlt?: string;
  /** An AI-written question no teacher has approved yet. */
  draft?: boolean;
  /** Case study parts. `answer` is only present when asked for. */
  parts?: { label: string; marks: number; text: string; answer?: string }[];
  /** Board papers where this kind of question appeared: "2025 main". */
  askedIn?: string[];
  /** The OR alternative, when this question offers an internal choice. */
  alternate?: Omit<Question, 'section' | 'alternate'>;
  /** Marking scheme. Only present when asked for (marking), never sent to students. */
  answer?: string;
  markingSteps?: { step: string; marks: number }[];
};

/** `alternates` maps a question to its OR alternative. Only `questionIds` count towards the marks. */
export type LayoutSection = { title: string; note: string; type: QuestionType; marksEach: number; questionIds: string[]; alternates?: Record<string, string> };

const TYPE_LABEL: Record<string, string> = { mcq: 'Multiple choice', assertion_reason: 'Assertion-reason', short: 'Short answer', long: 'Long answer', case: 'Case study' };

export const totalMarks = (qs: { marks: number }[]) => qs.reduce((n, x) => n + x.marks, 0);

/**
 * Questions for stored ids, in the stored order. Unknown ids are dropped.
 * `layout` (saved on the paper) names each question's section; papers made
 * before layouts existed fall back to "<marks>-mark <type>".
 */
export async function questionsByIds(
  ids: string[],
  opts: { layout?: LayoutSection[] | null; withAnswers?: boolean } = {},
): Promise<Question[]> {
  if (!ids.length) return [];
  const db = await databaseClass.get();
  const altOf = new Map<string, string>();
  for (const s of opts.layout ?? []) for (const [k, v] of Object.entries(s.alternates ?? {})) altOf.set(k, v);
  const rows = await db.question.findMany({
    where: { id: { in: [...ids, ...altOf.values()] } },
    include: { topic: { select: { name: true, parent: { select: { name: true } } } }, pattern: { select: { seenIn: true } } },
  });
  const byId = new Map<string, any>(rows.map((r: any) => [r.id, r]));
  const sectionOf = new Map<string, string>();
  for (const s of opts.layout ?? []) for (const id of s.questionIds) sectionOf.set(id, s.title);

  const toQuestion = (r: any): Omit<Question, 'section' | 'alternate'> => {
    const parts = r.parts as Question['parts'] | null;
    return {
      id: r.id,
      chapter: r.topic.parent?.name ?? '',
      topic: r.topic.name,
      type: r.type,
      complexity: r.complexity,
      text: r.text,
      options: (r.options as string[] | null) ?? undefined,
      marks: r.marks,
      figureSvg: r.figureSvg ?? undefined,
      figureAlt: r.figureAlt ?? undefined,
      ...(r.reviewStatus === 'draft' && !r.isActive ? { draft: true } : {}),
      askedIn: (r.pattern?.seenIn as string[] | undefined) ?? [],
      // Answers stay on the server unless marking or the teacher asks for them.
      parts: parts ? parts.map(({ answer, ...p }) => (opts.withAnswers ? { ...p, answer } : p)) : undefined,
      ...(opts.withAnswers ? { answer: r.answer ?? undefined, markingSteps: (r.markingSteps as Question['markingSteps'] | null) ?? undefined } : {}),
    };
  };

  return ids.flatMap((id) => {
    const r = byId.get(id);
    if (!r) return [];
    const alt = byId.get(altOf.get(id) ?? '');
    return [{
      ...toQuestion(r),
      section: sectionOf.get(id) ?? `${r.marks}-mark ${TYPE_LABEL[r.type]?.toLowerCase() ?? r.type}`,
      ...(alt ? { alternate: toQuestion(alt) } : {}),
    }];
  });
}
