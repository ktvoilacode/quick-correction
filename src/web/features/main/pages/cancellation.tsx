/**
 * /cancellation — a PAGE. Placeholder prompts, not policy.
 */
import { LegalPage } from '../components/LegalPage';
import { brand } from '@/shared/brand';

export default function CancellationPage() {
  return (
    <LegalPage
      title="Cancellation policy"
      description={`How to cancel your ${brand.name} subscription`}
      updated="1 January 2026"
      sections={[
        {
          heading: 'How to cancel',
          body: <p>Give the shortest real route — ideally a link to the page in the product where it happens. If cancelling requires contacting someone, say so here rather than letting people discover it.</p>,
        },
        {
          heading: 'When it takes effect',
          body: <p>State whether access continues to the end of the paid period or stops immediately, and whether any part-period is refunded. Cross-reference your refund policy.</p>,
        },
        {
          heading: 'Your data after cancelling',
          body: <p>How long the account and its data are retained, how to export beforehand, and when deletion becomes irreversible. Give a date, not a disposition.</p>,
        },
        {
          heading: 'Reactivating',
          body: <p>Whether an account can be restored after cancelling and within what window.</p>,
        },
      ]}
    />
  );
}
