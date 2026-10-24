# Auth Feature - Developer Reference

## Overview

The Auth Feature handles all authentication-related operations including user registration, login, email verification, and password reset flows. This feature follows the Feature-Based Component Architecture (FBCA) pattern and integrates seamlessly with AppKit modules.

## Architecture

```
src/api/features/auth/
├── auth.service.ts     # Business logic and authentication operations
├── auth.route.ts       # HTTP endpoints and route handlers
├── auth.types.ts       # TypeScript interfaces and types
├── auth.util.ts        # Utility functions (tokens, emails)
├── auth.http          # HTTP test cases for development
└── auth.readme.md     # This documentation
```

## Core Components

### 1. Authentication Service (`auth.service.ts`)

**Primary Functions:**
- `register()` - User registration with automatic email verification
- `login()` - User authentication with JWT token generation
- Email verification workflow
- Password reset workflow
- Input validation utilities

**AppKit Integration:**
- `loggerClass` - Structured logging for all auth operations
- `errorClass` - Standardized error handling and responses
- `authClass` - JWT token generation, password hashing, and validation
- `databaseClass` - Database operations via AppKit pattern
- `emailClass` - Email sending for verification and password reset

### 2. Route Handlers (`auth.route.ts`)

**Endpoints:**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/auth/test` | Health check for auth routes | No |
| `POST` | `/api/auth/register` | Register new user account | No |
| `POST` | `/api/auth/login` | Authenticate user and get JWT | No |
| `POST` | `/api/auth/verify-email` | Verify email with token | No |
| `POST` | `/api/auth/resend-verification` | Resend verification email | No |
| `POST` | `/api/auth/forgot-password` | Request password reset | No |
| `POST` | `/api/auth/reset-password` | Reset password with token | No |

### 3. Type Definitions (`auth.types.ts`)

**Request Types:**
- `AuthLoginRequest` - Login credentials and options
- `AuthRegisterRequest` - Registration data and user info

**Response Types:**
- `AuthLoginResponse` - User data, JWT token, and metadata
- `AuthRegisterResponse` - Created user data and success message

### 4. Utilities (`auth.util.ts`)

**Token Management:**
- `generateVerificationToken()` - 24-hour email verification tokens
- `generatePasswordResetToken()` - 1-hour password reset tokens
- `isTokenExpired()` - Token expiration validation

**Email Integration:**
- `sendVerificationEmail()` - HTML email templates for verification
- `sendPasswordResetEmail()` - HTML email templates for password reset
- Mailgun SMTP integration via AppKit

## Security Features

### Password Security
- **Bcrypt Hashing:** All passwords hashed with salt rounds (12)
- **Minimum Length:** 6 characters minimum requirement
- **Secure Comparison:** Uses bcrypt.compare for verification

### Token Security
- **Crypto Random:** 32-byte hex tokens using Node.js crypto
- **Time-based Expiry:** Different expiration times for different use cases
- **Single Use:** Tokens cleared after successful use

### Email Security
- **No Email Enumeration:** Forgot password always returns success
- **Token Validation:** All tokens validated before use
- **Expiry Checking:** Automatic token expiration handling

## Database Schema

The auth feature uses these User model fields:

```prisma
model User {
  id                Int       @id @default(autoincrement())
  email             String    @unique
  password          String
  name              String?
  phone             String?
  role              String    @default("user")
  level             String    @default("basic")
  isVerified        Boolean   @default(false)
  isActive          Boolean   @default(true)
  lastLogin         DateTime?
  resetToken        String?
  resetTokenExpiry  DateTime?
  verificationToken String?
  verificationExpiry DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

## Email Configuration

### SMTP Setup (Mailgun)
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=2525
SMTP_USER=noreply@mg.live.ai.in
SMTP_PASS=your-mailgun-password
SMTP_SECURE=false
BLOOM_EMAIL_FROM_EMAIL=noreply@demotest.in
BLOOM_EMAIL_FROM_NAME=Demo
```

### Email Templates
- **Verification Email:** Clean HTML template with call-to-action button
- **Password Reset Email:** Security-focused template with reset link
- **URL Construction:** Automatic environment-based URL generation

## Usage Examples

### 1. User Registration
```javascript
POST /api/auth/register
Content-Type: application/json
X-Frontend-Key: your-frontend-key

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "phone": "+1-555-1234",
  "role": "user",
  "level": "standard"
}
```

**Response:**
```javascript
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "level": "standard",
    "isVerified": false,
    "isActive": true,
    "createdAt": "2024-09-25T10:30:00.000Z",
    "updatedAt": "2024-09-25T10:30:00.000Z"
  },
  "requestId": "req_123456"
}
```

### 2. User Login
```javascript
POST /api/auth/login
Content-Type: application/json
X-Frontend-Key: your-frontend-key

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "rememberMe": true
}
```

**Response:**
```javascript
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "level": "standard",
    "isVerified": true,
    "lastLogin": "2024-09-25T10:35:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "requestId": "req_123457"
}
```

### 3. Email Verification
```javascript
POST /api/auth/verify-email
Content-Type: application/json
X-Frontend-Key: your-frontend-key

