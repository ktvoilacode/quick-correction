# User Feature - Developer Reference

## Overview

The User Feature handles profile management and administrative operations for user accounts. This feature follows the Feature-Based Component Architecture (FBCA) pattern and integrates with AppKit modules for comprehensive user management.

## Architecture

```
src/api/features/user/
├── user.service.ts     # Profile management and admin business logic
├── user.route.ts       # Profile and admin HTTP endpoints
├── user.types.ts       # TypeScript interfaces for user operations
├── user.model.ts       # Database operations and queries
├── user.http          # HTTP test cases for development
└── user.readme.md     # This documentation
```

## Core Components

### 1. User Service (`user.service.ts`)

**Primary Functions:**

- `getProfile()` - Retrieve user profile information
- `updateProfile()` - Update user profile data (name, phone)
- `changePassword()` - Change user password with current password validation
- `getAllUsers()` - Admin: List all users with optional tenant filtering
- `createUser()` - Admin: Create new user accounts
- `getUserById()` - Admin/Moderator: Get single user details
- `updateUser()` - Admin: Update any user's profile and settings
- `deleteUser()` - Admin: Delete user accounts with safety checks
- `changeUserPassword()` - Admin: Change any user's password

**AppKit Integration:**

- `loggerClass` - Structured logging for all user operations
- `errorClass` - Standardized error handling and responses
- `PrismaClient` - Database operations via user model

### 2. Route Handlers (`user.route.ts`)

**Profile Management Endpoints:**

| Method | Endpoint                    | Description                      | Auth Required |
| ------ | --------------------------- | -------------------------------- | ------------- |
| `GET`  | `/api/user/test`            | Health check for user routes     | No            |
| `GET`  | `/api/user/profile`         | Get own profile information      | Yes           |
| `PUT`  | `/api/user/profile`         | Update own profile (name, phone) | Yes           |
| `POST` | `/api/user/change-password` | Change own password              | Yes           |

**Admin Endpoints:**

| Method   | Endpoint                             | Description                    | Auth Required | Roles      |
| -------- | ------------------------------------ | ------------------------------ | ------------- | ---------- |
| `GET`    | `/api/user/admin/users`              | List all users                 | Yes           | Admin      |
| `GET`    | `/api/user/admin/list`               | List users (moderator view)    | Yes           | Moderator+ |
| `POST`   | `/api/user/admin/create`             | Create new user                | Yes           | Admin      |
| `GET`    | `/api/user/admin/users/:id`          | Get single user by ID          | Yes           | Moderator+ |
| `PUT`    | `/api/user/admin/users/:id`          | Update any user                | Yes           | Admin      |
| `DELETE` | `/api/user/admin/users/:id`          | Delete any user                | Yes           | Admin      |
| `PUT`    | `/api/user/admin/users/:id/password` | Change user password           | Yes           | Admin      |

### 3. Type Definitions (`user.types.ts`)

**Profile Types:**

- `UserProfileUpdateRequest` - Profile update data (name, phone)
- `ChangePasswordRequest` - Password change with current/new password
- `UserResponse` - Complete user data response (excludes password)

**Admin Types:**

- `UserUpdateRequest` - Admin user update with role/level/status changes
- `UserListResponse` - List response with users array and count
- `AuthTokenPayload` - JWT token structure for authentication
- `RoleLevel` - Complete role.level combinations for authorization

**Role System:**

- `UserRole` - 'user' | 'moderator' | 'admin'
- `UserLevel` - 'basic' | 'pro' | 'max' | 'review' | 'approve' | 'manage' | 'tenant' | 'org' | 'system'

## Database Schema

The user feature uses these User model fields:

```prisma
model User {
  id          Int       @id @default(autoincrement())
  email       String    @unique
  password    String
  name        String?
  phone       String?
  role        String    @default("user")
  level       String    @default("basic")
  tenantId    String?
  isVerified  Boolean   @default(false)
  isActive    Boolean   @default(true)
  lastLogin   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Auth-related fields (managed by auth feature)
  resetToken           String?
  resetTokenExpiry     DateTime?
  verificationToken    String?
  verificationExpiry   DateTime?
}
```

