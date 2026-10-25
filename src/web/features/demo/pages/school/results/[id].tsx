import { useParams } from 'react-router-dom';
import { SEO } from '@/shared/SEO';
import { ResultView } from '../../../components/ResultView';

export default function SchoolResult() {
  const { id = '' } = useParams();
  return (
    <>
      <SEO title="Result" />
      <ResultView submissionId={id} back={{ label: 'To review', href: '/demo/school/review' }} review />
    </>
  );
}
