# LaTeX conventions for question text

Questions, options and answers are plain text with maths between dollar signs, rendered by KaTeX
(`src/web/shared/MathText.tsx`). Everything outside the dollars is ordinary text.

- Inline maths: `$x^2 - 3x - 10 = 0$`. Display (own line): `$$ \frac{a}{b} $$` (rare; prefer inline).
- A literal dollar sign is `\$` (we use rupees, so it should almost never appear).
- Fractions `\frac{a}{b}`; roots `\sqrt{x}`, `\sqrt[3]{x}`; powers `x^{2}`; subscripts `a_{n}`.
- Angles and shapes: `\angle ABC`, `\triangle ABC`, `\parallel`, `\perp`, `\sim`, `\cong`, degrees `30^\circ`.
- Greek: `\alpha \beta \gamma \theta \pi`. Operators: `\times \div \pm \le \ge \ne \approx`.
- Trig functions: `\sin \cos \tan \cot \sec`, and `\operatorname{cosec}` for cosec. Powers: `\sin^{2}\theta`.
- Units inside maths use `\text{ cm}`, `\text{ m}^{2}`, `\text{ km/h}`; units in running text stay plain words.
- Points and coordinates are maths: `$A(3, -6)$`. Use a normal hyphen-minus `-` in LaTeX, not the Unicode minus.
- Keep ₹ and normal words outside the dollars. Do not put sentences inside `$...$`.
- Multiple choice options are separate strings; wrap each option's maths in its own `$...$`.
- Tables of grouped data stay as plain-text rows (`Class: 10-20 | 20-30 ...`), only the numbers and symbols inside a cell, if any, are maths.
