/**
 * User Feature Types - TypeScript interfaces for User profile management
 * @file src/api/features/user/user.types.ts
 *
 * @llm-rule WHEN: Need type safety for User profile management request/response data
 * @llm-rule AVOID: Using 'any' type - always define proper interfaces
 * @llm-rule NOTE: Supports User profile management with multi-tenant architecture
 */

// User profile update request
export interface UserProfileUpdateRequest {
  name?: string;
  phone?: string;
}

// Admin user update request
export interface UserUpdateRequest {
  name?: string;
  phone?: string;
  role?: string;
  level?: string;
  tenantId?: string;
  isVerified?: boolean;
  isActive?: boolean;
}

// Change password request
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// User response (excludes sensitive data)
export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  level: string;
  tenantId: string | null;
  isVerified: boolean;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// User list response
export interface UserListResponse {
  users: UserResponse[];
  total: number;
}

// Generic API response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// JWT payload for authentication
export interface AuthTokenPayload {
  userId: string;
  role: string;
  level: string;
  type: 'login';
  iat: number;
  exp: number;
}

// Role levels for authorization
export type UserRole = 'user' | 'moderator' | 'admin';
export type UserLevel = 'basic' | 'pro' | 'max' | 'review' | 'approve' | 'manage' | 'tenant' | 'org' | 'system';

// Complete role.level combinations
export type RoleLevel =
  | 'user.basic'
  | 'user.pro'
  | 'user.max'
  | 'moderator.review'
  | 'moderator.approve'
  | 'moderator.manage'
  | 'admin.tenant'
  | 'admin.org'
  | 'admin.system';

// Express request with authenticated user
export interface AuthenticatedRequest {
  user: AuthTokenPayload;
}