/**
 * User Feature Routes - Profile management endpoints with AppKit integration
 * @file src/api/features/user/user.route.ts
 */

import express from 'express';
import { errorClass } from '@bloomneo/appkit/error';
import { authClass } from '@bloomneo/appkit/auth';
import { userService } from './user.service.js';

// Initialize AppKit modules
const router = express.Router();
const error = errorClass.get();
const auth = authClass.get();

/**
 * Get user profile by ID
 */
router.get('/profile',
  auth.requireLoginToken(),
  error.asyncRoute(async (req, res) => {
    const requestId = req.requestMetadata?.requestId || 'unknown';

    try {
      const authenticatedUser = auth.getUser(req as any);

      if (!authenticatedUser) {
        throw error.serverError('Authentication failed - user not found in request');
      }

      const user = await userService.getProfile(authenticatedUser.userId as string);

      res.json({
        message: 'Profile retrieved successfully',
        user,
        authenticatedAs: {
          userId: authenticatedUser.userId,
          role: authenticatedUser.role,
          level: authenticatedUser.level
        },
        requestId
      });

    } catch (err: any) {
      if (err.statusCode) {
        throw err;
      }
      res.status(err.statusCode || 500).json({
        error: err.message || 'Failed to get profile',
        requestId
      });
    }
  })
);

/**
 * Update user profile
 */
router.put('/profile',
  auth.requireLoginToken(),
  error.asyncRoute(async (req, res) => {
    const requestId = req.requestMetadata?.requestId || 'unknown';
    const { name, phone } = req.body;

    try {
      const authenticatedUser = auth.getUser(req as any);

      if (!authenticatedUser) {
        throw error.serverError('Authentication failed - user not found in request');
      }

      const user = await userService.updateProfile(authenticatedUser.userId as string, { name, phone });

      res.json({
        message: 'Profile updated successfully',
        user,
        requestId
      });

    } catch (err: any) {
      if (err.statusCode) {
        throw err;
      }
      res.status(err.statusCode || 500).json({
        error: err.message || 'Failed to update profile',
        requestId
      });
    }
  })
);

/**
 * Change user password
 */
router.post('/change-password',
  auth.requireLoginToken(),
  error.asyncRoute(async (req, res) => {
    const requestId = req.requestMetadata?.requestId || 'unknown';
    const { currentPassword, newPassword } = req.body;

    try {
      const authenticatedUser = auth.getUser(req as any);

      if (!authenticatedUser) {
        throw error.serverError('Authentication failed - user not found in request');
      }

      await userService.changePassword(authenticatedUser.userId as string, currentPassword, newPassword);

      res.json({
        message: 'Password changed successfully',
        requestId
      });

    } catch (err: any) {
      // Handle AppKit errors with proper status codes and messages
      if (err.statusCode) {
        res.status(err.statusCode).json({
          error: err.message || 'Password change failed',
          requestId
        });
      } else {
        res.status(500).json({
          error: err.message || 'Password change failed',
          requestId
        });
      }
    }
  })
);

// =============================================================================
// ADMIN SCOPE
// =============================================================================

/*
 * Who the caller may manage. admin.system manages every user. Every other
 * admin or moderator manages only users in their own tenant, and cannot set
 * role, level or tenant — so a tenant admin can neither reach another tenant
 * nor promote anyone to a role above their own. Without this, admin.tenant
 * could list, edit, reset the password of, or promote any user anywhere.
 */
function callerScope(req: any): { isPlatform: boolean; tenantId: string | null } {
  const caller = auth.getUser(req) as { role?: string; level?: string; tenantId?: string | null } | null;
  const isPlatform = caller?.role === 'admin' && caller?.level === 'system';
  return { isPlatform, tenantId: caller?.tenantId ?? null };
}

/** Throws 404 unless the caller may manage this user (404, not 403: don't confirm it exists). */
async function assertCanManage(req: any, userId: string) {
  const { isPlatform, tenantId } = callerScope(req);
  if (isPlatform) return;
  const target = await userService.getUserById(userId);
  if (!target || !tenantId || target.tenantId !== tenantId) {
    throw error.notFound('User not found');
  }
}

/** The tenant to list: any (or ?tenantId=) for platform admins, their own for everyone else. */
function listTenant(req: any): string | undefined {
  const { isPlatform, tenantId } = callerScope(req);
  if (isPlatform) return (req.query.tenantId as string) || undefined;
  if (!tenantId) throw error.forbidden('Your account is not bound to a tenant');
  return tenantId;
}

// =============================================================================
// ADMIN ROUTES - /api/user/admin/*
// =============================================================================

/**
 * Get all users (admin only)
 */
router.get('/admin/users',
  auth.requireLoginToken(),
  auth.requireUserRoles(['admin.tenant', 'admin.org', 'admin.system']),
  error.asyncRoute(async (req, res) => {
    const requestId = req.requestMetadata?.requestId || 'unknown';
    try {
      const users = await userService.getAllUsers(listTenant(req));

      res.json({
        message: 'Users retrieved successfully',
        users,
        count: users.length,
        requestId
      });

    } catch (err: any) {
      if (err.statusCode) {
        throw err;
      }
      res.status(err.statusCode || 500).json({
        error: err.message || 'Failed to get users',
        requestId
      });
    }
  })
);

/**
 * Get users list (moderator+ access)
 */