## Usage Examples

### 1. Get User Profile

```javascript
GET /api/user/profile
Authorization: Bearer your-jwt-token
X-Frontend-Key: your-frontend-key
```

**Response:**

```javascript
{
  "message": "Profile retrieved successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+1-555-1234",
    "role": "user",
    "level": "basic",
    "isVerified": true,
    "isActive": true,
    "lastLogin": "2024-09-25T10:30:00.000Z",
    "createdAt": "2024-09-25T10:00:00.000Z",
    "updatedAt": "2024-09-25T10:30:00.000Z"
  },
  "authenticatedAs": {
    "userId": 1,
    "role": "user",
    "level": "basic"
  },
  "requestId": "req_123456"
}
```

### 2. Update Profile

```javascript
PUT /api/user/profile
Authorization: Bearer your-jwt-token
Content-Type: application/json
X-Frontend-Key: your-frontend-key

{
  "name": "John Updated Smith",
  "phone": "+1-555-9999"
}
```

### 3. Change Password

```javascript
POST /api/user/change-password
Authorization: Bearer your-jwt-token
Content-Type: application/json
X-Frontend-Key: your-frontend-key

{
  "currentPassword": "current_password_here",
  "newPassword": "NewSecurePassword123!"
}
```

### 4. Admin: List Users

```javascript
GET /api/user/admin/users?tenantId=optional
Authorization: Bearer admin-jwt-token
X-Frontend-Key: your-frontend-key
```

### 5. Admin: Create User

```javascript
POST /api/user/admin/create
Authorization: Bearer admin-jwt-token
Content-Type: application/json
X-Frontend-Key: your-frontend-key

{
  "name": "New Admin User",
  "email": "newuser@example.com",
  "phone": "+1-555-1234",
  "password": "NewPassword123!",
  "role": "user",
  "level": "basic",
  "isActive": true,
  "isVerified": false
}
```

### 6. Admin: Get Single User

```javascript
GET /api/user/admin/users/2
Authorization: Bearer admin-jwt-token
X-Frontend-Key: your-frontend-key
```

### 7. Admin: Update User

```javascript
PUT /api/user/admin/users/2
Authorization: Bearer admin-jwt-token
Content-Type: application/json
X-Frontend-Key: your-frontend-key

{
  "name": "Updated by Admin",
  "role": "moderator",
  "level": "review",
  "isActive": true,
  "isVerified": true
}
```

### 8. Admin: Change User Password

```javascript
PUT /api/user/admin/users/2/password
Authorization: Bearer admin-jwt-token
Content-Type: application/json
X-Frontend-Key: your-frontend-key

{
  "newPassword": "AdminChangedPassword123!"
}
```

## Authorization & Security

### Role-Based Access Control

**User Operations:**

- Profile management requires valid JWT token
- Users can only access their own profile data
- Password changes require current password verification

**Admin Operations:**

- **Admin-only routes** (`admin.tenant`, `admin.org`, `admin.system`):

  - `/admin/users` - List and manage all users
  - `/admin/create` - Create new users
  - `/admin/users/:id` - Update/delete specific users
  - `/admin/users/:id/password` - Change user passwords

- **Moderator+ routes** (includes moderators and admins):
  - `/admin/list` - View user listings
  - `/admin/users/:id` - Get single user details

### Security Features

**Profile Protection:**

- JWT token validation for all profile operations
- User can only access their own profile data
- Current password required for password changes

**Admin Safety:**

- Self-deletion prevention (admins cannot delete own account)
- Role validation for administrative operations
- Comprehensive audit logging for admin actions

**Password Security:**

- 8-character minimum password requirement enforced
- Passwords never returned in API responses
- Current password verification for user-initiated changes
- Secure bcrypt hashing for all passwords

**Data Privacy:**

