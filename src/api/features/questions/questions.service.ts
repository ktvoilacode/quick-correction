/**
 * Question bank service — admin CRUD over the `questions` table.
 * @file src/api/features/questions/questions.service.ts
 *
 * Every question is tagged to a topic of the categories. A question that a
 * paper already uses is hidden rather than deleted, so old papers keep their
 * text. Runs after the route has checked the caller is an admin.
 */
import { databaseClass } from '@bloomneo/appkit/database';
import { errorClass } from '@bloomneo/appkit/error';
import { auditService } from '../audit/audit.service.js';

const error = errorClass.get();

const TYPES = ['mcq', 'assertion_reason', 'short', 'long', 'case'];
const MAX_SVG = 200_000;
const COMPLEXITIES = ['easy', 'medium', 'hard'];
const PAGE = 50;

const REVIEW = ['draft', 'approved', 'rejected', 'flagged'];

type Input = {
  topicId?: string; type?: string; complexity?: string; marks?: number; text?: string; options?: string[] | null; answer?: string | null;
  isActive?: boolean; competency?: boolean; reviewStatus?: string; reviewNote?: string | null;
  patternId?: string | null; figureSvg?: string | null; figureAlt?: string | null;
  parts?: { label: string; marks: number; text: string; answer?: string }[] | null;
  markingSteps?: { step: string; marks: number }[] | null;
};