router.get('/admin/list',
  auth.requireLoginToken(),
  auth.requireUserRoles(['moderator.review', 'moderator.approve', 'moderator.manage', 'admin.tenant', 'admin.org', 'admin.system']),
  error.asyncRoute(async (req, res) => {
    const requestId = req.requestMetadata?.requestId || 'unknown';
    try {
      const users = await userService.getAllUsers(listTenant(req));

      res.json({
        message: 'Users retrieved successfully',
        users,
        count: users.length,
        requestId
      });

    } catch (err: any) {
      if (err.statusCode) {
        throw err;
      }
      res.status(err.statusCode || 500).json({
        error: err.message || 'Failed to get users',
        requestId
      });
    }
  })
);

/**
 * Create new user (admin only)
 */
router.post('/admin/create',
  auth.requireLoginToken(),
  auth.requireUserRoles(['admin.tenant', 'admin.org', 'admin.system']),
  error.asyncRoute(async (req, res) => {
    const requestId = req.requestMetadata?.requestId || 'unknown';
    const { name, email, phone, password, role, level, tenantId, isActive, isVerified } = req.body;
    const scope = callerScope(req);

    try {
      if (!email) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Email is required',
          requestId
        });
      }

      const user = await userService.createUser({
        name,
        email,
        phone,
        password,
        // Only platform admins choose role, level and tenant. Everyone else
        // creates ordinary users in their own tenant.
        role: scope.isPlatform ? role || 'user' : 'user',
        level: scope.isPlatform ? level || 'basic' : 'basic',
        tenantId: scope.isPlatform ? tenantId ?? null : scope.tenantId,
        isActive: isActive !== undefined ? isActive : true,
        isVerified: isVerified !== undefined ? isVerified : false
      });

      res.status(201).json({
        message: 'User created successfully',
        user,
        requestId
      });

    } catch (err: any) {
      if (err.statusCode) {
        throw err;
      }
      res.status(err.statusCode || 500).json({
        error: err.message || 'Failed to create user',
        requestId
      });
    }
  })
);

/**
 * Get single user by ID (moderator+ access)
 */
router.get('/admin/users/:id',
  auth.requireLoginToken(),
  auth.requireUserRoles(['moderator.review', 'moderator.approve', 'moderator.manage', 'admin.tenant', 'admin.org', 'admin.system']),
  error.asyncRoute(async (req, res) => {
    const requestId = req.requestMetadata?.requestId || 'unknown';
    const userId = req.params.id;

    try {
      // User.id is a cuid (String) after the 4.1 migration. Don't use
      // isNaN — cuids always fail that and every lookup would 400.
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({
          error: 'Invalid user ID',
          message: 'User ID must be a non-empty string',
          requestId
        });
      }

      await assertCanManage(req, userId);
      const user = await userService.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: `User with ID ${userId} not found`,
          requestId
        });
      }

      res.json({
        message: 'User retrieved successfully',
        user,
        requestId
      });

    } catch (err: any) {
      if (err.statusCode) {
        throw err;
      }
      res.status(err.statusCode || 500).json({
        error: err.message || 'Failed to get user',
        requestId
      });
    }
  })
);

/**
 * Update user by admin (admin only)
 */
router.put('/admin/users/:id',
  auth.requireLoginToken(),
  auth.requireUserRoles(['admin.tenant', 'admin.org', 'admin.system']),
  error.asyncRoute(async (req, res) => {
    const requestId = req.requestMetadata?.requestId || 'unknown';
    const userId = req.params.id;

    try {
      await assertCanManage(req, userId);
      const { name, phone, role, level, tenantId, isVerified, isActive } = req.body ?? {};
      const changes = callerScope(req).isPlatform
        ? { name, phone, role, level, tenantId, isVerified, isActive }
        : { name, phone, isVerified, isActive };
      const user = await userService.updateUser(userId, changes);

      res.json({
        message: 'User updated successfully',
        user,
        requestId
      });

    } catch (err: any) {
      if (err.statusCode) {
        throw err;
      }
      res.status(err.statusCode || 500).json({
        error: err.message || 'Failed to update user',
        requestId
      });
    }
  })
);

/**
 * Delete user (admin only)
 */
router.delete('/admin/users/:id',
  auth.requireLoginToken(),
  auth.requireUserRoles(['admin.tenant', 'admin.org', 'admin.system']),
  error.asyncRoute(async (req, res) => {
    const requestId = req.requestMetadata?.requestId || 'unknown';
    const userId = req.params.id;

    try {
      const authenticatedUser = auth.getUser(req as any);

      // Prevent self-deletion
      if (authenticatedUser?.userId === userId) {
        return res.status(400).json({
          error: 'Operation not allowed',
          message: 'Cannot delete your own account',
          requestId
        });
      }

      await assertCanManage(req, userId);
      await userService.deleteUser(userId);

      res.json({
        message: 'User deleted successfully',
        requestId
      });

    } catch (err: any) {
      if (err.statusCode) {
        throw err;
      }
      res.status(err.statusCode || 500).json({
        error: err.message || 'Failed to delete user',
        requestId
      });
    }
  })
);

/**
 * Admin change user password (admin only)
 */
router.put('/admin/users/:id/password',
  auth.requireLoginToken(),
  auth.requireUserRoles(['admin.tenant', 'admin.org', 'admin.system']),
  error.asyncRoute(async (req, res) => {
    const requestId = req.requestMetadata?.requestId || 'unknown';
    const userId = req.params.id;
    const { newPassword } = req.body;

    try {
      await assertCanManage(req, userId);
      await userService.adminChangePassword(userId, newPassword);

      res.json({
        message: 'Password updated successfully',
        requestId
      });

    } catch (err: any) {
      if (err.statusCode) {
        throw err;
      }
      res.status(err.statusCode || 500).json({
        error: err.message || 'Failed to update password',
        requestId
      });
    }
  })
);

export default router;