import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../hooks';
import { config } from '../config';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  fallback?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requiredRoles,
  fallback
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  // Show loading while checking auth
  if (isLoading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  const { authOnly, public: publicRoutes } = config.routes;

  // 🔒 Pre-login middleware: Block auth-only routes if authenticated
  if (isAuthenticated && authOnly.includes(currentPath)) {
    return <Navigate to={config.auth.redirects.authenticatedRedirect} replace />;
  }

  // 🔓 Post-login middleware: Block protected routes if not authenticated
  if (!isAuthenticated && !publicRoutes.includes(currentPath) && !authOnly.includes(currentPath)) {
    return <Navigate
      to={config.auth.redirects.loginPage}
      state={{ from: location }}
      replace
    />;
  }

  // Role-based access control with role.level combinations
  if (isAuthenticated && requiredRoles?.length && user) {
    const userPermission = `${user.role}.${user.level}`;
    const hasRequiredRole = requiredRoles.includes(userPermission);

    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this page.</p>
            <div className="text-sm text-gray-500">
              <p>Your role: <span className="font-mono">{userPermission}</span></p>
              <p>Required: <span className="font-mono">{requiredRoles.join(' OR ')}</span></p>
            </div>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

// Keep legacy ProtectedRoute for backward compatibility
export const ProtectedRoute = AuthGuard;