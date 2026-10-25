/**
 * /demo/parent — the parent's assistant: upload answers, see marks, ask
 * what to revise.
 */
import { SEO } from '@/shared/SEO';
import { ParentChat } from '../../components/ParentChat';

export default function ParentHome() {
  return (
    <>
      <SEO title="Assistant" />
      <ParentChat />
    </>
  );
}
