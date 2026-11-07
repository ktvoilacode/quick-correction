/**
 * A question's printed figure. The SVG is shown through an image, so nothing in
 * it can run, and on white so it reads in dark mode and prints the same.
 */
export function QuestionFigure({ svg, alt, className = '' }: { svg?: string | null; alt?: string | null; className?: string }) {
  if (!svg) return null;
  return (
    <img
      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
      alt={alt || 'Figure for this question'}
      className={`my-2 block max-h-64 max-w-full rounded-md bg-white p-2 ${className}`}
    />
  );
}
