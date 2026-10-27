/**
 * Paper generator: fills a pattern's sections from the question bank.
 *
 * A pattern says "Section B: 5 short-answer questions of 2 marks". For each
 * section this picks that many active questions of that type and marks from
 * the chosen chapters' topics, spreading them across topics so a paper covers
 * the chapters evenly. `variant` shifts the starting point so the same
 * request gives a different paper each time.
 */
import { databaseClass } from '@bloomneo/appkit/database';
import { errorClass } from '@bloomneo/appkit/error';
import type { LayoutSection, QuestionType } from './questions.js';

const error = errorClass.get();

type Sec = { title: string; type: QuestionType; count: number; marksEach: number; note: string };
type Q = { id: string; type: string; marks: number; topicId: string; topicPos: number };

/** Round-robin across topics, each topic's own list rotated by `variant`. */
function spread(qs: Q[], variant: number): Q[] {
  const groups = new Map<string, Q[]>();
  for (const q of [...qs].sort((a, b) => a.topicPos - b.topicPos || a.id.localeCompare(b.id))) {
    groups.set(q.topicId, [...(groups.get(q.topicId) ?? []), q]);
  }
  const lists = [...groups.values()].map((l) => { const k = l.length ? variant % l.length : 0; return [...l.slice(k), ...l.slice(0, k)]; });
  const out: Q[] = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) if (i < l.length) out.push(l[i]);
  return out;
}

export type Generated = {
  patternId: string;
  patternName: string;
  chapterNames: string[];
  allChapters: boolean;
  questionIds: string[];
  layout: LayoutSection[];
  marks: number;
  durationMins: number;
  /** Questions the bank could not supply for the pattern. */
  missing: number;
};

export async function generatePaper(input: { patternId: string; chapterIds?: string[]; variant?: number; targetMarks?: number }): Promise<Generated> {
  const db = await databaseClass.get();
  const pattern = await db.paperPattern.findUnique({ where: { id: input.patternId } });
  if (!pattern || !pattern.isActive) throw error.badRequest('Pick one of the available paper patterns');
  const sections = pattern.sections as Sec[];

  // Chapters of the pattern's subject that teachers can use.
  const all = await db.curriculumNode.findMany({ where: { parentId: pattern.subjectId, kind: 'chapter', isActive: true }, orderBy: { position: 'asc' } });
  const wanted = input.chapterIds?.length ? all.filter((c: any) => input.chapterIds!.includes(c.id)) : all;
  if (!wanted.length) throw error.badRequest('Pick at least one chapter of this subject');

  const topics = await db.curriculumNode.findMany({ where: { parentId: { in: wanted.map((c: any) => c.id) }, kind: 'topic', isActive: true } });
  const topicPos = new Map<string, number>(topics.map((t: any) => [t.id, t.position]));
  const pool: Q[] = (await db.question.findMany({ where: { isActive: true, topicId: { in: topics.map((t: any) => t.id) } } }))
    .map((q: any) => ({ id: q.id, type: q.type, marks: q.marks, topicId: q.topicId, topicPos: topicPos.get(q.topicId) ?? 0 }));

  const variant = input.variant ?? 0;
  const used = new Set<string>();
  let missing = 0;
  const layout: LayoutSection[] = sections.map((s) => {
    const fit = spread(pool.filter((q) => q.type === s.type && q.marks === s.marksEach && !used.has(q.id)), variant).slice(0, s.count);
    fit.forEach((q) => used.add(q.id));
    missing += s.count - fit.length;
    return { title: s.title, note: s.note, type: s.type, marksEach: s.marksEach, questionIds: fit.map((q) => q.id) };
  });

  let marks = layout.reduce((n, s) => n + s.questionIds.length * s.marksEach, 0);
  const marksOf = new Map(pool.map((q) => [q.id, q.marks]));

  // A requested total ("40-mark test") wins over the pattern: top up with
  // unused questions, biggest first, or drop the biggest while over.
  const target = input.targetMarks;
  if (target) {
    for (const q of pool.filter((x) => !used.has(x.id)).sort((a, b) => b.marks - a.marks)) {
      if (marks >= target) break;
      if (marks + q.marks > target) continue;
      const home = layout.find((s) => s.type === q.type && s.marksEach === q.marks)
        ?? (layout.find((s) => s.title === 'Additional questions') ?? (layout.push({ title: 'Additional questions', note: '', type: q.type as QuestionType, marksEach: q.marks, questionIds: [] }), layout[layout.length - 1]));
      home.questionIds.push(q.id);
      used.add(q.id);
      marks += q.marks;
    }
    const byMarks = layout.flatMap((s) => s.questionIds.map((id) => ({ s, id }))).sort((a, b) => (marksOf.get(b.id) ?? 0) - (marksOf.get(a.id) ?? 0));
    for (const { s, id } of byMarks) {
      const m = marksOf.get(id) ?? 0;
      if (marks <= target) break;
      if (marks - m >= target) { s.questionIds = s.questionIds.filter((x) => x !== id); marks -= m; }
    }
    missing = 0; // the section template no longer applies
  }

  const finalLayout = layout.filter((s) => s.questionIds.length);
  const questionIds = finalLayout.flatMap((s) => s.questionIds);
  if (!questionIds.length) throw error.badRequest('The question bank has no questions for these chapters and this pattern yet');

  return {
    patternId: pattern.id,
    patternName: pattern.name,
    chapterNames: wanted.map((c: any) => c.name),
    allChapters: wanted.length === all.length,
    questionIds,
    layout: finalLayout,
    marks,
    // Shorter tests get about a minute and a half a mark; otherwise the pattern's own time.
    durationMins: target ? Math.max(30, Math.round((marks * 1.5) / 15) * 15) : pattern.durationMins,
    missing,
  };
}
