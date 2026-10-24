import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import { config } from '../config';

const LogoutPage: React.FC = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is on /logout, redirect to /auth/logout first
    if (location.pathname === '/logout') {
      navigate('/auth/logout', { replace: true });
      return;
    }

    // Clear auth state, cache, and localStorage
    const performLogout = async () => {
      try {
        // Clear browser cache if possible
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
        }

        // Clear all localStorage
        localStorage.clear();
        sessionStorage.clear();

        // Logout using auth hook
        logout(config.auth.redirects.afterLogout);
      } catch (error) {
        console.warn('Cache clearing failed:', error);
        // Still proceed with logout
        logout(config.auth.redirects.afterLogout);
      }
    };

    performLogout();
  }, [logout, location.pathname, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Signing out...</h2>
        <p className="text-muted-foreground">Please wait while we log you out.</p>
      </div>
    </div>
  );
};

export default LogoutPage;