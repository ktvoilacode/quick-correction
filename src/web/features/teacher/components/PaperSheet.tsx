/**
 * PaperSheet — a question paper laid out the way it is printed: header, then
 * each section with its instruction and numbered questions. With `showAnswers`
 * the answer key appears under each question (teacher only).
 */
import { Fragment } from 'react';
import { MathText } from '@/shared/MathText';
import type { LayoutSection, Question } from '../lib/types';

type Props = {
  title: string;
  durationMins: number;
  questions: Question[];
  layout?: LayoutSection[] | null;
  showAnswers?: boolean;
};

export function PaperSheet({ title, durationMins, questions, layout, showAnswers }: Props) {
  const total = questions.reduce((n, q) => n + q.marks, 0);
  // Sections in the order they appear on the paper.
  const order: string[] = [];
  for (const q of questions) if (!order.includes(q.section)) order.push(q.section);
  let number = 0;

  return (
    <article className="rounded-xl border border-border bg-card p-5 sm:p-8 print:border-0 print:p-0">
      <header className="mb-6 border-b border-border pb-4 text-center">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Time allowed: {durationMins} minutes · Maximum marks: {total}</p>
      </header>

      {order.map((section) => {
        const qs = questions.filter((q) => q.section === section);
        const note = layout?.find((s) => s.title === section)?.note;
        const marks = qs.reduce((n, q) => n + q.marks, 0);
        return (
          <section key={section} className="mb-8 last:mb-0">
            <h3 className="text-center font-semibold">{section}</h3>
            <p className="mb-4 text-center text-xs italic text-muted-foreground">{note ? `${note} ` : ''}({qs.length} question{qs.length === 1 ? '' : 's'}, {marks} marks)</p>
            <ol className="space-y-5">
              {qs.map((q) => {
                number += 1;
                return (
                  <li key={q.id} className="flex gap-3">
                    <span className="w-6 shrink-0 text-right text-sm font-medium">{number}.</span>
                    <div className="min-w-0 flex-1 text-sm leading-relaxed">
                      <p className="whitespace-pre-wrap"><MathText text={q.text} /> <span className="whitespace-nowrap text-muted-foreground">[{q.marks}]</span></p>
                      {q.options && (
                        <ol className="mt-2 grid gap-1 sm:grid-cols-2">
                          {q.options.map((o, i) => (
                            <Fragment key={i}>
                              <li className="flex gap-2"><span className="text-muted-foreground">{String.fromCharCode(65 + i)})</span><span><MathText text={String(o)} /></span></li>
                            </Fragment>
                          ))}
                        </ol>
                      )}
                      {showAnswers && (
                        <div className="mt-2 rounded-lg border border-border bg-muted/50 p-3 print:hidden">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Answer</p>
                          {q.answer ? <p className="whitespace-pre-wrap"><MathText text={q.answer} /></p> : <p className="text-muted-foreground">No answer key recorded for this question.</p>}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </article>
  );
}
