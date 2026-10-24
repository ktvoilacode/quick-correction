/**
 * /privacy — a PAGE. AppLayoutRoute supplies the chrome.
 *
 * Placeholder prompts, not policy. See components/LegalPage.tsx.
 */
import { LegalPage } from '../components/LegalPage';
import { brand } from '@/shared/brand';

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      description={`How ${brand.name} collects, uses and stores personal data`}
      updated="1 January 2026"
      sections={[
        {
          heading: 'What we collect',
          body: <p>List the categories of personal data you hold — account details, usage data, payment identifiers, support correspondence — and how each is obtained: given by the person, observed automatically, or received from a third party.</p>,
        },
        {
          heading: 'Why we collect it',
          body: <p>State a purpose for each category, and the lawful basis you rely on if GDPR or UK GDPR applies. Purposes should be specific: "to provide the service" covers less than it appears to.</p>,
        },
        {
          heading: 'Who we share it with',
          body: <p>Name your processors — hosting, email delivery, payments, analytics, error tracking — and what each receives. If any process data outside your users' region, say so and describe the transfer safeguard.</p>,
        },
        {
          heading: 'How long we keep it',
          body: <p>Give a retention period per category, or the criteria you use to decide one. "As long as necessary" is not a period.</p>,
        },
        {
          heading: 'Your rights',
          body: <p>Explain how someone can access, correct, export or delete their data, how they withdraw consent, and how long you take to respond. Give a route that works — an address someone monitors.</p>,
        },
        {
          heading: 'Cookies and similar technologies',
          body: <p>Describe what you set, whether any are non-essential, and how a visitor refuses those. If you set nothing beyond a session cookie, say that plainly — it is a good thing to be able to say.</p>,
        },
        {
          heading: 'Contact',
          body: <p>Give the controller's legal name, postal address and a contact address for privacy requests, plus your Data Protection Officer if you are required to appoint one.</p>,
        },
      ]}
    />
  );
}
