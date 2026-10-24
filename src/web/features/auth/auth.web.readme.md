# Auth Feature - Frontend Developer Reference

## Overview

The Auth Feature provides a complete authentication system with React Context API integration, form validation, and spam protection. Built with TypeScript and feature-based component architecture (FBCA) for maintainable, scalable frontend authentication.

## Architecture

```
src/web/features/auth/
├── components/
│   ├── AuthGuard.tsx           # Route protection & role-based access
│   └── index.ts               # Component exports
├── context/
│   ├── AuthContext.tsx        # Main auth state management
│   └── index.ts              # Context exports
├── hooks/
│   ├── useAuth.ts            # Auth hook wrapper
│   └── index.ts              # Hook exports
├── pages/
│   ├── login.tsx             # Login page with validation
│   ├── register.tsx          # Registration with spam protection
│   ├── logout.tsx            # Logout handler
│   ├── verify-email.tsx      # Email verification
│   ├── forgot-password.tsx   # Password reset request
│   └── reset-password.tsx    # Password reset form
├── types/
│   ├── auth.ts              # TypeScript interfaces
│   └── index.ts             # Type exports
├── config/
│   └── index.ts             # Configuration settings
├── index.ts                 # Feature exports
└── auth.web.readme.md       # This documentation
```

## Core Components

### 1. AuthContext (`context/AuthContext.tsx`)

**Primary Functions:**
- `login()` - Authenticate user with credentials
- `register()` - Create new user account
- `logout()` - Clear auth state and redirect
- `verifyEmail()` - Verify email with token
- `forgotPassword()` - Request password reset
- `resetPassword()` - Reset password with token

**State Management:**
- React Context API with localStorage persistence
- Cross-tab synchronization with storage events
- Performance optimized with useCallback
- Automatic redirect handling

### 2. AuthGuard (`components/AuthGuard.tsx`)

**Route Protection:**
- **Auth-only routes** - Redirect authenticated users (login, register)
- **Protected routes** - Require authentication
- **Public routes** - Accessible to everyone
- **Role-based access** - Granular permission control

**Permission System:**
```typescript
// User permission format: role.level
// Examples: admin.system, moderator.review, user.basic
const userPermission = `${user.role}.${user.level}`;
```

### 3. Configuration (`config/index.ts`)

**Environment Variables:**
```bash
VITE_API_URL=http://localhost:3000
VITE_FRONTEND_KEY=your_frontend_key
VITE_AUTH_TOKEN_KEY=auth_token
VITE_AUTH_USER_KEY=auth_user
VITE_LOGIN_PAGE=/login
VITE_AFTER_LOGIN=/dashboard
```

## Authentication Flow

### **Registration Flow**
1. User fills registration form
2. Spam protection validates submission
3. Form validation (password strength, terms agreement)
4. API call to `/api/auth/register`
5. Success → Show verification message
6. User verifies email via link

### **Login Flow**
1. User submits credentials
2. API call to `/api/auth/login`
3. Success → Store token & user data
4. Redirect to intended page or dashboard
5. AuthContext updates global state

### **Logout Flow**
1. Clear localStorage (token & user)
2. Update AuthContext state
3. Redirect to login page
4. Cross-tab sync via storage events

## Spam Protection

### **Registration Protection Features**
1. **Honeypot Field** - Hidden field that bots fill
2. **Time-based Validation** - Block submissions under 5 seconds
3. **Rate Limiting** - 30-second cooldown between attempts
4. **Interaction Tracking** - Require minimum field interactions
5. **Form Timing** - Track time spent on form

**Implementation:**
```typescript
// Honeypot detection
if (formData.honeypot) {
  setRegisterError('Please try again later');
  return;
}

// Time validation
if (timeSinceStart < 5000) {
  setRegisterError('Please take your time to fill out the form');
  return;
}
```

## Type Definitions

### **Core Types** (`types/auth.ts`)
```typescript
interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  level: string;
  tenantId: string | null;
  isVerified: boolean;
  isActive: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}
```

## Route Configuration

### **Route Access Control** (`config/index.ts`)
```typescript
routes: {
  // Block authenticated users
  authOnly: ['/', '/login', '/register'],

  // Allow everyone
  public: ['/terms', '/privacy', '/about'],

  // Role-based access
  roles: {
    '/user/admin': ['admin.tenant', 'admin.system'],
    '/user/admin/users': ['admin.tenant', 'admin.system']
  }
}
```

