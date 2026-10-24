/**
 * CBSE Class 10 Mathematics question bank — prototype seed data.
 *
 * Section shape follows the CBSE board pattern (80 marks, 3 hours):
 *   A  MCQ / assertion-reason   1 mark
 *   B  very short answer        2 marks
 *   C  short answer             3 marks
 *   D  long answer              5 marks
 *   E  case study               4 marks
 */

export type SectionId = 'A' | 'B' | 'C' | 'D' | 'E';

export type Question = {
  id: string;
  section: SectionId;
  chapter: string;
  text: string;
  options?: string[];
  marks: number;
};

export const SECTIONS: Record<SectionId, { title: string; marks: number; count: number; note: string }> = {
  A: { title: 'Section A', marks: 1, count: 20, note: 'Multiple choice and assertion–reason questions of 1 mark each.' },
  B: { title: 'Section B', marks: 2, count: 5, note: 'Very short answer questions of 2 marks each.' },
  C: { title: 'Section C', marks: 3, count: 6, note: 'Short answer questions of 3 marks each.' },
  D: { title: 'Section D', marks: 5, count: 4, note: 'Long answer questions of 5 marks each.' },
  E: { title: 'Section E', marks: 4, count: 3, note: 'Case-study based questions of 4 marks each.' },
};

export const SUBJECTS = [
  { id: 'maths', name: 'Mathematics (Standard)', ready: true },
  { id: 'science', name: 'Science', ready: false },
  { id: 'sst', name: 'Social Science', ready: false },
  { id: 'english', name: 'English Language & Literature', ready: false },
] as const;

export const CHAPTERS = [
  'Real Numbers',
  'Polynomials',
  'Pair of Linear Equations',
  'Quadratic Equations',
  'Arithmetic Progressions',
  'Triangles',
  'Coordinate Geometry',
  'Trigonometry',
  'Circles',
  'Areas Related to Circles',
  'Surface Areas and Volumes',
  'Statistics',
  'Probability',
] as const;

const q = (
  id: string, section: SectionId, chapter: string, text: string, options?: string[],
): Question => ({ id, section, chapter, text, options, marks: SECTIONS[section].marks });

