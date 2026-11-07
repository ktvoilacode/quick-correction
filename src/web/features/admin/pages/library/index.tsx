/** The old address of this tab. Kept so links and bookmarks still land. */
import { Navigate, useLocation } from 'react-router-dom';

export default function LibraryRedirect() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.set('tab', 'library');
  return <Navigate to={`/admin/content?${params}`} replace />;
}
