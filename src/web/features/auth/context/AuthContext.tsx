import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApi } from '@bloomneo/uikit';
import { config } from '../config';
import type { AuthState, LoginCredentials, RegisterData, AuthContextType, VerifyEmailData, ForgotPasswordData, ResetPasswordData } from '../types';

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const api = useApi({
    baseURL: config.api.baseUrl,
    headers: {
      [config.auth.headers.frontendKey]: config.auth.headers.frontendKeyValue
    }
  });
  const navigate = useNavigate();
  const location = useLocation();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      const token = localStorage.getItem(config.auth.storage.token);
      const userData = localStorage.getItem(config.auth.storage.user);

      if (token && userData) {
        try {
          const user = JSON.parse(userData);
          setAuthState({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          localStorage.removeItem(config.auth.storage.token);
          localStorage.removeItem(config.auth.storage.user);
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    // Initialize on mount
    initializeAuth();

    // Listen for localStorage changes (from UserContext profile updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === config.auth.storage.user && e.newValue) {
        try {
          const updatedUser = JSON.parse(e.newValue);
          setAuthState(prev => ({
            ...prev,
            user: updatedUser
          }));
        } catch (error) {
          console.error('Error parsing updated user data:', error);
        }
      }
    };

    // Also listen for custom events for same-tab updates
    const handleCustomUserUpdate = (e: CustomEvent) => {
      if (e.detail?.user) {
        setAuthState(prev => ({
          ...prev,
          user: e.detail.user
        }));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userUpdated', handleCustomUserUpdate as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userUpdated', handleCustomUserUpdate as EventListener);
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    try {
      // Don't set isLoading: true to prevent unnecessary re-renders
      // The LoginPage handles its own loading state with isSubmitting
      const response = await api.post(config.api.endpoints.login, credentials);

      if (response.token && response.message === "Login successful") {
        const { user, token } = response;

        localStorage.setItem(config.auth.storage.token, token);
        localStorage.setItem(config.auth.storage.user, JSON.stringify(user));

        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });

        const intendedPath = (location.state as any)?.from?.pathname || config.auth.redirects.afterLogin;
        navigate(intendedPath, { replace: true });

        return { success: true };
      } else {
        // Don't change state on failed login to prevent re-renders
        return { success: false, error: response.message || 'Login failed' };
      }
    } catch (error: any) {
      // Don't change state on login error to prevent re-renders
      return {
        success: false,
        error: error.message || 'Network error occurred'
      };
    }
  }, [api, navigate, location]);

  const register = useCallback(async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      // Don't set isLoading: true to prevent unnecessary re-renders
      // The RegisterPage handles its own loading state with isSubmitting
      const response = await api.post(config.api.endpoints.register, data);

      if (response.message === "User registered successfully") {
        // Registration successful - don't auto-login, let user verify email
        return { success: true };
      } else {
        return { success: false, error: response.message || 'Registration failed' };
      }
    } catch (error: any) {
      // Don't change state on registration error to prevent re-renders
      return {
        success: false,
        error: error.message || 'Network error occurred'
      };
    }
  }, [api]);

  const logout = useCallback((redirectTo: string = config.auth.redirects.afterLogout) => {
    localStorage.removeItem(config.auth.storage.token);
    localStorage.removeItem(config.auth.storage.user);

    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });

    navigate(redirectTo, { replace: true });
  }, [navigate]);

  const verifyEmail = useCallback(async (data: VerifyEmailData): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.post(config.api.endpoints.verifyEmail, data);

      if (response.message === "Email verified successfully") {
        return { success: true };
      } else {
        return { success: false, error: response.message || 'Email verification failed' };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error occurred'
      };
    }
  }, [api]);

  const resendVerification = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.post(config.api.endpoints.resendVerification, { email });

      if (response.message === "Verification email sent successfully") {
        return { success: true };
      } else {
        return { success: false, error: response.message || 'Failed to send verification email' };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error occurred'
      };
    }
  }, [api]);

  const forgotPassword = useCallback(async (data: ForgotPasswordData): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.post(config.api.endpoints.forgotPassword, data);

      if (response.message && response.message.includes("password reset link has been sent")) {
        return { success: true };
      } else {
        return { success: false, error: response.message || 'Failed to send reset email' };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error occurred'
      };
    }
  }, [api]);

  const resetPassword = useCallback(async (data: ResetPasswordData): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.post(config.api.endpoints.resetPassword, data);

      if (response.message === "Password reset successfully") {
        return { success: true };
      } else {
        return { success: false, error: response.message || 'Password reset failed' };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error occurred'
      };
    }
  }, [api]);


  const value: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};