/**
 * User Feature Service - Profile management business logic with AppKit integration
 * @file src/api/features/user/user.service.ts
 *
 * @llm-rule WHEN: Need user profile management, admin operations, and password changes
 * @llm-rule AVOID: Direct database calls from routes - always use service layer
 * @llm-rule NOTE: Implements profile management with AppKit database, logger, and error patterns
 */

import { randomBytes } from 'node:crypto';
import { loggerClass } from '@bloomneo/appkit/logger';
import { errorClass } from '@bloomneo/appkit/error';
import { model } from './user.model.js';
import type {
  UserResponse,
  UserProfileUpdateRequest,
  UserUpdateRequest
} from './user.types.js';

// Initialize AppKit modules following the pattern
const logger = loggerClass.get('user-service');
const error = errorClass.get();

export const userService = {
  /**
   * Validate password strength
   */
  validatePassword(password: string): boolean {
    return !!(password && password.length >= 8);
  },

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<UserResponse> {
    try {
      logger.info('Processing get profile request', { userId });

      const user = await model.findById(userId);
      if (!user) {
        throw error.notFound('User not found');
      }

      logger.info('Get profile completed', { userId });
      return user;

    } catch (err: any) {
      if (err.statusCode) {
        throw err;
      }
      logger.error('Failed to get user profile', { userId, error: err });
      throw error.serverError('Failed to get user profile');
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: UserProfileUpdateRequest): Promise<UserResponse> {
    try {
      logger.info('Processing update profile request', { userId, fields: Object.keys(data) });

      const user = await model.findById(userId);
      if (!user) {
        throw error.notFound('User not found');
      }

      const updatedUser = await model.update(userId, data);

      logger.info('Update profile completed', { userId });
      return updatedUser;

    } catch (err: any) {
      if (err.statusCode) {
        throw err;
      }
      logger.error('Failed to update user profile', { userId, error: err?.message });
      throw error.serverError('Failed to update user profile');
    }
  },

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      logger.info('Processing change password request', { userId });

      // Validate input
      if (!currentPassword) {
        throw error.badRequest('Current password is required');
      }

      if (!newPassword || !this.validatePassword(newPassword)) {
        throw error.badRequest('New password must be at least 8 characters long');
      }

      const fullUser = await model.findById(userId);
      if (!fullUser) {
        throw error.notFound('User not found');
      }

      // Need to get user with password - model.findById excludes password
      const userWithPassword = await model.findByEmail(fullUser.email);
      if (!userWithPassword) {
        throw error.notFound('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await model.verifyPassword(currentPassword, userWithPassword.password);
      if (!isCurrentPasswordValid) {
        throw error.badRequest('The current password you entered is incorrect. If you don\'t remember your password, you can use the "Forgot Password" option on the login page.');
      }

      // Update password
      await model.updatePassword(userId, newPassword);

      logger.info('Change password completed', { userId });

    } catch (err: any) {
      if (err.statusCode) {
        throw err;
      }
      logger.error('Failed to change password', { userId, error: err });
      throw error.serverError('Failed to change password');
    }
  },


  /**
   * Create new user (admin only)
   */
  async createUser(data: {
    name?: string;
    email: string;
    phone?: string;
    password?: string;
    role?: string;
    level?: string;
    tenantId?: string | null;
    isActive?: boolean;
    isVerified?: boolean;
  }): Promise<UserResponse> {
    try {
      logger.info('Processing create user request', { email: data.email, role: data.role });

      // Check if user already exists
      const existingUser = await model.findByEmail(data.email);
      if (existingUser) {
        throw error.badRequest('User already exists with this email');
      }

      // Use provided password or generate a temporary one
      const password = data.password || randomBytes(9).toString('base64url') + 'Temp1!';

      // Create user with provided data
      const user = await model.create({
        name: data.name || null,
        email: data.email,
        phone: data.phone || null,
        password: password, // This will be hashed by the model
        role: data.role || 'user',
        level: data.level || 'basic',
        tenantId: data.tenantId ?? null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        isVerified: data.isVerified !== undefined ? data.isVerified : false
      });

      logger.info('Create user completed', { userId: user.id, email: data.email });
      return user;

    } catch (err: any) {
      if (err.statusCode) {
        throw err;
      }
      logger.error('Failed to create user', { email: data.email, error: err });
      throw error.serverError('Failed to create user');
    }
  },

  /**
   * Get user by ID (admin/moderator only)
   */
  async getUserById(userId: string): Promise<UserResponse | null> {
    try {
      logger.info('Processing get user by ID request', { userId });

      const user = await model.findById(userId);

      logger.info('Get user by ID completed', { userId, found: !!user });
      return user;

    } catch (err: any) {
      logger.error('Failed to get user by ID', { userId, error: err });
      throw error.serverError('Failed to get user by ID');
    }
  },

  /**
   * Get all users (admin/moderator only)
   */
  async getAllUsers(tenantId?: string): Promise<UserResponse[]> {
    try {
      logger.info('Processing get all users request', { tenantId });

      const users = await model.findAll(tenantId);

      logger.info('Get all users completed', { count: users.length });
      return users;

    } catch (err: any) {
      logger.error('Failed to get all users', { error: err });
      throw error.serverError('Failed to retrieve users');
    }
  },

  /**
   * Update user by admin (admin only)
   */
  async updateUser(id: string, data: UserUpdateRequest): Promise<UserResponse> {
    try {
      logger.info('Processing admin update user request', { id, fields: Object.keys(data) });

      const user = await model.findById(id);
      if (!user) {
        throw error.notFound('User not found');
      }

      const updatedUser = await model.update(id, data);

      logger.info('Admin update user completed', { id });
      return updatedUser;

    } catch (err: any) {
      if (err.statusCode) {
        throw err;
      }
      logger.error('Failed to update user by admin', { id, data, error: err });
      throw error.serverError('Failed to update user');
    }
  },

  /**
   * Delete user (admin only)
   */
  async deleteUser(id: string): Promise<void> {
    try {
      logger.info('Processing delete user request', { id });

      const user = await model.findById(id);
      if (!user) {
        throw error.notFound('User not found');
      }

      await model.delete(id);

      logger.info('Delete user completed', { id });

    } catch (err: any) {
      if (err.statusCode) {
        throw err;
      }
      logger.error('Failed to delete user', { id, error: err });
      throw error.serverError('Failed to delete user');
    }
  },

  /**
   * Admin change user password (admin only)
   */
  async adminChangePassword(userId: string, newPassword: string): Promise<void> {
    try {
      logger.info('Processing admin change password request', { userId });

      // Validate password
      if (!newPassword || !this.validatePassword(newPassword)) {
        throw error.badRequest('Password must be at least 8 characters long');
      }

      // Check if user exists
      const user = await model.findById(userId);
      if (!user) {
        throw error.notFound('User not found');
      }

      // Update password
      await model.updatePassword(userId, newPassword);

      logger.info('Admin change password completed', { userId });

    } catch (err: any) {
      if (err.statusCode) {
        throw err;
      }
      logger.error('Failed to change password by admin', { userId, error: err });
      throw error.serverError('Failed to change password');
    }
  }
};