export const QUESTION_BANK: Question[] = [
  // ── Section A ───────────────────────────────────────────────────────────
  q('a1', 'A', 'Real Numbers', 'The HCF of 96 and 404 is:', ['4', '8', '12', '16']),
  q('a2', 'A', 'Real Numbers', 'If the LCM of two numbers is 180 and their HCF is 6, and one number is 30, the other number is:', ['36', '30', '24', '18']),
  q('a3', 'A', 'Polynomials', 'The number of zeroes of the polynomial whose graph cuts the x-axis at 3 points is:', ['1', '2', '3', '0']),
  q('a4', 'A', 'Polynomials', 'If one zero of x² − 5x + k is 2, the value of k is:', ['3', '6', '−6', '10']),
  q('a5', 'A', 'Pair of Linear Equations', 'The pair of equations x + 2y = 5 and 2x + 4y = 10 has:', ['a unique solution', 'no solution', 'infinitely many solutions', 'exactly two solutions']),
  q('a6', 'A', 'Quadratic Equations', 'The roots of x² − 4 = 0 are:', ['±2', '±4', '2 only', '4 only']),
  q('a7', 'A', 'Quadratic Equations', 'The discriminant of 2x² − 4x + 3 = 0 is:', ['−8', '8', '−4', '40']),
  q('a8', 'A', 'Arithmetic Progressions', 'The 10th term of the AP 2, 7, 12, … is:', ['47', '52', '45', '50']),
  q('a9', 'A', 'Arithmetic Progressions', 'The common difference of the AP 1/3, 5/3, 9/3, … is:', ['1/3', '4/3', '1', '5/3']),
  q('a10', 'A', 'Triangles', 'If ΔABC ~ ΔPQR with AB/PQ = 2/3, the ratio of their perimeters is:', ['4 : 9', '2 : 3', '3 : 2', '9 : 4']),
  q('a11', 'A', 'Coordinate Geometry', 'The distance between the points (0, 0) and (6, 8) is:', ['8', '10', '12', '14']),
  q('a12', 'A', 'Coordinate Geometry', 'The midpoint of the segment joining (2, 4) and (6, 8) is:', ['(4, 6)', '(3, 5)', '(8, 12)', '(2, 2)']),
  q('a13', 'A', 'Trigonometry', 'The value of sin²30° + cos²30° is:', ['0', '1/2', '1', '2']),
  q('a14', 'A', 'Trigonometry', 'If tan θ = 1, then θ equals:', ['30°', '45°', '60°', '90°']),
  q('a15', 'A', 'Circles', 'The number of tangents that can be drawn to a circle from an external point is:', ['1', '2', '3', 'infinite']),
  q('a16', 'A', 'Areas Related to Circles', 'The area of a sector of angle 90° in a circle of radius 14 cm is:', ['154 cm²', '616 cm²', '77 cm²', '308 cm²']),
  q('a17', 'A', 'Surface Areas and Volumes', 'The volume of a cube of edge 4 cm is:', ['16 cm³', '48 cm³', '64 cm³', '96 cm³']),
  q('a18', 'A', 'Statistics', 'The mode of 2, 3, 3, 5, 7, 3, 5 is:', ['2', '3', '5', '7']),
  q('a19', 'A', 'Probability', 'The probability of getting a head when a fair coin is tossed once is:', ['0', '1/4', '1/2', '1']),
  q('a20', 'A', 'Real Numbers', 'Assertion (A): √2 is irrational. Reason (R): The square root of every prime is irrational.', [
    'Both A and R are true and R explains A',
    'Both A and R are true but R does not explain A',
    'A is true but R is false',
    'A is false but R is true',
  ]),

  // ── Section B ───────────────────────────────────────────────────────────
  q('b1', 'B', 'Real Numbers', 'Find the LCM and HCF of 26 and 91 by prime factorisation.'),
  q('b2', 'B', 'Pair of Linear Equations', 'Solve: 2x + 3y = 11 and 2x − 4y = −24.'),
  q('b3', 'B', 'Triangles', 'In ΔABC, DE ∥ BC. If AD = 2 cm, DB = 3 cm and AE = 4 cm, find EC.'),
  q('b4', 'B', 'Trigonometry', 'Evaluate: 2 tan²45° + cos²30° − sin²60°.'),
  q('b5', 'B', 'Circles', 'Prove that the tangents drawn at the ends of a diameter of a circle are parallel.'),
  q('b6', 'B', 'Probability', 'A die is thrown once. Find the probability of getting a prime number.'),

  // ── Section C ───────────────────────────────────────────────────────────
  q('c1', 'C', 'Real Numbers', 'Prove that √5 is irrational.'),
  q('c2', 'C', 'Polynomials', 'Find the zeroes of 6x² − 3 − 7x and verify the relationship between the zeroes and the coefficients.'),
  q('c3', 'C', 'Arithmetic Progressions', 'How many terms of the AP 9, 17, 25, … must be taken to give a sum of 636?'),
  q('c4', 'C', 'Coordinate Geometry', 'Find the ratio in which the line segment joining (−3, 10) and (6, −8) is divided by (−1, 6).'),
  q('c5', 'C', 'Trigonometry', 'Prove that (sin θ + cosec θ)² + (cos θ + sec θ)² = 7 + tan²θ + cot²θ.'),
  q('c6', 'C', 'Areas Related to Circles', 'A chord of a circle of radius 10 cm subtends a right angle at the centre. Find the area of the minor segment. (Use π = 3.14)'),
  q('c7', 'C', 'Statistics', 'Find the mean of the following data: class 0–10, 10–20, 20–30, 30–40, 40–50 with frequencies 5, 8, 15, 16, 6.'),

  // ── Section D ───────────────────────────────────────────────────────────
  q('d1', 'D', 'Quadratic Equations', 'A train travels 360 km at a uniform speed. If the speed had been 5 km/h more, it would have taken 1 hour less. Find the speed of the train.'),
  q('d2', 'D', 'Triangles', 'State and prove the Basic Proportionality Theorem.'),
  q('d3', 'D', 'Trigonometry', 'From the top of a 75 m high lighthouse, the angles of depression of two ships are 30° and 45°. If one ship is exactly behind the other on the same side, find the distance between the ships.'),
  q('d4', 'D', 'Surface Areas and Volumes', 'A solid is in the shape of a cone standing on a hemisphere, both of radius 1 cm, and the height of the cone equals its radius. Find the volume of the solid in terms of π.'),
  q('d5', 'D', 'Statistics', 'Find the median of the following distribution: marks 0–10, 10–20, 20–30, 30–40, 40–50, 50–60 with number of students 5, 8, 20, 15, 7, 5.'),

  // ── Section E ───────────────────────────────────────────────────────────
  q('e1', 'E', 'Arithmetic Progressions', 'Case study — A school auditorium has 20 seats in the first row, 22 in the second, 24 in the third, and so on for 30 rows. (i) How many seats are in the 15th row? (ii) How many seats are there in total? (iii) Which row has 50 seats?'),
  q('e2', 'E', 'Coordinate Geometry', 'Case study — Students plant saplings at points A(2, 3), B(6, 3) and C(6, 6) on a grid of the school garden. (i) Find AB. (ii) Find AC. (iii) What kind of triangle is ABC?'),
  q('e3', 'E', 'Probability', 'Case study — A bag contains 5 red, 8 green and 7 white balls. One ball is drawn at random. Find the probability that it is (i) red (ii) not green (iii) red or white.'),
];

/** Build a paper by picking questions per section from the chosen chapters. */
export function buildPaper(chapters: string[], pattern: 'board' | 'unit'): Question[] {
  const pool = QUESTION_BANK.filter((x) => chapters.includes(x.chapter));
  const out: Question[] = [];
  (Object.keys(SECTIONS) as SectionId[]).forEach((s) => {
    const want = pattern === 'board' ? SECTIONS[s].count : Math.ceil(SECTIONS[s].count / 3);
    out.push(...pool.filter((x) => x.section === s).slice(0, want));
  });
  return out;
}

export const totalMarks = (qs: Question[]) => qs.reduce((n, x) => n + x.marks, 0);
