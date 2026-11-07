/**
 * Curated topic taxonomy for CBSE Class 10 Maths, built from the tagged board
 * papers (docs/content/cbse-class10-maths-knowledge.json). `from` lists the
 * raw topic names the taggers used that fold into each topic.
 */
export const TOPICS: Record<string, { name: string; from: string[] }[]> = {
  'Real Numbers': [
    { name: 'Irrational numbers and proofs', from: ['irrational numbers proof'] },
    { name: 'HCF and LCM by prime factorisation', from: ['hcf and lcm by prime factorisation'] },
    { name: 'Fundamental theorem of arithmetic', from: ['fundamental theorem of arithmetic'] },
    { name: 'HCF and LCM word problems', from: ['word problems on hcf/lcm'] },
    { name: 'HCF-LCM relation', from: ['hcf-lcm relation'] },
    { name: 'Decimal expansions and number classification', from: ['decimal expansions of rationals', 'rational and irrational sums', 'rational vs irrational classification', 'parity and powers of -1', 'operations on surds'] },
  ],
  Polynomials: [
    { name: 'Zeroes and coefficients', from: ['zeroes and coefficients relations'] },
    { name: 'Zeroes from a graph', from: ['zeroes from a graph'] },
    { name: 'Forming a polynomial from zeroes', from: ['forming a polynomial from zeroes'] },
    { name: 'Value of k from a zero', from: ['value of k from a zero'] },
    { name: 'Number and nature of zeroes', from: ['number of zeroes of a polynomial', 'number of real zeroes via discriminant'] },
    { name: 'Division algorithm and evaluation', from: ['division algorithm for polynomials', 'evaluating expressions'] },
  ],
  'Pair of Linear Equations': [
    { name: 'Consistency conditions', from: ['consistency conditions'] },
    { name: 'Word problems', from: ['word problems (age, speed, fractions, money)'] },
    { name: 'Graphical solution', from: ['graphical solution'] },
    { name: 'Substitution and elimination', from: ['solving by substitution/elimination'] },
    { name: 'Finding unknown constants', from: ['finding unknown constants'] },
  ],
  'Quadratic Equations': [
    { name: 'Word problems', from: ['word problems (speed/time, area, numbers)'] },
    { name: 'Nature of roots by discriminant', from: ['nature of roots by discriminant'] },
    { name: 'Value of k for equal roots', from: ['value of k for equal roots'] },
    { name: 'Solving by factorisation or formula', from: ['solving by factorisation or formula', 'identifying quadratic equations'] },
    { name: 'Sum and product of roots', from: ['sum and product of roots', 'forming a quadratic from roots', 'conjugate roots of quadratic with rational coefficients', 'forming equation from given roots'] },
  ],
  'Arithmetic Progressions': [
    { name: 'nth term', from: ['nth term'] },
    { name: 'Sum of n terms', from: ['sum of n terms'] },
    { name: 'Finding n', from: ['finding n'] },
    { name: 'Common difference', from: ['common difference'] },
    { name: 'Middle terms and conditions for an AP', from: ['middle terms and conditions for ap'] },
    { name: 'Word problems', from: ['word problems'] },
  ],
  Triangles: [
    { name: 'Basic proportionality theorem', from: ['basic proportionality theorem'] },
    { name: 'Proofs on similar triangles', from: ['proofs on similar triangles'] },
    { name: 'Similarity criteria', from: ['similarity criteria'] },
    { name: 'Areas of similar triangles', from: ['areas of similar triangles'] },
    { name: 'Pythagoras theorem and its converse', from: ['pythagoras theorem and its converse', 'shadow/ladder problems'] },
  ],
  'Coordinate Geometry': [
    { name: 'Distance formula', from: ['distance formula'] },
    { name: 'Section formula', from: ['section formula', 'finding a point or ratio'] },
    { name: 'Geometric shapes from coordinates', from: ['geometric shapes from coordinates'] },
    { name: 'Midpoint', from: ['midpoint'] },
    { name: 'Points on axes and distance from axes', from: ['axis intercepts and distance from axes', 'equations of lines and axes', 'distance from axes'] },
    { name: 'Collinearity and area of a triangle', from: ['collinearity and area of triangle'] },
  ],
  Trigonometry: [
    { name: 'Identities and proofs', from: ['identities and proofs'] },
    { name: 'Heights and distances', from: ['heights and distances (single or two angles of elevation/depression)'] },
    { name: 'Ratios of standard angles', from: ['trigonometric ratios of standard angles'] },
    { name: 'Evaluating expressions', from: ['evaluating expressions'] },
    { name: 'Ratio from a given ratio', from: ['ratio from a given ratio'] },
  ],
  Circles: [
    { name: 'Angle and length problems with tangents', from: ['angle and length problems with tangents'] },
    { name: 'Proofs with tangents', from: ['proofs with tangents'] },
    { name: 'Tangent perpendicular to radius', from: ['tangent perpendicular to radius'] },
    { name: 'Tangents from an external point', from: ['tangents from an external point'] },
    { name: 'Circle touching the sides of a figure', from: ['circle touching sides of a figure'] },
  ],
  'Areas Related to Circles': [
    { name: 'Area and perimeter of a sector', from: ['area and perimeter of sector', 'area and perimeter of sector; arc length'] },
    { name: 'Combination figures (shaded regions)', from: ['combination figures (shaded regions)'] },
    { name: 'Segment area', from: ['segment area'] },
    { name: 'Arc length', from: ['arc length'] },
    { name: 'Wheel, clock, garden and wiper contexts', from: ['wheel/clock/garden/wiper contexts'] },
  ],
  'Surface Areas and Volumes': [
    { name: 'Volume of combined solids', from: ['combination of solids'] },
    { name: 'Surface area of solids', from: ['surface area of combination', 'curved surface area of a single solid', 'surface area of a single solid', 'surface area of a single solid (hemisphere)'] },
    { name: 'Capacity and cost problems', from: ['capacity and cost problems'] },
    { name: 'Conversion and recasting of solids', from: ['conversion/melting and recasting', 'volume of water flowing through a channel'] },
  ],
  Statistics: [
    { name: 'Mean of grouped data', from: ['mean (direct, assumed mean, step deviation)'] },
    { name: 'Mean, median and mode relation', from: ['relation between mean/median/mode'] },
    { name: 'Median of grouped data', from: ['median of grouped data'] },
    { name: 'Missing frequency', from: ['missing frequency'] },
    { name: 'Mode of grouped data', from: ['mode of grouped data'] },
    { name: 'Cumulative frequency and ogives', from: ['cumulative frequency and ogives'] },
  ],
  Probability: [
    { name: 'Dice', from: ['dice (one or two)'] },
    { name: 'Numbers and lottery', from: ['numbers/lottery'] },
    { name: 'Complementary events', from: ['complementary events'] },
    { name: 'Classical probability basics', from: ['classical probability basics', 'leap year sundays'] },
    { name: 'Balls and bags', from: ['balls/bags'] },
    { name: 'Cards', from: ['cards'] },
    { name: 'Coins', from: ['coins'] },
  ],
};
