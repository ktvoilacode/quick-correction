/**
 * Tutor service — the teacher's side: students, papers, assigning, and
 * checking the marks before parents rely on them.
 *
 * Every query is scoped by teacherId in the WHERE clause, so an id belonging
 * to another teacher reads as "not found" rather than leaking.
 */
import { randomInt } from 'node:crypto';
import { databaseClass } from '@bloomneo/appkit/database';
import { errorClass } from '@bloomneo/appkit/error';
import { buildPaper, questionsByIds, totalMarks, CHAPTERS } from '../../lib/qc/question-bank.js';
import type { QuestionResult } from '../../lib/qc/marking.js';

const error = errorClass.get();

// No 0/O or 1/I — the code gets read aloud and typed on phones.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newInviteCode = () => Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');

// appkit's database client is untyped, so query results get these shapes.
type SubStat = { status: string; score: number | null; max: number | null };
type StudentRow = { id: string; name: string; className: string; inviteCode: string; parentId: string | null; submissions: SubStat[] };
type PaperRow = { id: string; title: string; pattern: string; questionIds: unknown; submissions: { status: string }[] };

const pct = (s: { score: number | null; max: number | null }) => (s.max ? Math.round(((s.score ?? 0) / s.max) * 100) : 0);

export const tutorService = {
  chapters() {
    return [...CHAPTERS];
  },

  async listStudents(teacherId: string) {
    const db = await databaseClass.get();
    const students = await db.student.findMany({
      where: { teacherId },
      orderBy: { name: 'asc' },
      include: { submissions: { select: { status: true, score: true, max: true } } },
    });
    return (students as StudentRow[]).map(({ submissions, ...s }) => {
      const marked = submissions.filter((x: SubStat) => x.status === 'evaluated');
      return {
        ...s,
        parentLinked: !!s.parentId,
        average: marked.length ? Math.round(marked.reduce((n, x) => n + pct(x), 0) / marked.length) : null,
        pending: submissions.filter((x) => x.status === 'assigned').length,
      };
    });
  },

  async addStudent(teacherId: string, input: { name?: string; className?: string }) {
    const name = input.name?.trim();
    if (!name) throw error.badRequest('Student name is required');
    const db = await databaseClass.get();
    for (let i = 0; i < 5; i++) {
      try {
        return await db.student.create({ data: { teacherId, name, className: input.className?.trim() || '10', inviteCode: newInviteCode() } });
      } catch (err: any) {
        if (err?.code !== 'P2002') throw err; // retry only on an invite-code clash
      }
    }
    throw error.serverError('Could not create a unique invite code');
  },

  async listPapers(teacherId: string) {
    const db = await databaseClass.get();
    const papers = await db.paper.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      include: { submissions: { select: { status: true } } },
    });
    return (papers as PaperRow[]).map(({ submissions, questionIds, ...p }) => {
      const qs = questionsByIds(questionIds as string[]);
      return {
        ...p,
        questions: qs.length,
        marks: totalMarks(qs),
        assigned: submissions.length,
        corrected: submissions.filter((x) => x.status === 'evaluated').length,
      };
    });
  },

  async createPaper(teacherId: string, input: { chapters?: string[]; pattern?: string; targetMarks?: number; title?: string; variant?: number }) {
    const chapters = (input.chapters?.length ? input.chapters : [...CHAPTERS]).filter((c) => (CHAPTERS as readonly string[]).includes(c));
    if (!chapters.length) throw error.badRequest('Pick at least one chapter from the list');
    const pattern = input.pattern === 'board' ? 'board' : 'unit';
    const targetMarks = input.targetMarks && input.targetMarks > 0 ? Math.min(Math.round(input.targetMarks), 80) : undefined;
    const qs = buildPaper(chapters, pattern, input.variant ?? 0, targetMarks);
    if (!qs.length) throw error.badRequest('The question bank has no questions for these chapters yet');
    const marks = totalMarks(qs);
    const db = await databaseClass.get();
    const paper = await db.paper.create({
      data: {
        teacherId,
        title: input.title?.trim() || (pattern === 'board' ? 'Board Practice Paper' : `Unit Test — ${chapters.length === 1 ? chapters[0] : `${chapters.length} chapters`}`),
        pattern,
        // Board papers run 3 hours; shorter tests get ~1.5 minutes a mark.
        durationMins: pattern === 'board' ? 180 : Math.max(30, Math.round((marks * 1.5) / 15) * 15),
        targetMarks,
        questionIds: qs.map((q) => q.id),
      },
    });
    // The bank can fall short of a requested total; say so instead of hiding it.
    return { ...paper, marks, shortBy: targetMarks && marks < targetMarks ? targetMarks - marks : 0 };
  },

  async getPaper(teacherId: string, id: string) {
    const db = await databaseClass.get();
    const paper = await db.paper.findFirst({
      where: { id, teacherId },
      include: { submissions: { include: { student: { select: { id: true, name: true } } } } },
    });
    if (!paper) throw error.notFound('Paper not found');
    const questions = questionsByIds(paper.questionIds as string[]);
    return { ...paper, questions, marks: totalMarks(questions) };
  },

  async assignPaper(teacherId: string, paperId: string, input: { studentIds?: string[]; dueDate?: string }) {
    const due = input.dueDate ? new Date(input.dueDate) : null;
    if (!due || Number.isNaN(due.getTime())) throw error.badRequest('A valid dueDate is required');
    const db = await databaseClass.get();
    const paper = await db.paper.findFirst({ where: { id: paperId, teacherId }, select: { id: true } });
    if (!paper) throw error.notFound('Paper not found');
    // Only this teacher's students; an empty list means the whole batch.
    const students = await db.student.findMany({
      where: { teacherId, ...(input.studentIds?.length ? { id: { in: input.studentIds } } : {}) },
      select: { id: true },
    });
    if (!students.length) throw error.badRequest('No students to assign to');
    await db.$transaction((students as { id: string }[]).map((s) => db.submission.upsert({
      where: { paperId_studentId: { paperId, studentId: s.id } },
      create: { paperId, studentId: s.id, dueDate: due },
      update: { dueDate: due },
    })));
    return { assigned: students.length, dueDate: due };
  },

  async toReview(teacherId: string) {
    const db = await databaseClass.get();
    return db.submission.findMany({
      where: { status: 'evaluated', reviewed: false, paper: { teacherId } },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true, score: true, max: true, submittedAt: true,
        paper: { select: { id: true, title: true } },
        student: { select: { id: true, name: true } },
      },
    });
  },

  async getSubmission(teacherId: string, id: string) {
    const db = await databaseClass.get();
    const sub = await db.submission.findFirst({
      where: { id, paper: { teacherId } },
      include: { paper: true, student: { select: { id: true, name: true, className: true } } },
    });
    if (!sub) throw error.notFound('Submission not found');
    return { ...sub, questions: questionsByIds(sub.paper.questionIds as string[]) };
  },

  async approve(teacherId: string, id: string) {
    const db = await databaseClass.get();
    const { count } = await db.submission.updateMany({ where: { id, status: 'evaluated', paper: { teacherId } }, data: { reviewed: true } });
    if (!count) throw error.notFound('No marked submission with that id');
    return { ok: true };
  },

  /** The teacher corrects the AI's marks; saving also approves. */
  async correctMarks(teacherId: string, id: string, changes: { questionId: string; awarded: number; feedback?: string }[]) {
    if (!Array.isArray(changes) || !changes.length) throw error.badRequest('results must be a non-empty list');
    const sub = await this.getSubmission(teacherId, id);
    if (sub.status !== 'evaluated') throw error.badRequest('This submission has not been marked yet');
    const results = (sub.results as QuestionResult[]).map((r) => {
      const c = changes.find((x) => x.questionId === r.questionId);
      if (!c) return r;
      const awarded = Math.round(Number(c.awarded));
      if (!Number.isFinite(awarded) || awarded < 0 || awarded > r.max) throw error.badRequest(`Marks for ${r.questionId} must be 0–${r.max}`);
      return { ...r, awarded, feedback: c.feedback?.trim() || r.feedback };
    });
    const score = results.reduce((n, r) => n + r.awarded, 0);
    const db = await databaseClass.get();
    await db.submission.update({ where: { id: sub.id }, data: { results, score, reviewed: true } });
    return { ok: true, score, max: sub.max };
  },
};
