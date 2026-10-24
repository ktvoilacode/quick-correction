/**
 * Auth Feature Routes - Authentication endpoints with AppKit integration
 * @file src/api/features/auth/auth.route.ts
 */

import { Router, Request, Response } from 'express';
import { errorClass } from '@bloomneo/appkit/error';
import { securityClass } from '@bloomneo/appkit/security';
import { loggerClass } from '@bloomneo/appkit/logger';
import { authService } from './auth.service.js';

// Initialize AppKit modules
const router = Router();
const error = errorClass.get();
const security = securityClass.get();
const logger = loggerClass.get('auth-routes');

/**
 * The id server.ts attaches to every request.
 *
 * The handlers below used to read it off a metadata property that nothing ever
 * set, falling back to the string 'unknown' — so every successful register and
 * login answered with `requestId: "unknown"`, a field that promised a trace and
 * returned a placeholder.
 */
type RequestWithId = Request & { requestId?: string };

/**
 * Report a route failure at a level that matches what actually happened.
 *
 * Every catch here used to write straight to the console, which had two faults.
 *
 * It bypassed the logger, so the line carried no timestamp, no component tag
 * and no level — it could not be filtered, and it did not look like any other
 * line in the log.
 *
 * And it dumped a full stack trace for outcomes that are not faults at all. A
 * mistyped password is a 400 and an entirely ordinary event; printing twelve
 * lines of stack for one is how a log stops being read, and how the 500 that
 * actually mattered goes past unnoticed.
 *
 * 4xx is the caller's problem: one warn line. 5xx is ours: an error, with the
 * stack, because then the stack is the point.
 */
function reportRouteError(action: string, err: any): void {
  const status = err?.statusCode ?? 500;
  const detail = err?.message ?? String(err);

  if (status >= 500) {
    logger.error(`${action} failed: ${detail}`);
    if (err?.stack) logger.error(String(err.stack));
  } else {
    logger.warn(`${action} rejected (${status}): ${detail}`);
  }
}

// Rate limiting for auth endpoints using AppKit security - moderate limits for development
const authRateLimit = security.requests(10, 15 * 60 * 1000, {
  message: 'Too many authentication attempts, please try again later.'
});

/**
 * Register a new user
 */
router.post('/register', authRateLimit, async (req: Request, res: Response) => {
  try {
    const requestId = (req as RequestWithId).requestId;
    const result = await authService.register(req.body);

    res.status(201).json({
      ...result,
      requestId
    });

  } catch (err: any) {
    reportRouteError('registration', err);
    res.status(err.statusCode || 500).json({
      error: 'REGISTRATION_FAILED',
      message: err.message || 'Registration failed',
    });
  }
});

/**
 * Login user and generate JWT token
 */
router.post('/login', authRateLimit, async (req: Request, res: Response) => {
  try {
    const requestId = (req as RequestWithId).requestId;
    const result = await authService.login(req.body);

    res.json({
      ...result,
      requestId
    });

  } catch (err: any) {
    reportRouteError('login', err);
    res.status(err.statusCode || 500).json({
      error: 'LOGIN_FAILED',
      message: err.message || 'Login failed',
    });
  }
});

/**
 * Verify email with token
 */
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      throw error.badRequest('Verification token is required');
    }

    const result = await authService.verifyEmailToken(token);

    if (!result.success) {
      return res.status(400).json({
        error: 'VERIFICATION_FAILED',
        message: result.error,
      });
    }

    res.json({
      message: 'Email verified successfully',
      user: result.user,
    });
  } catch (err: any) {
    reportRouteError('email verification', err);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: err.message || 'Email verification failed',
    });
  }
});

/**
 * Resend verification email
 */
router.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw error.badRequest('Email address is required');
    }

    const result = await authService.resendVerificationEmail(email);

    if (!result.success) {
      return res.status(400).json({
        error: 'RESEND_FAILED',
        message: result.error,
      });
    }

    res.json({
      message: 'Verification email sent successfully',
    });
  } catch (err: any) {
    reportRouteError('resend verification', err);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: err.message || 'Failed to resend verification email',
    });
  }
});

/**
 * Forgot password - send reset email
 */
router.post('/forgot-password', authRateLimit, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw error.badRequest('Email address is required');
    }

    const result = await authService.sendPasswordResetEmail(email);

    if (!result.success) {
      return res.status(400).json({
        error: 'RESET_FAILED',
        message: result.error,
      });
    }

    res.json({
      message: 'If an account exists with this email, a password reset link has been sent',
    });
  } catch (err: any) {
    reportRouteError('forgot password', err);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: err.message || 'Failed to process forgot password request',
    });
  }
});

/**
 * Reset password with token
 */
router.post('/reset-password', authRateLimit, async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token) {
      throw error.badRequest('Reset token is required');
    }

    if (!password) {
      throw error.badRequest('New password is required');
    }

    if (password.length < 8) {
      throw error.badRequest('Password must be at least 8 characters long');
    }

    const result = await authService.resetPassword(token, password);

    if (!result.success) {
      return res.status(400).json({
        error: 'RESET_FAILED',
        message: result.error,
      });
    }

    res.json({
      message: 'Password reset successfully',
    });
  } catch (err: any) {
    reportRouteError('reset password', err);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: err.message || 'Failed to reset password',
    });
  }
});

/**
 * Deliberately public, and necessarily so: login, register and password
 * reset cannot require the token they exist to issue. Individual routes
 * that DO need a session guard themselves.
 */
export const isPublic = true;

export default router;