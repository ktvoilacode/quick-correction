/**
 * Auth Feature Types - Authentication data types and interfaces
 * @file src/api/features/auth/auth.types.ts
 *
 * @llm-rule WHEN: Need type definitions for authentication operations
 * @llm-rule AVOID: Inline types in auth services - centralize here
 * @llm-rule NOTE: Shared types for auth requests, responses, and data structures
 */

export interface AuthLoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthRegisterRequest {
  email: string;
  password: string;
  name?: string;
  phone?: string;
}

export interface AuthLoginResponse {
  message: string;
  user: {
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
  };
  token: string;
  requestId?: string;
}

export interface AuthRegisterResponse {
  message: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    role: string;
    level: string;
    tenantId: string | null;
    isVerified: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  requestId?: string;
}