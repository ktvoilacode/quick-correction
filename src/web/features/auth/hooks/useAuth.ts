import { useAuthContext } from '../context';

// Clean hook that just re-exports the context
export const useAuth = () => {
  return useAuthContext();
};