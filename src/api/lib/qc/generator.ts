/**
 * Paper generator: fills a pattern's sections from the question bank.
 *
 * A pattern says "Section B: 5 short-answer questions of 2 marks". For each
 * section this picks that many active questions of that type and marks from
 * the chosen chapters, one at a time, always taking the question that best
 * closes the gaps so far: chapters in proportion to how the board weights them,
 * difficulty in the board's mix for that section, and as many topics as it can.
 * It avoids the teacher's recent questions, and topics still waiting on the
 * syllabus check, unless nothing else fits. `variant` gives a different paper
 * for the same request.
 */
import { databaseClass } from '@bloomneo/appkit/database';
import { errorClass } from '@bloomneo/appkit/error';
import type { LayoutSection, QuestionType } from './questions.js';

const error = errorClass.get();

type Sec = { title: string; type: QuestionType; count: number; marksEach: number; note: string; choices?: number };
type Q = { id: string; type: string; marks: number; topicId: string; chapterId: string; complexity: string; hasAnswer: boolean; held: boolean };

/** Easy, medium, hard shares per slot, from the board papers (docs/content/QUESTION_BANK_PLAN.md). */
const MIX: Record<string, Record<string, number>> = {
  A: { easy: 0.5, medium: 0.45, hard: 0.05 },
  B: { easy: 0.25, medium: 0.7, hard: 0.05 },
  C: { easy: 0.05, medium: 0.75, hard: 0.2 },
  D: { easy: 0, medium: 0.45, hard: 0.55 },
  E: { easy: 0, medium: 0.9, hard: 0.1 },
};
const slotOf = (type: string, marks: number) => (type === 'case' ? 'E' : type === 'long' ? 'D' : type === 'short' ? (marks <= 2 ? 'B' : 'C') : 'A');
/** A multiple-choice section also takes assertion-reason questions: about 1 in 10, as on the board. */
const fitsType = (qType: string, sectionType: string) => qType === sectionType || (sectionType === 'mcq' && qType === 'assertion_reason');

/** Small seeded generator, so a given variant always builds the same paper. */
function rng(seed: number) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Picks `count` questions for a section. Each step scores every candidate on what the
 * section still lacks; a little seeded noise makes each variant a different paper.
 */
