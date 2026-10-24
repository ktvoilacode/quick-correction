/**
 * /demo/school/students/:id — one student's progress report.
 */
import { useParams } from 'react-router-dom';
import { PageHeader } from '@bloomneo/uikit';
import { SEO } from '@/shared/SEO';
import { STUDENTS } from '../../../data/store';
import { StudentReport, useStudentProgress } from '../../../components/parts';

export default function StudentDetail() {
  const { id = '' } = useParams();
  const s = STUDENTS.find((x) => x.id === id) ?? STUDENTS[0];
  const { avg, done } = useStudentProgress(s.id);
  return (
    <>
      <SEO title={s.name} />
      <PageHeader
        title={s.name}
        description={`Class ${s.className} · Roll ${s.roll} · Parent: ${s.parent} · ${done.length} tests · average ${avg}%`}
        breadcrumbs={[{ label: 'Students', href: '/demo/school/students' }, { label: s.name }]}
      />
      <div className="mt-6"><StudentReport studentId={s.id} resultBase="/demo/school/results" /></div>
    </>
  );
}
