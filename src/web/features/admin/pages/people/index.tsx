/** The old address of the Users page. Kept so links and bookmarks still land. */
import { Navigate, useLocation } from 'react-router-dom';

export default function PeopleRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/admin/users${search}`} replace />;
}