## Usage Examples

### **Basic Auth Hook Usage**
```typescript
import { useAuth } from '../features/auth';

const MyComponent: React.FC = () => {
  const { user, isAuthenticated, login, logout } = useAuth();

  const handleLogin = async (credentials) => {
    const result = await login(credentials);
    if (!result.success) {
      console.error(result.error);
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <p>Welcome, {user?.name}!</p>
      ) : (
        <button onClick={() => handleLogin(creds)}>Login</button>
      )}
    </div>
  );
};
```

### **Route Protection**
```typescript
import { AuthGuard } from '../features/auth';

// Protect entire route
<AuthGuard>
  <DashboardPage />
</AuthGuard>

// Role-based protection
<AuthGuard requiredRoles={['admin.system', 'admin.tenant']}>
  <AdminPanel />
</AuthGuard>
```

### **Custom Loading State**
```typescript
<AuthGuard fallback={<CustomLoader />}>
  <ProtectedContent />
</AuthGuard>
```

## Error Handling

### **Standard Error Response Format**
```typescript
interface AuthResponse {
  success: boolean;
  error?: string;
}

// Usage
const result = await register(data);
if (!result.success) {
  setError(result.error || 'Registration failed');
}
```

### **Common Error Scenarios**
- Network connectivity issues
- Invalid credentials
- Account verification required
- Rate limiting exceeded
- Spam protection triggered

## Performance Optimizations

### **Context Optimizations**
- `useCallback` for all auth functions
- Minimal re-renders with selective state updates
- Loading states handled at component level
- Cross-tab sync without unnecessary updates

### **Form Optimizations**
- Debounced validation
- Conditional re-renders
- Efficient state management
- Optimistic UI updates

## Security Features

### **Client-side Security**
- JWT token storage in localStorage
- Automatic token cleanup on logout
- Cross-tab synchronization
- Route-based access control
- Spam protection mechanisms

### **API Integration Security**
- Frontend key validation
- Request rate limiting
- Error message sanitization
- Secure cookie handling (if implemented)

## Integration with Backend

### **API Endpoints** (`config/index.ts`)
```typescript
api: {
  endpoints: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    verifyEmail: '/api/auth/verify-email',
    resendVerification: '/api/auth/resend-verification',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password'
  }
}
```

### **Request Headers**
- `X-Frontend-Key` - Frontend validation
- `Authorization` - JWT token (when authenticated)
- `Content-Type: application/json`

## Testing Guidelines

### **Unit Testing**
```typescript
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '../context/AuthContext';

test('should display login form', () => {
  render(
    <AuthProvider>
      <LoginPage />
    </AuthProvider>
  );
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
});
```

### **Integration Testing**
- Test complete auth flows
- Mock API responses
- Test route protection
- Validate spam protection

## Best Practices

### **Component Architecture**
- ✅ Single responsibility for each component
- ✅ Proper TypeScript interfaces
- ✅ Consistent error handling patterns
- ✅ Accessible form design

### **State Management**
- ✅ Context API for global auth state
- ✅ Local component state for forms
- ✅ Performance optimized updates
- ✅ Proper cleanup on unmount

### **Security Best Practices**
- ✅ Client-side validation + server validation
- ✅ Secure token storage patterns
- ✅ Protection against common attacks
- ✅ User-friendly error messages

## Troubleshooting

### **Common Issues**

1. **Auth state not persisting** - Check localStorage keys in config
2. **Route protection not working** - Verify AuthGuard placement
3. **Cross-tab sync issues** - Check storage event listeners
4. **Spam protection false positives** - Adjust timing thresholds

### **Debug Tools**
```typescript
// Enable debug logging
const { user, isAuthenticated } = useAuth();
console.log('Auth State:', { user, isAuthenticated });
```

## Future Enhancements

### **Potential Features**
- **Remember me** functionality with refresh tokens
- **Social login** integration (Google, GitHub)
- **Two-factor authentication** support
- **Session management** with activity tracking
- **Progressive enhancement** for offline support

### **Security Improvements**
- **Content Security Policy** headers
- **Secure cookie** implementation
- **Token refresh** automation
- **Brute force** protection
- **Account lockout** mechanisms

---

**Note:** This auth feature provides production-ready authentication with comprehensive security measures, excellent user experience, and maintainable architecture patterns for React applications.