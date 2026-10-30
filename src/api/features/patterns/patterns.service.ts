/**
 * Paper patterns service — section layouts for each subject in the library.
 * @file src/api/features/patterns/patterns.service.ts
 *
 * Runs after the route has checked the caller is an admin.
 */
import { databaseClass } from '@bloomneo/appkit/database';
import { errorClass } from '@bloomneo/appkit/error';
import { auditService } from '../audit/audit.service.js';

const error = errorClass.get();

export const SECTION_TYPES = ['mcq', 'short', 'long', 'case'] as const;
export type Section = { title: string; type: (typeof SECTION_TYPES)[number]; count: number; marksEach: number; note: string };

export const totalMarks = (sections: Section[]) => sections.reduce((n, s) => n + s.count * s.marksEach, 0);

function cleanSections(input: unknown): Section[] {
  if (!Array.isArray(input) || input.length === 0) throw error.badRequest('Add at least one section');
  if (input.length > 12) throw error.badRequest('A pattern can have at most 12 sections');
  return input.map((raw: any, i) => {
    const title = String(raw?.title ?? '').trim();
    const count = Number(raw?.count);
    const marksEach = Number(raw?.marksEach);
    if (!title) throw error.badRequest(`Section ${i + 1} needs a title`);
    if (!SECTION_TYPES.includes(raw?.type)) throw error.badRequest(`Section "${title}" needs a question type`);
    if (!Number.isInteger(count) || count < 1 || count > 100) throw error.badRequest(`Section "${title}": questions must be a whole number from 1 to 100`);
    if (!Number.isInteger(marksEach) || marksEach < 1 || marksEach > 20) throw error.badRequest(`Section "${title}": marks each must be a whole number from 1 to 20`);
    return { title, type: raw.type, count, marksEach, note: String(raw?.note ?? '').trim() };
  });
}

/** "CBSE › Class 10 › Mathematics (Standard)" for a subject node. */
async function pathOf(db: any, id: string): Promise<string> {
  const names: string[] = [];
  let cur = await db.curriculumNode.findUnique({ where: { id } });
  while (cur) {
    names.unshift(cur.name);
    cur = cur.parentId ? await db.curriculumNode.findUnique({ where: { id: cur.parentId } }) : null;
  }
  return names.join(' › ');
}

async function shape(db: any, p: any) {
  const sections = p.sections as Section[];
  return { ...p, sections, totalMarks: totalMarks(sections), subjectPath: await pathOf(db, p.subjectId) };
}

export const patternsService = {
  async list() {
    const db = await databaseClass.get();
    const rows = await db.paperPattern.findMany({ orderBy: [{ subjectId: 'asc' }, { position: 'asc' }, { name: 'asc' }] });
    return { patterns: await Promise.all(rows.map((r: any) => shape(db, r))) };
  },

  async create(actorId: string, data: any) {
    const db = await databaseClass.get();
    const name = String(data?.name ?? '').trim();
    if (!name) throw error.badRequest('Name is required');
    const subject = data?.subjectId ? await db.curriculumNode.findUnique({ where: { id: data.subjectId } }) : null;
    if (subject?.kind !== 'subject') throw error.badRequest('Pick a subject from Categories');
    const durationMins = Number(data?.durationMins);
    if (!Number.isInteger(durationMins) || durationMins < 5 || durationMins > 600) throw error.badRequest('Duration must be between 5 and 600 minutes');
    const sections = cleanSections(data?.sections);
    if (await db.paperPattern.findFirst({ where: { subjectId: subject.id, name } })) throw error.conflict(`"${name}" already exists for this subject`);
    const last = await db.paperPattern.findFirst({ where: { subjectId: subject.id }, orderBy: { position: 'desc' }, select: { position: true } });
    const row = await db.paperPattern.create({
      data: { subjectId: subject.id, name, description: String(data?.description ?? '').trim() || null, durationMins, sections, position: (last?.position ?? -1) + 1 },
    });
    auditService.logAudit({ actorId, actorType: 'admin', action: 'pattern.create', entityType: 'paper_pattern', entityId: row.id, newValue: { name, subjectId: subject.id } });
    return shape(db, row);
  },

  async update(actorId: string, id: string, data: any) {
    const db = await databaseClass.get();
    const existing = await db.paperPattern.findUnique({ where: { id } });
    if (!existing) throw error.notFound('Pattern not found');
    const patch: any = {};
    if (data?.name !== undefined) {
      const name = String(data.name).trim();
      if (!name) throw error.badRequest('Name is required');
      if (await db.paperPattern.findFirst({ where: { subjectId: existing.subjectId, name, NOT: { id } } })) throw error.conflict(`"${name}" already exists for this subject`);
      patch.name = name;
    }
    if (data?.description !== undefined) patch.description = String(data.description).trim() || null;
    if (data?.durationMins !== undefined) {
      const d = Number(data.durationMins);
      if (!Number.isInteger(d) || d < 5 || d > 600) throw error.badRequest('Duration must be between 5 and 600 minutes');
      patch.durationMins = d;
    }
    if (data?.sections !== undefined) patch.sections = cleanSections(data.sections);
    if (typeof data?.isActive === 'boolean') patch.isActive = data.isActive;
    const row = await db.paperPattern.update({ where: { id }, data: patch });
    auditService.logAudit({ actorId, actorType: 'admin', action: 'pattern.update', entityType: 'paper_pattern', entityId: id, oldValue: { name: existing.name }, newValue: Object.keys(patch) });
    return shape(db, row);
  },

  async remove(actorId: string, id: string) {
    const db = await databaseClass.get();
    const existing = await db.paperPattern.findUnique({ where: { id } });
    if (!existing) throw error.notFound('Pattern not found');
    await db.paperPattern.delete({ where: { id } });
    auditService.logAudit({ actorId, actorType: 'admin', action: 'pattern.delete', entityType: 'paper_pattern', entityId: id, oldValue: { name: existing.name } });
    return { ok: true };
  },
};
