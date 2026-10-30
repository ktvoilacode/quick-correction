/** The old address of this tab. Kept so links and bookmarks still land. */
import { Navigate, useLocation } from 'react-router-dom';

export default function PatternsRedirect() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.set('tab', 'patterns');
  return <Navigate to={`/admin/content?${params}`} replace />;
}
