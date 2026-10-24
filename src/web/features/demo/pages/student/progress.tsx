/**
 * /demo/student/progress — the student's own progress report.
 */
import { PageHeader } from '@bloomneo/uikit';
import { SEO } from '@/shared/SEO';
import { ME_STUDENT } from '../../data/store';
import { StudentReport } from '../../components/parts';

export default function MyProgress() {
  return (
    <>
      <SEO title="My progress" />
      <PageHeader title="My progress" description="How your scores are moving and which chapters need more practice." />
      <div className="mt-6"><StudentReport studentId={ME_STUDENT} resultBase="/demo/student/results" /></div>
    </>
  );
}
