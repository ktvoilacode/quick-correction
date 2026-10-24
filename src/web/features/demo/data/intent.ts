/**
 * Reads a teacher's typed request — "40-mark paper on trig and circles, due
 * Friday" — into the slots the assistant needs. Rule-based stand-in for the
 * LLM that will do this in the real app (as tool-call arguments).
 */
import { CHAPTERS } from './questions';

export type Pattern = 'board' | 'unit';

export type Parsed = {
  wantsPaper: boolean;
  wantsAssign: boolean;
  chapters: string[];
  allChapters: boolean;
  pattern?: Pattern;
  marks?: number;
  due?: string;
};

/** Order matters: the more specific phrase must win ("areas related to circles" before "circle"). */
const ALIASES: [RegExp, (typeof CHAPTERS)[number]][] = [
  [/real numbers?|hcf|lcm|irrational/, 'Real Numbers'],
  [/polynomials?|zeroes/, 'Polynomials'],
  [/linear equations?|pair of linear|simultaneous/, 'Pair of Linear Equations'],
  [/quadratics?/, 'Quadratic Equations'],
  [/arithmetic progressions?|\bap\b|\baps\b|progressions?/, 'Arithmetic Progressions'],
  [/triangles?|similarity|bpt/, 'Triangles'],
  [/coordinate|distance formula|section formula/, 'Coordinate Geometry'],
  [/trig|heights? and distances?/, 'Trigonometry'],
  [/areas? related|sector|segment/, 'Areas Related to Circles'],
  [/(?<!areas related to )circles?|tangents?/, 'Circles'],
  [/surface areas?|volumes?|mensuration/, 'Surface Areas and Volumes'],
  [/statistics|stats|mean|median|mode/, 'Statistics'],
  [/probabilit/, 'Probability'],
];

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function dueFrom(word: 'tomorrow' | 'next week' | (typeof DAYS)[number], from = new Date()): string {
  const d = new Date(from);
  if (word === 'tomorrow') d.setDate(d.getDate() + 1);
  else if (word === 'next week') d.setDate(d.getDate() + 7);
  else {
    const target = DAYS.indexOf(word);
    const diff = (target - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
  }
  return iso(d);
}

export function parse(raw: string): Parsed {
  const t = raw.toLowerCase();
  const allChapters = /all chapters|full syllabus|whole syllabus|entire syllabus|everything/.test(t);
  const chapters = allChapters ? [...CHAPTERS] : [...new Set(ALIASES.filter(([re]) => re.test(t)).map(([, c]) => c))];

  let pattern: Pattern | undefined;
  if (/board|pre-?board|full paper|full-length|80[ -]?marks?|3 ?h(ou)?rs?|mock/.test(t)) pattern = 'board';
  else if (/unit|quick|short|class test|weekly|slip test|\b(2[05]|3[05]|40)[ -]?marks?\b|30 ?min|1 ?h(ou)?r/.test(t)) pattern = 'unit';

  const m = t.match(/\b(\d{2,3})[ -]?(marks?|mark paper|m\b)/);
  const marks = m ? Number(m[1]) : undefined;
  if (marks) pattern = marks >= 70 ? 'board' : 'unit';

  let due: string | undefined;
  if (/tomorrow/.test(t)) due = dueFrom('tomorrow');
  else if (/next week/.test(t)) due = dueFrom('next week');
  else {
    const day = DAYS.find((d) => t.includes(d) || t.includes(d.slice(0, 3) + ' '));
    if (day) due = dueFrom(day as (typeof DAYS)[number]);
  }

  return {
    wantsPaper: /paper|test|exam|quiz|worksheet|assessment|questions?|make|create|generate|prepare|set\b/.test(t) || chapters.length > 0 || !!pattern,
    wantsAssign: /assign|send|share|give (it )?to|due/.test(t) || !!due,
    chapters,
    allChapters,
    pattern,
    marks,
    due,
  };
}

export const fmtDue = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
