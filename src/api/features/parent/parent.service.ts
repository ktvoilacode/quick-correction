/**
 * Parent service — link a child with the teacher's invite code, see their
 * papers, upload answer pages, and read the marks.
 *
 * Every query is scoped through student.parentId, so a parent can only ever
 * reach their own children's work.
 */
import { databaseClass } from '@bloomneo/appkit/database';
import { errorClass } from '@bloomneo/appkit/error';
import { claimAppRole } from '../../lib/qc/app-role.js';
import { questionsByIds } from '../../lib/qc/question-bank.js';
import { queueMarking } from '../../lib/qc/marking.js';
import { storePage, MAX_PAGES } from '../../lib/qc/pages.js';

const error = errorClass.get();

export const parentService = {
  async link(parentId: string, inviteCode?: string) {
    const code = inviteCode?.trim().toUpperCase();
    if (!code) throw error.badRequest('Enter the invite code from the teacher');
    const db = await databaseClass.get();
    const student = await db.student.findUnique({ where: { inviteCode: code } });
    if (!student) throw error.notFound('No student with that invite code');
    if (student.parentId && student.parentId !== parentId) throw error.conflict('This child is already linked to another parent account');
    await claimAppRole(parentId, 'parent');
    await db.student.update({ where: { id: student.id }, data: { parentId } });
    return { id: student.id, name: student.name, className: student.className };
  },

  async children(parentId: string) {
    const db = await databaseClass.get();
    return db.student.findMany({
      where: { parentId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, className: true, teacher: { select: { name: true } } },
    });
  },

  async submissions(parentId: string, studentId?: string) {
    const db = await databaseClass.get();
    return db.submission.findMany({
      where: { student: { parentId }, ...(studentId ? { studentId } : {}) },
      orderBy: [{ dueDate: 'desc' }],
      select: {
        id: true, status: true, dueDate: true, submittedAt: true, score: true, max: true, reviewed: true,
        paper: { select: { id: true, title: true, pattern: true, durationMins: true } },
        student: { select: { id: true, name: true } },
      },
    });
  },

  async submission(parentId: string, id: string) {
    const db = await databaseClass.get();
    const sub = await db.submission.findFirst({
      where: { id, student: { parentId } },
      include: { paper: true, student: { select: { id: true, name: true, className: true } } },
    });
    if (!sub) throw error.notFound('Paper not found');
    return { ...sub, questions: questionsByIds(sub.paper.questionIds as string[]) };
  },

  /** Add one photographed page. Allowed until the paper is submitted. */
  async addPage(parentId: string, id: string, contentType: string | undefined, body: unknown) {
    const sub = await this.submission(parentId, id);
    if (sub.status !== 'assigned') throw error.badRequest('This paper has already been submitted');
    const pages = sub.pages as string[];
    if (pages.length >= MAX_PAGES) throw error.badRequest(`At most ${MAX_PAGES} pages per paper`);
    const key = await storePage(sub.id, contentType, body);
    const db = await databaseClass.get();
    await db.submission.update({ where: { id: sub.id }, data: { pages: [...pages, key] } });
    return { pages: pages.length + 1 };
  },

  /** Done adding pages: lock the submission and queue it for marking. */
  async submit(parentId: string, id: string) {
    const db = await databaseClass.get();
    const sub = await this.submission(parentId, id);
    if (!(sub.pages as string[]).length) throw error.badRequest('Add at least one page first');
    const { count } = await db.submission.updateMany({
      where: { id: sub.id, status: 'assigned' },
      data: { status: 'evaluating', submittedAt: new Date() },
    });
    if (!count) throw error.badRequest('This paper has already been submitted');
    try {
      await queueMarking(sub.id);
    } catch (err) {
      // Never leave a paper stuck on "being marked" with no job behind it.
      await db.submission.update({ where: { id: sub.id }, data: { status: 'assigned', submittedAt: null } });
      throw err;
    }
    return { ok: true, status: 'evaluating' };
  },
};
