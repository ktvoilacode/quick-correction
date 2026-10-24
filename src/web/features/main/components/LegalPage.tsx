/**
 * LegalPage — the shared frame for privacy, terms, refund and cancellation.
 *
 * These four pages are structurally identical: a title, a last-reviewed date,
 * and a run of headed sections. Giving them one frame means a change to the
 * reading measure or the heading rhythm lands on all four.
 *
 * ── On the content ────────────────────────────────────────────────────────
 * The section bodies that ship with this template are PROMPTS, not policy.
 * They describe what belongs in each section rather than asserting anything
 * about your business, because a generated policy that reads as finished is
 * the dangerous kind — it invites shipping without review. Replace each one,
 * then delete the notice below.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@bloomneo/uikit';
import { Info } from 'lucide-react';
import { SEO } from '@/shared/SEO';

export type LegalSection = { heading: string; body: ReactNode };

export function LegalPage({
  title,
  description,
  updated,
  sections,
  /** Set false once you have replaced the placeholder copy. */
  draft = true,
}: {
  title: string;
  description: string;
  updated: string;
  sections: LegalSection[];
  draft?: boolean;
}) {
  return (
    <>
      <SEO title={title} description={description} />

      {/* ~68 characters per line. Long-form text set to the full page width is
          measurably harder to read; this is the one place it matters most. */}
      <article className="mx-auto max-w-[68ch] py-8">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last reviewed {updated}</p>

        {draft && (
          <Alert className="mt-6 border-warning/40 bg-warning/8">
            <Info className="size-4 text-warning" />
            <AlertDescription>
              This is placeholder text, not legal advice. Replace every section
              below with policy that reflects how you actually operate, and have
              it reviewed before you publish.
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-10 space-y-9">
          {sections.map(({ heading, body }) => (
            <section key={heading}>
              <h2 className="text-lg font-semibold tracking-tight">{heading}</h2>
              <div className="mt-2.5 space-y-3 leading-relaxed text-muted-foreground">
                {body}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
          Questions about this page?{' '}
          <Link to="/contact" className="font-medium text-foreground hover:underline">
            Get in touch
          </Link>
          .
        </p>
      </article>
    </>
  );
}
