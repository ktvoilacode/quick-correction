// Auth feature exports
export { useAuth, AuthProvider } from './hooks';
export { AuthGuard, ProtectedRoute } from './components';
export { config as authConfig } from './config';
export { default as LogoutPage } from './pages/logout';
export type { User, AuthState, LoginCredentials, AuthContextType } from './types';

// Auth feature - all routes are public, no role restrictions needed