/**
 * Application Configuration
 * Single source of truth for all app settings
 * Environment configurable for different deployments
 */

export const config = {
  // API Configuration
  api: {
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    endpoints: {
      login: '/api/auth/login',
      register: '/api/auth/register',
      verifyEmail: '/api/auth/verify-email',
      resendVerification: '/api/auth/resend-verification',
      forgotPassword: '/api/auth/forgot-password',
      resetPassword: '/api/auth/reset-password',
      profile: '/api/user/profile',
      updateProfile: '/api/user/profile',
    }
  },

  // Auth Configuration
  auth: {
    // Storage keys
    storage: {
      token: import.meta.env.VITE_AUTH_TOKEN_KEY || 'auth_token',
      user: import.meta.env.VITE_AUTH_USER_KEY || 'auth_user',
    },

    // Headers
    headers: {
      frontendKey: 'X-Frontend-Key',
      frontendKeyValue: import.meta.env.VITE_FRONTEND_KEY || '',
      auth: 'Authorization',
    },

    // Redirect configuration - environment configurable.
    // Defaults match the actual FBCA auto-discovered routes: pages under
    // `features/auth/pages/` resolve to `/auth/*`, not `/*`. Override via
    // env if you relocate the pages.
    redirects: {
      // Where to send unauthenticated users
      loginPage: import.meta.env.VITE_LOGIN_PAGE || '/auth/login',

      // Where to send authenticated users after login
      afterLogin: import.meta.env.VITE_AFTER_LOGIN || '/dashboard',

      // Where to send after logout
      afterLogout: import.meta.env.VITE_AFTER_LOGOUT || '/',

      // Where to send authenticated users trying to access auth pages
      authenticatedRedirect: import.meta.env.VITE_AUTHENTICATED_REDIRECT || '/dashboard'
    }
  },

  // Route Access Control
  routes: {
    // Auth-only routes (redirect to dashboard if authenticated). The
    // marketing homepage `/` must NOT be listed here — signed-in users
    // should still be able to visit the public pages without being
    // bounced back to the dashboard.
    authOnly: ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'],

    // Public routes (accessible to everyone regardless of auth state)
    public: ['/about', '/help', '/contact', '/gallery', '/terms', '/privacy', '/auth/verify-email', '/auth/forgot-password', '/auth/reset-password'],

    // Logout routes - special handling
    logout: ['/logout', '/auth/logout'],

    // Role-based routes (simple path matching)
    roles: {
      // Admin routes - require admin.* roles
      '/user/admin': ['admin.tenant', 'admin.org', 'admin.system'],
      '/user/admin/users': ['admin.tenant', 'admin.org', 'admin.system'],
      '/user/admin/settings': ['admin.tenant', 'admin.org', 'admin.system'],

      // Moderator+ routes - moderators and admins can access
      '/user/admin/list': ['moderator.review', 'moderator.approve', 'moderator.manage', 'admin.tenant', 'admin.org', 'admin.system']
    }
  }
};