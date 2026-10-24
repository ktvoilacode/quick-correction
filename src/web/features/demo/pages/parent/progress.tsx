/**
 * /demo/parent/progress — the child's progress report.
 */
import { PageHeader } from '@bloomneo/uikit';
import { SEO } from '@/shared/SEO';
import { ME_STUDENT, studentById } from '../../data/store';
import { StudentReport } from '../../components/parts';

export default function ParentProgress() {
  const first = studentById(ME_STUDENT).name.split(' ')[0];
  return (
    <>
      <SEO title="Progress" />
      <PageHeader title={`${first}’s progress`} description="How scores are moving and which chapters need more practice." />
      <div className="mt-6"><StudentReport studentId={ME_STUDENT} resultBase="/demo/parent/results" /></div>
    </>
  );
}