/** A figure is shown as an image, but anything that could run or fetch is refused here too. */
function cleanSvg(raw: unknown): string {
  const svg = String(raw ?? '').trim();
  if (svg.length > MAX_SVG) throw error.badRequest('The figure is too large. Keep it under 200 KB.');
  if (!/^(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(svg) || !/<\/svg>\s*$/i.test(svg)) throw error.badRequest('The figure must be an SVG image');
  if (/<script|<foreignObject|<iframe|<embed|<object|<image|\son[a-z]+\s*=|javascript:|(?:xlink:)?href\s*=\s*["'](?!#)|url\(\s*["']?(?!#)/i.test(svg)) {
    throw error.badRequest('The figure can only hold drawing shapes: no scripts, links or outside images');
  }
  return svg;
}

async function pathOf(db: any, topicId: string) {
  const names: string[] = [];
  let cur = await db.curriculumNode.findUnique({ where: { id: topicId } });
  while (cur) {
    names.unshift(cur.name);
    cur = cur.parentId ? await db.curriculumNode.findUnique({ where: { id: cur.parentId } }) : null;
  }
  return names;
}

/** Validates what was sent; `partial` allows leaving fields out (update). */
async function clean(db: any, data: Input, partial: boolean) {
  const out: Record<string, unknown> = {};
  if (!partial || data.topicId !== undefined) {
    const topic = data.topicId ? await db.curriculumNode.findUnique({ where: { id: data.topicId } }) : null;
    if (topic?.kind !== 'topic') throw error.badRequest('Tag the question to a topic from Categories');
    out.topicId = topic.id;
  }
  if (!partial || data.type !== undefined) {
    if (!TYPES.includes(data.type as string)) throw error.badRequest('Pick a question type');
    out.type = data.type;
  }
  if (!partial || data.complexity !== undefined) {
    if (!COMPLEXITIES.includes(data.complexity as string)) throw error.badRequest('Complexity must be easy, medium or hard');
    out.complexity = data.complexity;
  }
  if (!partial || data.marks !== undefined) {
    if (!Number.isInteger(data.marks) || (data.marks as number) < 1 || (data.marks as number) > 20) throw error.badRequest('Marks must be a whole number from 1 to 20');
    out.marks = data.marks;
  }
  if (!partial || data.text !== undefined) {
    const text = String(data.text ?? '').trim();
    if (!text) throw error.badRequest('The question text is required');
    out.text = text;
  }
  if (data.options !== undefined) {
    if (data.options === null) out.options = null;
    else {
      const opts = (Array.isArray(data.options) ? data.options : []).map((o) => String(o).trim()).filter(Boolean);
      if (opts.length && opts.length < 2) throw error.badRequest('Give at least two options, or none');
      out.options = opts.length ? opts : null;
    }
  }
  if (data.patternId !== undefined) {
    if (data.patternId && !(await db.questionPattern.findUnique({ where: { id: data.patternId } }))) throw error.badRequest('Unknown question pattern');
    out.patternId = data.patternId || null;
  }
  if (data.figureSvg !== undefined) out.figureSvg = data.figureSvg ? cleanSvg(data.figureSvg) : null;
  if (data.figureAlt !== undefined) out.figureAlt = data.figureAlt === null ? null : String(data.figureAlt).trim() || null;
  if (out.figureSvg && !out.figureAlt && !data.figureAlt) throw error.badRequest('Describe the figure, for people who cannot see it');
  if (data.parts !== undefined) {
    if (data.parts === null) out.parts = null;
    else {
      const parts = (Array.isArray(data.parts) ? data.parts : []).map((p) => ({ label: String(p?.label ?? '').trim(), marks: Number(p?.marks), text: String(p?.text ?? '').trim(), answer: String(p?.answer ?? '').trim() }));
      if (parts.some((p) => !p.label || !p.text || !Number.isInteger(p.marks) || p.marks < 1)) throw error.badRequest('Each part needs a label, text and whole marks');
      out.parts = parts.length ? parts : null;
    }
  }
  if (data.markingSteps !== undefined) {
    if (data.markingSteps === null) out.markingSteps = null;
    else {
      const steps = (Array.isArray(data.markingSteps) ? data.markingSteps : []).map((s) => ({ step: String(s?.step ?? '').trim(), marks: Number(s?.marks) }));
      if (steps.some((s) => !s.step || !(s.marks > 0))) throw error.badRequest('Each marking step needs a description and marks');
      out.markingSteps = steps.length ? steps : null;
    }
  }
  if (data.answer !== undefined) out.answer = data.answer === null ? null : String(data.answer).trim() || null;
  if (typeof data.isActive === 'boolean') out.isActive = data.isActive;
  if (typeof data.competency === 'boolean') out.competency = data.competency;
  if (data.reviewNote !== undefined) out.reviewNote = data.reviewNote === null ? null : String(data.reviewNote).trim() || null;
  if (data.reviewStatus !== undefined) {
    if (!REVIEW.includes(data.reviewStatus)) throw error.badRequest('Unknown review status');
    out.reviewStatus = data.reviewStatus;
    // Only approved questions are live; anything else is held back from papers.
    out.isActive = data.reviewStatus === 'approved';
  }
  // Parts and steps must add up to the question's marks.
  const marks = (out.marks ?? data.marks) as number | undefined;
  const sum = (l: unknown) => (l as { marks: number }[]).reduce((n, x) => n + x.marks, 0);
  if (marks && out.parts && sum(out.parts) !== marks) throw error.badRequest(`The parts add up to ${sum(out.parts)} marks, but the question is worth ${marks}`);
  if (marks && out.markingSteps && Math.abs(sum(out.markingSteps) - marks) > 1e-6) throw error.badRequest(`The marking steps add up to ${sum(out.markingSteps)} marks, but the question is worth ${marks}`);
  return out;
}

async function shape(db: any, q: any, usedIds?: Set<string>) {
  const { pattern, ...rest } = q;
  return { ...rest, topicPath: await pathOf(db, q.topicId), used: usedIds?.has(q.id) ?? undefined, askedIn: (pattern?.seenIn as string[] | undefined) ?? [], lastAsked: pattern?.lastAsked ?? null };
}

async function usedQuestionIds(db: any): Promise<Set<string>> {
  const papers = await db.paper.findMany({ select: { questionIds: true, layout: true } });
  return new Set(papers.flatMap((p: any) => [
    ...(p.questionIds as string[]),
    ...((p.layout as { alternates?: Record<string, string> }[] | null) ?? []).flatMap((s) => Object.values(s.alternates ?? {})),
  ]));
}

export const questionsService = {
  /** Chapter > topic > pattern, each with target, have and gap at every difficulty. */
  async coverage() {
    const db = await databaseClass.get();
    const LEVELS = ['easy', 'medium', 'hard'] as const;
    const patterns = await db.questionPattern.findMany({
      include: { topic: { select: { id: true, name: true, position: true, parent: { select: { id: true, name: true, position: true } } } } },
      orderBy: [{ id: 'asc' }],
    });
    const live = await db.question.groupBy({ by: ['patternId', 'complexity'], where: { isActive: true, patternId: { not: null } }, _count: { _all: true } });
    const have = new Map<string, number>();
    for (const r of live as { patternId: string; complexity: string; _count: { _all: number } }[]) have.set(`${r.patternId}|${r.complexity}`, r._count._all);
    const blank = () => ({ easy: 0, medium: 0, hard: 0 });
    const add = (to: Record<string, number>, from: Record<string, number>) => { for (const k of LEVELS) to[k] += from[k]; };
    const chapters = new Map<string, any>();
    for (const p of patterns as any[]) {
      const target = { easy: p.targetEasy, medium: p.targetMedium, hard: p.targetHard };
      const got = { easy: have.get(`${p.id}|easy`) ?? 0, medium: have.get(`${p.id}|medium`) ?? 0, hard: have.get(`${p.id}|hard`) ?? 0 };
      const gap = { easy: Math.max(0, target.easy - got.easy), medium: Math.max(0, target.medium - got.medium), hard: Math.max(0, target.hard - got.hard) };
      const ch = p.topic.parent;
      if (!chapters.has(ch.id)) chapters.set(ch.id, { id: ch.id, name: ch.name, position: ch.position, target: blank(), have: blank(), gap: blank(), topics: new Map() });
      const c = chapters.get(ch.id);
      if (!c.topics.has(p.topic.id)) c.topics.set(p.topic.id, { id: p.topic.id, name: p.topic.name, position: p.topic.position, scope: p.scope, target: blank(), have: blank(), gap: blank(), figures: 0, lastAsked: null, patterns: [] });
      const t = c.topics.get(p.topic.id);
      for (const o of [c, t]) { add(o.target, target); add(o.have, got); add(o.gap, gap); }
      if (p.needsFigure) t.figures += target.easy + target.medium + target.hard;
      t.lastAsked = Math.max(t.lastAsked ?? 0, p.lastAsked ?? 0) || null;
      t.patterns.push({ id: p.id, slot: p.slot, pattern: p.pattern, sample: p.sample, needsFigure: p.needsFigure, seenIn: p.seenIn, target, have: got, gap });
    }
    const list = [...chapters.values()].sort((a, b) => a.position - b.position).map((c) => ({ ...c, topics: [...c.topics.values()].sort((a: any, b: any) => a.position - b.position) }));
    const totals = { target: blank(), have: blank(), gap: blank() };
    for (const c of list) { add(totals.target, c.target); add(totals.have, c.have); add(totals.gap, c.gap); }
    return { chapters: list, totals };
  },

  async list(f: { nodeId?: string; topicId?: string; chapterId?: string; type?: string; complexity?: string; status?: string; review?: string; q?: string; page?: number; asked?: string; pattern?: string }) {
    const db = await databaseClass.get();
    const where: any = {};
    if (f.nodeId) {
      // Any level of the tree: the node itself and everything beneath it.
      const nodes = await db.curriculumNode.findMany({ select: { id: true, parentId: true } });
      const kids = new Map<string, string[]>();
      for (const n of nodes as { id: string; parentId: string | null }[]) if (n.parentId) kids.set(n.parentId, [...(kids.get(n.parentId) ?? []), n.id]);
      const ids: string[] = [];
      for (let stack = [f.nodeId]; stack.length;) { const id = stack.pop()!; ids.push(id); stack.push(...(kids.get(id) ?? [])); }
      where.topicId = { in: ids };
    } else if (f.topicId) where.topicId = f.topicId;
    else if (f.chapterId) where.topic = { parentId: f.chapterId };
    if (f.type && TYPES.includes(f.type)) where.type = f.type;
    if (f.complexity && COMPLEXITIES.includes(f.complexity)) where.complexity = f.complexity;
    if (f.status === 'active') where.isActive = true;
    if (f.status === 'hidden') where.isActive = false;
    if (f.review && REVIEW.includes(f.review)) where.reviewStatus = f.review;
    if (f.q?.trim()) where.text = { contains: f.q.trim() };
    if (f.pattern) where.patternId = f.pattern;
    // Board history comes from the question's pattern.
    if (f.asked === 'recent') where.pattern = { lastAsked: { gte: new Date().getFullYear() - 2 } };
    if (f.asked === 'never') where.OR = [{ patternId: null }, { pattern: { timesAsked: 0 } }];
    const page = Math.max(1, Math.floor(f.page ?? 1));

    const { reviewStatus: _tab, ...scope } = where;
    const [total, rows, used, reviewCounts] = await Promise.all([
      db.question.count({ where }),
      db.question.findMany({ where, include: { pattern: { select: { seenIn: true, lastAsked: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (page - 1) * PAGE, take: PAGE }),
      usedQuestionIds(db),
      db.question.groupBy({ by: ['reviewStatus'], where: scope, _count: { _all: true } }),
    ]);
    const counts = Object.fromEntries(REVIEW.map((s) => [s, 0]));
    for (const c of reviewCounts as { reviewStatus: string; _count: { _all: number } }[]) counts[c.reviewStatus] = c._count._all;
    return { questions: await Promise.all(rows.map((r: any) => shape(db, r, used))), total, page, pageSize: PAGE, counts };
  },

  async create(actorId: string, data: Input) {
    const db = await databaseClass.get();
    const row = await db.question.create({ data: (await clean(db, data, false)) as any });
    auditService.logAudit({ actorId, actorType: 'admin', action: 'question.create', entityType: 'question', entityId: row.id, newValue: { topicId: row.topicId, type: row.type, marks: row.marks } });
    return shape(db, row);
  },

  async update(actorId: string, id: string, data: Input) {
    const db = await databaseClass.get();
    const existing = await db.question.findUnique({ where: { id } });
    if (!existing) throw error.notFound('Question not found');
    const patch = await clean(db, data, true);
    const row = await db.question.update({ where: { id }, data: patch as any });
    auditService.logAudit({ actorId, actorType: 'admin', action: 'question.update', entityType: 'question', entityId: id, newValue: Object.keys(patch) });
    return shape(db, row);
  },

  /** Approve or reject many at once (the review queue). Approved ones go live. */
  async review(actorId: string, ids: string[], status: string, note?: string) {
    if (!Array.isArray(ids) || !ids.length) throw error.badRequest('Pick at least one question');
    if (ids.length > 500) throw error.badRequest('At most 500 at a time');
    if (!['approved', 'rejected'].includes(status)) throw error.badRequest('Status must be approved or rejected');
    const db = await databaseClass.get();
    const { count } = await db.question.updateMany({
      where: { id: { in: ids } },
      data: { reviewStatus: status, isActive: status === 'approved', ...(note !== undefined ? { reviewNote: note || null } : {}) },
    });
    auditService.logAudit({ actorId, actorType: 'admin', action: `question.${status}`, entityType: 'question', entityId: ids[0], newValue: { count } });
    return { updated: count };
  },

  async remove(actorId: string, id: string) {
    const db = await databaseClass.get();
    const existing = await db.question.findUnique({ where: { id } });
    if (!existing) throw error.notFound('Question not found');
    if ((await usedQuestionIds(db)).has(id)) throw error.conflict('A paper already uses this question. Hide it instead of deleting it.');
    await db.question.delete({ where: { id } });
    auditService.logAudit({ actorId, actorType: 'admin', action: 'question.delete', entityType: 'question', entityId: id, oldValue: { text: existing.text.slice(0, 80) } });
    return { ok: true };
  },
};
