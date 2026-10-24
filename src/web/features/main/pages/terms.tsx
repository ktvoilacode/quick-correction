/**
 * /terms — a PAGE. Placeholder prompts, not policy.
 */
import { LegalPage } from '../components/LegalPage';
import { brand } from '@/shared/brand';

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      description={`The agreement between you and ${brand.name}`}
      updated="1 January 2026"
      sections={[
        {
          heading: 'Agreement',
          body: <p>Identify the legal entity behind the service and state that using it means accepting these terms. Say how you notify people of changes and when changes take effect.</p>,
        },
        {
          heading: 'Accounts',
          body: <p>Set out eligibility, that credentials must be kept secure, and that the account holder is responsible for activity under their account. Describe when you may suspend or close one.</p>,
        },
        {
          heading: 'Acceptable use',
          body: <p>Describe what people may not do — the specifics matter more than a general prohibition. Be clear about what happens when this clause is breached.</p>,
        },
        {
          heading: 'Payment',
          body: <p>Billing period, renewal, what happens on failed payment, and how prices change. Cross-reference your refund and cancellation pages rather than restating them here.</p>,
        },
        {
          heading: 'Intellectual property',
          body: <p>State what you own, what the customer owns, and what licence each grants the other. Be explicit about customer content: what you may do with it, and for how long.</p>,
        },
        {
          heading: 'Warranties and liability',
          body: <p>Any disclaimers and liability caps. These clauses are the ones most often unenforceable when copied from another company — have them reviewed against your jurisdiction.</p>,
        },
        {
          heading: 'Termination',
          body: <p>How either side ends the agreement, notice required, what survives, and what happens to customer data afterwards — including how long they have to export it.</p>,
        },
        {
          heading: 'Governing law',
          body: <p>The governing law and the forum for disputes.</p>,
        },
      ]}
    />
  );
}
