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
import { questionsByIds, totalMarks, type LayoutSection } from '../../lib/qc/questions.js';
import { generatePaper } from '../../lib/qc/generator.js';
import { queueMarking } from '../../lib/qc/marking.js';
import { storePage, MAX_PAGES } from '../../lib/qc/pages.js';
import type { QuestionResult } from '../../lib/qc/marking.js';

const error = errorClass.get();

// No 0/O or 1/I — the code gets read aloud and typed on phones.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newInviteCode = () => Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');

// appkit's database client is untyped, so query results get these shapes.
type SubStat = { status: string; score: number | null; max: number | null };
type StudentRow = { id: string; name: string; className: string; inviteCode: string; parentId: string | null; submissions: SubStat[] };
type PaperRow = { id: string; title: string; pattern: string; questionIds: unknown; layout: unknown; submissions: { status: string }[] };

const pct = (s: { score: number | null; max: number | null }) => (s.max ? Math.round(((s.score ?? 0) / s.max) * 100) : 0);

export const tutorService = {
  /**
   * What a teacher can build a paper from: every subject in the categories
   * with its active paper patterns and chapters.
   */
  async setup() {
    const db = await databaseClass.get();
    const subjects = await db.curriculumNode.findMany({ where: { kind: 'subject', isActive: true }, orderBy: { position: 'asc' } });
    const out = [];
    for (const subject of subjects) {
      const [patterns, chapters] = await Promise.all([
        db.paperPattern.findMany({ where: { subjectId: subject.id, isActive: true }, orderBy: { position: 'asc' } }),
        db.curriculumNode.findMany({ where: { parentId: subject.id, kind: 'chapter', isActive: true }, orderBy: { position: 'asc' }, select: { id: true, name: true } }),
      ]);
      if (!patterns.length || !chapters.length) continue;
      const cls = subject.parentId ? await db.curriculumNode.findUnique({ where: { id: subject.parentId } }) : null;
      const board = cls?.parentId ? await db.curriculumNode.findUnique({ where: { id: cls.parentId } }) : null;
      out.push({
        id: subject.id,
        name: subject.name,
        label: [board?.name, cls?.name, subject.name].filter(Boolean).join(' › '),
        patterns: patterns.map((p: any) => ({
          id: p.id, name: p.name, description: p.description, durationMins: p.durationMins, sections: p.sections,
          totalMarks: (p.sections as any[]).reduce((n, s) => n + s.count * s.marksEach, 0),
        })),
        chapters,
      });
    }
    return { subjects: out };
  },

  /** Chapter names of the first subject, for older clients. */
  async chapters() {
    const { subjects } = await this.setup();
    return (subjects[0]?.chapters ?? []).map((c: { name: string }) => c.name);
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

  async updateStudent(teacherId: string, id: string, input: { name?: string; className?: string }) {
    const db = await databaseClass.get();
    const data: { name?: string; className?: string } = {};
    if (input.name !== undefined) { data.name = input.name.trim(); if (!data.name) throw error.badRequest('Student name is required'); }
    if (input.className !== undefined) data.className = input.className.trim() || '10';
    const r = await db.student.updateMany({ where: { id, teacherId }, data });
    if (!r.count) throw error.notFound('Student not found');
    return { ok: true };
  },

  /** Removes the student and their papers' submissions with them. */
  async removeStudent(teacherId: string, id: string) {
    const db = await databaseClass.get();
    const r = await db.student.deleteMany({ where: { id, teacherId } });
    if (!r.count) throw error.notFound('Student not found');
    return { ok: true };
  },

  /** One student per line: "Name" or "Name, class". Lines without a class get `className`. */
  async importStudents(teacherId: string, input: { text?: string; className?: string }) {
    const lines = (input.text ?? '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 200);
    if (!lines.length) throw error.badRequest('Add at least one name');
    const fallback = input.className?.trim() || '10';
    let added = 0;
    for (const line of lines) {
      const [name, cls] = line.split(',').map((x) => x.trim());
      if (!name) continue;
      await this.addStudent(teacherId, { name, className: cls || fallback });
      added++;
    }
    return { added };
  },

  async listPapers(teacherId: string) {
    const db = await databaseClass.get();
    const papers = await db.paper.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      include: { submissions: { select: { status: true } } },
    });
    return Promise.all((papers as PaperRow[]).map(async ({ submissions, questionIds, layout, ...p }) => {
      const qs = await questionsByIds(questionIds as string[], { layout: layout as LayoutSection[] | null });
      return {
        ...p,
        questions: qs.length,
        marks: totalMarks(qs),
        assigned: submissions.length,
        corrected: submissions.filter((x) => x.status === 'evaluated').length,
      };
    }));
  },

  async createPaper(
    _teacherId: string,
    input: { patternId?: string; chapterIds?: string[]; targetMarks?: number; title?: string; variant?: number; preview?: boolean },
  ) {
    const teacherId = _teacherId;
    if (!input.patternId) throw error.badRequest('Pick a paper pattern');
    const targetMarks = input.targetMarks && input.targetMarks > 0 ? Math.min(Math.round(input.targetMarks), 200) : undefined;
    const gen = await generatePaper({ patternId: input.patternId, chapterIds: input.chapterIds, variant: input.variant ?? 0, targetMarks });
    const title = input.title?.trim() || (gen.allChapters ? gen.patternName : `${gen.patternName} — ${gen.chapterNames.length === 1 ? gen.chapterNames[0] : `${gen.chapterNames.length} chapters`}`);
    const shortBy = targetMarks && gen.marks < targetMarks ? targetMarks - gen.marks : 0;

    // A dry run: show what the generator would set, save nothing. The teacher
    // can shuffle (a new variant) until they like it, then create it for real.
    if (input.preview) {
      return {
        preview: true, title, pattern: gen.patternName, durationMins: gen.durationMins, marks: gen.marks,
        shortBy, missingQuestions: gen.missing, layout: gen.layout,
        questions: await questionsByIds(gen.questionIds, { layout: gen.layout, withAnswers: true }),
      };
    }

    const db = await databaseClass.get();
    const paper = await db.paper.create({
      data: {
        teacherId,
        title,
        pattern: gen.patternName,
        patternId: gen.patternId,
        durationMins: gen.durationMins,
        targetMarks,
        questionIds: gen.questionIds,
        layout: gen.layout,
      },
    });
    // The bank can fall short of what was asked; say so instead of hiding it.
    return {
      ...paper,
      marks: gen.marks,
      shortBy,
      missingQuestions: gen.missing,
    };
  },

  async getPaper(teacherId: string, id: string) {
    const db = await databaseClass.get();
    const paper = await db.paper.findFirst({
      where: { id, teacherId },
      include: { submissions: { include: { student: { select: { id: true, name: true } } } } },
    });
    if (!paper) throw error.notFound('Paper not found');
    // The teacher sees the answer key; parents never do (their route leaves it out).
    const questions = await questionsByIds(paper.questionIds as string[], { layout: paper.layout as LayoutSection[] | null, withAnswers: true });
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
    return { ...sub, questions: await questionsByIds(sub.paper.questionIds as string[], { layout: sub.paper.layout as LayoutSection[] | null, withAnswers: true }) };
  },

  /**
   * The teacher uploads an answer page for a student: how a paper is tried out
   * without a parent account. Same limits and storage as the parent's upload.
   */
  async addPage(teacherId: string, id: string, contentType: string | undefined, body: unknown) {
    const sub = await this.getSubmission(teacherId, id);
    if (sub.status !== 'assigned') throw error.badRequest('This paper has already been submitted');
    const pages = sub.pages as string[];
    if (pages.length >= MAX_PAGES) throw error.badRequest(`At most ${MAX_PAGES} pages per paper`);
    const key = await storePage(sub.id, contentType, body);
    const db = await databaseClass.get();
    await db.submission.update({ where: { id: sub.id }, data: { pages: [...pages, key] } });
    return { pages: pages.length + 1 };
  },

  /** Lock the submission and queue it for marking. */
  async submit(teacherId: string, id: string) {
    const db = await databaseClass.get();
    const sub = await this.getSubmission(teacherId, id);
    if (!(sub.pages as string[]).length) throw error.badRequest('Add at least one page first');
    const { count } = await db.submission.updateMany({
      where: { id: sub.id, status: 'assigned' },
      data: { status: 'evaluating', submittedAt: new Date() },
    });
    if (!count) throw error.badRequest('This paper has already been submitted');
    try {
      await queueMarking(sub.id);
    } catch (err) {
      await db.submission.update({ where: { id: sub.id }, data: { status: 'assigned', submittedAt: null } });
      throw err;
    }
    return { ok: true, status: 'evaluating' };
  },

  /** Run the marker again: a failed submission, or marks the teacher does not trust. Edits made since are replaced. */
  async remark(teacherId: string, id: string) {
    const db = await databaseClass.get();
    const sub = await this.getSubmission(teacherId, id);
    if (!(sub.pages as string[]).length) throw error.badRequest('There are no answer pages to mark');
    const { count } = await db.submission.updateMany({
      where: { id: sub.id, status: { in: ['failed', 'evaluated'] } },
      data: { status: 'evaluating', reviewed: false, summary: null },
    });
    if (!count) throw error.badRequest('Only a marked or failed paper can be marked again');
    try {
      await queueMarking(sub.id);
    } catch (err) {
      await db.submission.update({ where: { id: sub.id }, data: { status: sub.status, reviewed: sub.reviewed, summary: sub.summary } });
      throw err;
    }
    return { ok: true, status: 'evaluating' };
  },

  async deletePaper(teacherId: string, id: string) {
    const db = await databaseClass.get();
    const { count } = await db.paper.deleteMany({ where: { id, teacherId } });
    if (!count) throw error.notFound('Paper not found');
    return { ok: true };
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
