/**
 * Categories service — the board > class > subject > chapter > topic tree.
 * @file src/api/features/library/library.service.ts
 *
 * Runs after the route has checked the caller is an admin.
 */
import { databaseClass } from '@bloomneo/appkit/database';
import { errorClass } from '@bloomneo/appkit/error';
import { auditService } from '../audit/audit.service.js';

const error = errorClass.get();

export const KINDS = ['board', 'class', 'subject', 'chapter', 'topic'] as const;
export type Kind = (typeof KINDS)[number];

export const QUESTION_TYPES = ['mcq', 'short', 'long', 'case'] as const;
export const COMPLEXITIES = ['easy', 'medium', 'hard'] as const;

type Row = {
  id: string; kind: string; name: string; parentId: string | null; position: number; isActive: boolean;
  questionTypes: string[] | null; complexity: string | null; marks: number | null;
};

type TopicFields = { questionTypes?: string[] | null; complexity?: string | null; marks?: number | null };

/** Validates the topic-only fields. Undefined means "not provided"; null clears. */
function topicFields(data: TopicFields): TopicFields {
  const out: TopicFields = {};
  if (data.questionTypes !== undefined) {
    if (data.questionTypes === null) out.questionTypes = null;
    else {
      if (!Array.isArray(data.questionTypes) || data.questionTypes.some((t) => !(QUESTION_TYPES as readonly string[]).includes(t))) throw error.badRequest('Unknown question type');
      out.questionTypes = [...new Set(data.questionTypes)];
    }
  }
  if (data.complexity !== undefined) {
    if (data.complexity !== null && !(COMPLEXITIES as readonly string[]).includes(data.complexity)) throw error.badRequest('Complexity must be easy, medium or hard');
    out.complexity = data.complexity;
  }
  if (data.marks !== undefined) {
    if (data.marks !== null && (!Number.isInteger(data.marks) || data.marks < 1 || data.marks > 20)) throw error.badRequest('Marks must be a whole number from 1 to 20');
    out.marks = data.marks;
  }
  return out;
}

export const libraryService = {
  /** The whole tree, nested. Small enough (hundreds of rows) to send in one go. Each node carries how many questions sit under it. */
  async tree() {
    const db = await databaseClass.get();
    const [rows, counts]: [Row[], { topicId: string; _count: { _all: number } }[]] = await Promise.all([
      db.curriculumNode.findMany({
        select: { id: true, kind: true, name: true, parentId: true, position: true, isActive: true, questionTypes: true, complexity: true, marks: true },
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
      }),
      db.question.groupBy({ by: ['topicId'], _count: { _all: true } }),
    ]);
    const perTopic = new Map(counts.map((c) => [c.topicId, c._count._all]));
    const byParent = new Map<string | null, Row[]>();
    for (const r of rows) byParent.set(r.parentId, [...(byParent.get(r.parentId) ?? []), r]);
    type Node = Row & { questionCount: number; children: Node[] };
    const build = (parentId: string | null): Node[] =>
      (byParent.get(parentId) ?? []).map((r) => {
        const children = build(r.id);
        // Questions are tagged to topics; every level above shows the total beneath it.
        const questionCount = r.kind === 'topic' ? perTopic.get(r.id) ?? 0 : children.reduce((n, c) => n + c.questionCount, 0);
        return { ...r, questionCount, children };
      });
    return { nodes: build(null) };
  },

  async create(actorId: string, data: { kind?: string; name?: string; parentId?: string | null } & TopicFields) {
    const db = await databaseClass.get();
    const name = data.name?.trim();
    if (!name) throw error.badRequest('Name is required');
    const kind = data.kind as Kind;
    const level = KINDS.indexOf(kind);
    if (level < 0) throw error.badRequest('Unknown level');

    let parentId: string | null = null;
    if (level > 0) {
      const parent = data.parentId ? await db.curriculumNode.findUnique({ where: { id: data.parentId } }) : null;
      if (!parent) throw error.badRequest(`A ${kind} needs a ${KINDS[level - 1]} to sit under`);
      if (parent.kind !== KINDS[level - 1]) throw error.badRequest(`A ${kind} goes under a ${KINDS[level - 1]}, not a ${parent.kind}`);
      parentId = parent.id;
    }

    const clash = await db.curriculumNode.findFirst({ where: { parentId, name } });
    if (clash) throw error.conflict(`"${name}" already exists here`);
    const last = await db.curriculumNode.findFirst({ where: { parentId }, orderBy: { position: 'desc' }, select: { position: true } });
    const extra = kind === 'topic' ? topicFields(data) : {};
    const node = await db.curriculumNode.create({ data: { kind, name, parentId, position: (last?.position ?? -1) + 1, ...(extra as any) } });
    auditService.logAudit({ actorId, actorType: 'admin', action: 'library.create', entityType: 'curriculum', entityId: node.id, newValue: { kind, name } });
    return node;
  },

  async update(actorId: string, id: string, data: { name?: string; isActive?: boolean } & TopicFields) {
    const db = await databaseClass.get();
    const existing = await db.curriculumNode.findUnique({ where: { id } });
    if (!existing) throw error.notFound('Not found');
    const patch: Record<string, unknown> = {};
    if (typeof data.name === 'string') {
      const name = data.name.trim();
      if (!name) throw error.badRequest('Name is required');
      const clash = await db.curriculumNode.findFirst({ where: { parentId: existing.parentId, name, NOT: { id } } });
      if (clash) throw error.conflict(`"${name}" already exists here`);
      patch.name = name;
    }
    if (typeof data.isActive === 'boolean') patch.isActive = data.isActive;
    if (existing.kind === 'topic') Object.assign(patch, topicFields(data));
    const node = await db.curriculumNode.update({ where: { id }, data: patch });
    auditService.logAudit({ actorId, actorType: 'admin', action: 'library.update', entityType: 'curriculum', entityId: id, oldValue: { name: existing.name, isActive: existing.isActive }, newValue: patch });
    return node;
  },

  /** Deletes the node and everything under it (cascade). */
  async remove(actorId: string, id: string) {
    const db = await databaseClass.get();
    const existing = await db.curriculumNode.findUnique({ where: { id } });
    if (!existing) throw error.notFound('Not found');
    // Questions are tagged to topics; refuse rather than orphan or silently drop them.
    let level = [id];
    const subtree = [id];
    while (level.length) {
      level = (await db.curriculumNode.findMany({ where: { parentId: { in: level } }, select: { id: true } })).map((n: { id: string }) => n.id);
      subtree.push(...level);
    }
    const tagged = await db.question.count({ where: { topicId: { in: subtree } } });
    if (tagged) throw error.conflict(`${tagged} question${tagged === 1 ? ' is' : 's are'} tagged under "${existing.name}". Move or delete them in the question bank first.`);
    await db.curriculumNode.delete({ where: { id } });
    auditService.logAudit({ actorId, actorType: 'admin', action: 'library.delete', entityType: 'curriculum', entityId: id, oldValue: { kind: existing.kind, name: existing.name } });
    return { ok: true };
  },
};
