/**
 * /dashboard/users — kept only as a redirect.
 *
 * The auth layer ships a read-only user list here for projects scaffolded with
 * --auth alone. Once the admin layer is applied, /admin/users supersedes it:
 * same endpoint, plus create, edit and delete. Two pages onto one dataset is a
 * question ("which one is authoritative?") nobody should have to answer.
 *
 * A layer can add or overwrite files but not remove them, so the route still
 * exists — this makes it land somewhere correct instead of somewhere stale.
 */
import { Navigate } from 'react-router-dom';

export default function DashboardUsersRedirect() {
  return <Navigate to="/admin/users" replace />;
}
