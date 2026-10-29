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

const TYPES = ['mcq', 'short', 'long', 'case'];
const COMPLEXITIES = ['easy', 'medium', 'hard'];
const PAGE = 50;

const REVIEW = ['draft', 'approved', 'rejected', 'flagged'];

type Input = {
  topicId?: string; type?: string; complexity?: string; marks?: number; text?: string; options?: string[] | null; answer?: string | null;
  isActive?: boolean; competency?: boolean; reviewStatus?: string; reviewNote?: string | null;
};

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
  return out;
}

async function shape(db: any, q: any, usedIds?: Set<string>) {
  return { ...q, topicPath: await pathOf(db, q.topicId), used: usedIds?.has(q.id) ?? undefined };
}

async function usedQuestionIds(db: any): Promise<Set<string>> {
  const papers = await db.paper.findMany({ select: { questionIds: true } });
  return new Set(papers.flatMap((p: any) => p.questionIds as string[]));
}

export const questionsService = {
  async list(f: { nodeId?: string; topicId?: string; chapterId?: string; type?: string; complexity?: string; status?: string; review?: string; q?: string; page?: number }) {
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
    const page = Math.max(1, Math.floor(f.page ?? 1));

    const { reviewStatus: _tab, ...scope } = where;
    const [total, rows, used, reviewCounts] = await Promise.all([
      db.question.count({ where }),
      db.question.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (page - 1) * PAGE, take: PAGE }),
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
