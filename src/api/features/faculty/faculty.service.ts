/**
 * Faculty service — board-format papers for preview and download. Nothing is
 * saved: a faculty member sets a paper, looks it over and downloads it.
 * @file src/api/features/faculty/faculty.service.ts
 */
import { errorClass } from '@bloomneo/appkit/error';
import { databaseClass } from '@bloomneo/appkit/database';
import { generatePaper } from '../../lib/qc/generator.js';
import { questionsByIds } from '../../lib/qc/questions.js';
import { tutorService } from '../tutor/tutor.service.js';

const error = errorClass.get();

export const facultyService = {
  /** Subjects, paper patterns and chapters to choose from, plus how much of the bank is approved. */
  async setup() {
    const db = await databaseClass.get();
    const [{ subjects }, approved, drafts] = await Promise.all([
      tutorService.setup(),
      db.question.count({ where: { isActive: true } }),
      db.question.count({ where: { reviewStatus: 'draft' } }),
    ]);
    return { subjects, bank: { approved, drafts } };
  },

  async preview(input: { patternId?: string; chapterIds?: string[]; variant?: number; targetMarks?: number; includeDrafts?: boolean }) {
    if (!input.patternId) throw error.badRequest('Pick a paper pattern');
    const targetMarks = input.targetMarks && input.targetMarks > 0 ? Math.min(Math.round(input.targetMarks), 200) : undefined;
    const gen = await generatePaper({
      patternId: input.patternId, chapterIds: input.chapterIds, variant: Math.max(0, Math.floor(Number(input.variant) || 0)),
      targetMarks, includeDrafts: !!input.includeDrafts,
    });
    const questions = await questionsByIds(gen.questionIds, { layout: gen.layout, withAnswers: true });
    return {
      title: gen.allChapters ? gen.patternName : `${gen.patternName} — ${gen.chapterNames.length === 1 ? gen.chapterNames[0] : `${gen.chapterNames.length} chapters`}`,
      pattern: gen.patternName, durationMins: gen.durationMins, marks: gen.marks, chapterNames: gen.chapterNames,
      shortBy: targetMarks && gen.marks < targetMarks ? targetMarks - gen.marks : 0,
      missingQuestions: gen.missing, layout: gen.layout, questions,
      drafts: questions.filter((q) => q.draft || q.alternate?.draft).length,
    };
  },
};
