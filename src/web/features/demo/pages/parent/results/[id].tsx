import { useParams } from 'react-router-dom';
import { SEO } from '@/shared/SEO';
import { ResultView } from '../../../components/ResultView';

export default function ParentResult() {
  const { id = '' } = useParams();
  return (
    <>
      <SEO title="Result" />
      <ResultView submissionId={id} back={{ label: 'Corrections', href: '/demo/parent/corrections' }} />
    </>
  );
}
