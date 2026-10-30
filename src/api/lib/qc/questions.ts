/**
 * Questions as papers see them: read from the `questions` table, tagged with
 * the chapter and topic they belong to in Categories.
 */
import { databaseClass } from '@bloomneo/appkit/database';

export type QuestionType = 'mcq' | 'short' | 'long' | 'case';

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
  /** Marking scheme. Only present when asked for (marking), never sent to students. */
  answer?: string;
};

export type LayoutSection = { title: string; note: string; type: QuestionType; marksEach: number; questionIds: string[] };

const TYPE_LABEL: Record<string, string> = { mcq: 'Multiple choice', short: 'Short answer', long: 'Long answer', case: 'Case study' };

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
  const rows = await db.question.findMany({
    where: { id: { in: ids } },
    include: { topic: { select: { name: true, parent: { select: { name: true } } } } },
  });
  const byId = new Map<string, any>(rows.map((r: any) => [r.id, r]));
  const sectionOf = new Map<string, string>();
  for (const s of opts.layout ?? []) for (const id of s.questionIds) sectionOf.set(id, s.title);

  return ids.flatMap((id) => {
    const r = byId.get(id);
    if (!r) return [];
    const q: Question = {
      id: r.id,
      section: sectionOf.get(id) ?? `${r.marks}-mark ${TYPE_LABEL[r.type]?.toLowerCase() ?? r.type}`,
      chapter: r.topic.parent?.name ?? '',
      topic: r.topic.name,
      type: r.type,
      complexity: r.complexity,
      text: r.text,
      options: (r.options as string[] | null) ?? undefined,
      marks: r.marks,
    };
    if (opts.withAnswers) q.answer = r.answer ?? undefined;
    return [q];
  });
}
