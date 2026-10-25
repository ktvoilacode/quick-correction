/**
 * Sample earnings for the teacher's Earnings tab.
 *
 * Pricing isn't decided yet. The working idea: a parent buys a pack of
 * practice papers and the tutor gets a share of each pack, paid out monthly
 * (Razorpay Route). These numbers are placeholders to show the screen.
 */
export const PACK = { price: 999, papers: 10, tutorShare: 600 };

export const PAYOUT = { date: '2026-11-01' };

/** Last six months of the tutor's share, oldest first. October matches the three October packs below. */
export const MONTHLY = [
  { month: 'May', amount: 0 },
  { month: 'Jun', amount: 600 },
  { month: 'Jul', amount: 600 },
  { month: 'Aug', amount: 1200 },
  { month: 'Sep', amount: 1200 },
  { month: 'Oct', amount: 1800 },
];

/** Packs bought by parents of this tutor's students. */
export const PACKS = [
  { studentId: 's1', boughtOn: '2026-10-03', used: 4 },
  { studentId: 's2', boughtOn: '2026-09-12', used: 8 },
  { studentId: 's4', boughtOn: '2026-10-09', used: 3 },
  { studentId: 's6', boughtOn: '2026-10-15', used: 2 },
];

/** Minutes of checking the AI saves per marked paper. */
export const MINUTES_SAVED_PER_PAPER = 12;

export const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;
