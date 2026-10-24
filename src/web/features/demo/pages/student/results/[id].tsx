import { useParams } from 'react-router-dom';
import { SEO } from '@/shared/SEO';
import { ResultView } from '../../../components/ResultView';

export default function StudentResult() {
  const { id = '' } = useParams();
  return (
    <>
      <SEO title="My result" />
      <ResultView submissionId={id} back={{ label: 'My tests', href: '/demo/student' }} />
    </>
  );
}
