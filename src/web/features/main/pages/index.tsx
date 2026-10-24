/**
 * / — MedhaMark's homepage lives at /demo while the product is a prototype.
 */
import { Navigate } from 'react-router-dom';

export default function Home() {
  return <Navigate to="/demo" replace />;
}
