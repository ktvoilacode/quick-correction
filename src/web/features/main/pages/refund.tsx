/**
 * /refund — a PAGE. Placeholder prompts, not policy.
 */
import { LegalPage } from '../components/LegalPage';
import { brand } from '@/shared/brand';

export default function RefundPage() {
  return (
    <LegalPage
      title="Refund policy"
      description={`When and how ${brand.name} issues refunds`}
      updated="1 January 2026"
      sections={[
        {
          heading: 'What qualifies',
          body: <p>State the window and the conditions. If you offer an unconditional period, say exactly how long and from when it runs — purchase, first use, or renewal.</p>,
        },
        {
          heading: 'What does not',
          body: <p>Name the exclusions plainly: consumed usage, one-off setup fees, third-party charges. A person should be able to tell which side of the line they are on before they ask.</p>,
        },
        {
          heading: 'How to request one',
          body: <p>Give the exact route and what you need — order reference, account email. Say who to contact and where.</p>,
        },
        {
          heading: 'How long it takes',
          body: <p>Your processing time and the separate time the payment provider takes to return funds. Distinguish the two; most complaints come from conflating them.</p>,
        },
        {
          heading: 'Statutory rights',
          body: <p>Note that this policy sits alongside any statutory rights and does not replace them. Consumer law in several jurisdictions overrides a stricter policy.</p>,
        },
      ]}
    />
  );
}