- Sensitive data properly excluded from user responses
- Request ID tracking for audit trails
- AppKit security integration for enhanced protection

## Error Handling

### Standard Error Response Format

```javascript
{
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "requestId": "req_123456"
}
```

### Common Error Codes

- `USER_NOT_FOUND` - User profile not found
- `INVALID_PASSWORD` - Current password verification failed
- `VALIDATION_ERROR` - Invalid input data provided
- `UNAUTHORIZED` - JWT token invalid or missing
- `FORBIDDEN` - Insufficient permissions for operation
- `OPERATION_NOT_ALLOWED` - Prevented operation (e.g., self-deletion)

## Development Testing

Use the provided `user.http` file for comprehensive testing:

### Profile Management Tests

- ✅ Get user profile with authentication
- ✅ Update profile information (name, phone)
- ✅ Change password with current password validation (8-character minimum)
- ✅ Error handling for invalid operations

### Admin Operation Tests

- ✅ List users (admin and moderator access)
- ✅ Create new users with all required fields
- ✅ Get single user details by ID
- ✅ Update user profiles and settings
- ✅ Change user passwords (admin-only)
- ✅ Delete user accounts with safety checks
- ✅ Role-based access control validation

### Test Setup

1. **Get JWT Token**: Use `/api/auth/login` to authenticate (see auth.http)
2. **Set Token**: Copy JWT to `@token` variable in user.http
3. **Run Tests**: Execute profile and admin endpoint tests
4. **Verify Responses**: Check proper data and error handling

## AppKit Integration

### Logging Patterns

```typescript
logger.info('Processing get profile request', { userId });
logger.warn('Unauthorized profile access attempt', { userId, requestedId });
logger.error('Failed to update user profile', { userId, error: err.message });
```

### Error Handling

```typescript
throw error.notFound('User not found');
throw error.badRequest('Current password is incorrect');
throw error.forbidden('Insufficient permissions');
```

### Authentication Integration

```typescript
const authenticatedUser = auth.getUser(req as any);
// Validates JWT and extracts user info
```

## Best Practices

### Service Layer Design

- ✅ All business logic contained in service layer
- ✅ Routes handle only HTTP concerns and validation
- ✅ Proper error propagation and logging
- ✅ Comprehensive input validation

### Security Implementation

- ✅ JWT token validation for all protected routes
- ✅ Role-based access control for admin operations
- ✅ 8-character minimum password requirement
- ✅ Current password verification for sensitive changes
- ✅ AppKit security integration with rate limiting
- ✅ Prevention of unauthorized data access
- ✅ Secure password hashing with bcrypt

### Code Organization

- ✅ Clear separation between profile and admin operations
- ✅ Consistent naming conventions and patterns
- ✅ Comprehensive type definitions
- ✅ Proper documentation and comments

## Integration with Auth Feature

### Separation of Concerns

- **Auth Feature** (`/api/auth/*`): Login, register, email verification, password reset
- **User Feature** (`/api/user/*`): Profile management, admin operations

### Workflow Integration

1. **Authentication**: User authenticates via `/api/auth/login`
2. **JWT Token**: Auth feature provides JWT token
3. **Profile Operations**: User feature uses JWT for profile operations
4. **Admin Operations**: Admin users access `/api/user/admin/*` endpoints

### Shared Dependencies

- **Database**: Both features share User model
- **JWT Tokens**: Auth generates, User validates
- **Role System**: Consistent role.level combinations

## Future Enhancements

### Profile Features

- User avatar upload and management
- Profile privacy settings
- User preferences and settings
- Activity history and audit logs

### Admin Enhancements

- Bulk user operations (import/export)
- Advanced user filtering and search
- User analytics and reporting
- Role hierarchy management

### Security Improvements

- Two-factor authentication integration
- Session management improvements
- Enhanced audit logging
- Fine-grained permissions system

---

**Note:** This user feature works in tandem with the auth feature to provide complete user management. Authentication operations are handled by the auth feature, while this feature focuses on profile management and administrative operations.