{
  "token": "a1b2c3d4e5f6..."
}
```

### 4. Password Reset Flow
```javascript
// Step 1: Request reset
POST /api/auth/forgot-password
{
  "email": "user@example.com"
}

// Step 2: Reset with token from email
POST /api/auth/reset-password
{
  "token": "reset_token_from_email",
  "password": "NewSecurePassword123!"
}
```

## Error Handling

### Standard Error Response Format
```javascript
{
  "error": "ERROR_CODE",
  "message": "Human readable error message"
}
```

### Common Error Codes
- `REGISTRATION_FAILED` - Registration validation or creation failed
- `LOGIN_FAILED` - Invalid credentials or authentication failure
- `VERIFICATION_FAILED` - Email verification token invalid or expired
- `RESET_FAILED` - Password reset token invalid or expired
- `INTERNAL_ERROR` - Server-side error occurred

## Development Testing

Use the provided `auth.http` file for comprehensive testing:

### Test Coverage
- ✅ Basic registration and login flows
- ✅ Email verification workflow
- ✅ Password reset workflow
- ✅ Error case validation
- ✅ Security boundary testing
- ✅ Integration with seeded test data

### Seeded Test Accounts
All seeded accounts use password: `t7xszag09c`

**User Accounts:**
- `user.basic@bloom-basicapp.com` (role: user.basic)
- `user.pro@bloom-basicapp.com` (role: user.pro)
- `user.max@bloom-basicapp.com` (role: user.max)

**Admin Accounts:**
- `admin.tenant@bloom-basicapp.com` (role: admin.tenant)
- `admin.org@bloom-basicapp.com` (role: admin.org)
- `admin.system@bloom-basicapp.com` (role: admin.system)

## Frontend Integration

### Configuration Update
The frontend config has been updated to use auth endpoints:

```typescript
api: {
  endpoints: {
    login: '/api/auth/login',      // Updated from /api/user/login
    register: '/api/auth/register', // Updated from /api/user/register
    profile: '/api/user/profile',   // Remains in user feature
    updateProfile: '/api/user/profile'
  }
}
```

### Route Access Control
```typescript
routes: {
  // Public routes (no auth required)
  public: ['/auth/verify-email', '/auth/forgot-password', '/auth/reset-password'],

  // Auth-only routes (redirect if authenticated)
  authOnly: ['/login', '/register', '/forgot-password', '/reset-password']
}
```

## AppKit Integration

### Logger Usage
```typescript
logger.info('Processing user registration', { email: data.email });
logger.warn('Invalid login attempt', { email, userId });
logger.error('Password verification failed', { error: err.message });
```

### Error Handling
```typescript
throw error.badRequest('Valid email is required');
throw error.serverError('Authentication system error');
```

### JWT Token Generation
```typescript
const token = auth.generateLoginToken({
  userId: user.id,
  role: user.role,
  level: user.level
});
```

## Best Practices

### Service Layer
- ✅ All business logic contained in service layer
- ✅ Routes only handle HTTP concerns
- ✅ Proper error propagation and handling
- ✅ Comprehensive input validation

### Security
- ✅ No sensitive data in logs
- ✅ Proper token generation and validation
- ✅ Secure password hashing
- ✅ Email enumeration protection

### Code Organization
- ✅ Clear separation of concerns
- ✅ Consistent naming conventions
- ✅ Comprehensive type definitions
- ✅ Proper documentation and comments

## Future Considerations

### Potential Enhancements
- Multi-factor authentication (MFA)
- OAuth/SSO integration
- Session management improvements
- Rate limiting for auth endpoints
- Audit logging for security events

### Scalability
- Consider Redis for token storage
- Implement refresh token rotation
- Add distributed rate limiting
- Consider email queue for high volume

---

**Note:** This auth feature is designed to work seamlessly with the existing user feature, where auth handles authentication flows and user handles profile management operations.