function pick(cands: Q[], count: number, slot: string, sectionType: string, weights: Map<string, number>, avoid: Set<string>, r: () => number, paperNeed: Map<string, number>): Q[] {
  const mix = MIX[slot] ?? MIX.C;
  const chapters = [...new Set(cands.map((q) => q.chapterId))];
  const totalW = chapters.reduce((n, c) => n + (weights.get(c) ?? 1), 0) || 1;
  const arWanted = sectionType === 'mcq' ? Math.round(count / 10) : 0;
  // A single chapter has no balance to keep, so let variants differ more.
  const noise = chapters.length > 1 ? 1 : 3;
  const out: Q[] = [];
  const left = [...cands];
  const n = { chapter: new Map<string, number>(), topic: new Map<string, number>(), level: new Map<string, number>() };
  let ar = 0;
  while (out.length < count && left.length) {
    const done = out.length + 1;
    let best = -1, bestScore = -Infinity;
    left.forEach((q, i) => {
      const chapterGap = ((weights.get(q.chapterId) ?? 1) / totalW) * done - (n.chapter.get(q.chapterId) ?? 0);
      const levelGap = (mix[q.complexity] ?? 0) * done - (n.level.get(q.complexity) ?? 0);
      // Marks this chapter is still owed across the whole paper, in questions of this size.
      const owed = (paperNeed.get(q.chapterId) ?? 0) / q.marks;
      let score = 3 * chapterGap + 2 * owed + 1.5 * levelGap - 1.2 * (n.topic.get(q.topicId) ?? 0) + r() * noise;
      if (arWanted) score += q.type === 'assertion_reason' ? (ar < arWanted ? 1.5 : -3) : 0;
      if (!q.hasAnswer) score -= 20; // can't be marked, so only when nothing else fits
      if (q.held) score -= 10; // waiting on the syllabus check
      if (avoid.has(q.id)) score -= 5; // this teacher used it recently
      if (score > bestScore) { bestScore = score; best = i; }
    });
    const [q] = left.splice(best, 1);
    out.push(q);
    n.chapter.set(q.chapterId, (n.chapter.get(q.chapterId) ?? 0) + 1);
    paperNeed.set(q.chapterId, (paperNeed.get(q.chapterId) ?? 0) - q.marks);
    n.topic.set(q.topicId, (n.topic.get(q.topicId) ?? 0) + 1);
    n.level.set(q.complexity, (n.level.get(q.complexity) ?? 0) + 1);
    if (q.type === 'assertion_reason') ar++;
  }
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

export async function generatePaper(input: { patternId: string; chapterIds?: string[]; variant?: number; targetMarks?: number; avoidIds?: string[]; includeDrafts?: boolean }): Promise<Generated> {
  const db = await databaseClass.get();
  const pattern = await db.paperPattern.findUnique({ where: { id: input.patternId } });
  if (!pattern || !pattern.isActive) throw error.badRequest('Pick one of the available paper patterns');
  const sections = pattern.sections as Sec[];

  // Chapters of the pattern's subject that teachers can use.
  const all = await db.curriculumNode.findMany({ where: { parentId: pattern.subjectId, kind: 'chapter', isActive: true }, orderBy: { position: 'asc' } });
  const wanted = input.chapterIds?.length ? all.filter((c: any) => input.chapterIds!.includes(c.id)) : all;
  if (!wanted.length) throw error.badRequest('Pick at least one chapter of this subject');

  const topics = await db.curriculumNode.findMany({ where: { parentId: { in: wanted.map((c: any) => c.id) }, kind: 'topic', isActive: true } });
  const chapterOf = new Map<string, string>(topics.map((t: any) => [t.id, t.parentId]));
  const pool: Q[] = (await db.question.findMany({
    where: {
      topicId: { in: topics.map((t: any) => t.id) },
      // Drafts are AI-written questions a teacher has not approved yet. Faculty can opt in to see them.
      ...(input.includeDrafts ? { OR: [{ isActive: true }, { reviewStatus: 'draft' }] } : { isActive: true }),
    },
    include: { pattern: { select: { scope: true, targetEasy: true, targetMedium: true, targetHard: true } } },
  })).map((q: any) => ({
    id: q.id, type: q.type, marks: q.marks, topicId: q.topicId, chapterId: chapterOf.get(q.topicId) ?? '', complexity: q.complexity, hasAnswer: !!q.answer,
    // No pattern, or a topic in doubt with no target: kept out unless nothing else fits.
    held: !q.pattern || (q.pattern.scope === 'verify' && q.pattern.targetEasy + q.pattern.targetMedium + q.pattern.targetHard === 0),
  }));

  // How often the board asks each chapter in each section, in today's paper format.
  const nameToId = new Map<string, string>(wanted.map((c: any) => [c.name, c.id]));
  const counts = await db.boardQuestion.groupBy({ by: ['chapter', 'section'], where: { year: { gte: 2023 } }, _count: { _all: true }, _sum: { marks: true } });
  const weightsFor = (slot: string) => {
    const m = new Map<string, number>(wanted.map((c: any) => [c.id, 0.5])); // every chosen chapter stays possible
    for (const c of counts as { chapter: string; section: string; _count: { _all: number } }[]) {
      const id = nameToId.get(c.chapter);
      if (id && c.section === slot) m.set(id, c._count._all + 0.5);
    }
    return m;
  };

  // Each chapter's share of the whole paper, in marks.
  const paperMarks = sections.reduce((n, s) => n + s.count * s.marksEach, 0);
  const chapterMarks = new Map<string, number>(wanted.map((c: any) => [c.id, 1]));
  for (const c of counts as { chapter: string; _sum: { marks: number | null } }[]) {
    const id = nameToId.get(c.chapter);
    if (id) chapterMarks.set(id, (chapterMarks.get(id) ?? 0) + (c._sum.marks ?? 0));
  }
  const allMarks = [...chapterMarks.values()].reduce((n, v) => n + v, 0) || 1;
  const paperNeed = new Map<string, number>([...chapterMarks].map(([id, m]) => [id, (m / allMarks) * paperMarks]));

  const variant = input.variant ?? 0;
  const r = rng(variant + 1);
  const avoid = new Set(input.avoidIds ?? []);
  const used = new Set<string>();
  let missing = 0;
  // Big-mark sections choose first, so the many 1-mark questions can even out the chapters.
  const byMarks = sections.map((s, i) => ({ s, i })).sort((a, b) => b.s.marksEach - a.s.marksEach);
  const built: LayoutSection[] = [];
  for (const { s, i } of byMarks) {
    const slot = slotOf(s.type, s.marksEach);
    const fits = (q: Q) => fitsType(q.type, s.type) && q.marks === s.marksEach && !used.has(q.id);
    const chosen = pick(pool.filter(fits), s.count, slot, s.type, weightsFor(slot), avoid, r, paperNeed);
    chosen.forEach((q) => used.add(q.id));
    missing += s.count - chosen.length;

    // Internal choice: an OR alternative of the same kind, from the same chapter where possible.
    const alternates: Record<string, string> = {};
    const offers = [...chosen].sort(() => r() - 0.5).slice(0, s.choices ?? 0);
    for (const q of offers) {
      const options = pool.filter((x) => fits(x) && x.hasAnswer && !x.held && x.type === q.type);
      const alt = options.filter((x) => x.chapterId === q.chapterId && x.topicId !== q.topicId)[0] ?? options.find((x) => x.chapterId === q.chapterId) ?? options[0];
      if (alt) { alternates[q.id] = alt.id; used.add(alt.id); }
    }
    built[i] = { title: s.title, note: s.note, type: s.type, marksEach: s.marksEach, questionIds: chosen.map((q) => q.id), ...(Object.keys(alternates).length ? { alternates } : {}) };
  }
  const layout = built;

  let marks = layout.reduce((n, s) => n + s.questionIds.length * s.marksEach, 0);
  const marksOf = new Map(pool.map((q) => [q.id, q.marks]));

  // A requested total ("40-mark test") wins over the pattern: top up with
  // unused questions, biggest first, or drop the biggest while over.
  const target = input.targetMarks;
  if (target) {
    const rest = pool.filter((x) => !used.has(x.id)).sort((a, b) => Number(a.held) - Number(b.held) || Number(b.hasAnswer) - Number(a.hasAnswer) || r() - 0.5);
    for (const q of rest.sort((a, b) => b.marks - a.marks)) {
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
      if (marks - m >= target) {
        s.questionIds = s.questionIds.filter((x) => x !== id);
        if (s.alternates) delete s.alternates[id];
        marks -= m;
      }
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
