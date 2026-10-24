/**
 * Auth Feature Utilities - Email verification and password reset utilities
 * @file src/api/features/auth/auth.util.ts
 *
 * @llm-rule WHEN: Need email verification or password reset token generation and email sending
 * @llm-rule AVOID: Direct email sending from services - use these utilities
 * @llm-rule NOTE: Implements secure token generation and email templates for auth flows
 */

import crypto from 'crypto';
import { emailClass } from '@bloomneo/appkit/email';

export interface TokenData {
  token: string;
  expiry: Date;
}

/**
 * Generate email verification token (24 hours expiry)
 */
export function generateVerificationToken(): TokenData {
  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24); // 24 hours from now

  return { token, expiry };
}

/**
 * Generate password reset token (1 hour expiry)
 */
export function generatePasswordResetToken(): TokenData {
  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 1); // 1 hour from now for password reset

  return { token, expiry };
}

/**
 * Check if token has expired
 */
export function isTokenExpired(expiry: Date): boolean {
  return new Date() > expiry;
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  userEmail: string,
  userName: string,
  verificationToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = process.env.VITE_API_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl.replace(':3000', ':5176')}/auth/verify-email?token=${verificationToken}`;

    const result = await emailClass.send({
      to: userEmail,
      subject: 'Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">Verify Your Email Address</h2>

          <p>Hi ${userName || 'there'},</p>

          <p>Thanks for signing up! Please verify your email address by clicking the button below:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}"
               style="background-color: #007bff; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Verify Email Address
            </a>
          </div>

          <p>Or copy and paste this link in your browser:</p>
          <p style="background-color: #f8f9fa; padding: 10px; border-radius: 4px;
                    word-break: break-all; font-family: monospace;">
            ${verificationUrl}
          </p>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This verification link will expire in 24 hours. If you didn't create an account,
            you can safely ignore this email.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            This email was sent from Demo App.
          </p>
        </div>
      `,
      text: `
        Hi ${userName || 'there'},

        Thanks for signing up! Please verify your email address by visiting this link:
        ${verificationUrl}

        This verification link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.

        Best regards,
        Demo App Team
      `
    });

    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send verification email'
    };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  userEmail: string,
  userName: string,
  resetToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = process.env.VITE_API_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl.replace(':3000', ':5176')}/auth/reset-password?token=${resetToken}`;

    const result = await emailClass.send({
      to: userEmail,
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">Reset Your Password</h2>

          <p>Hi ${userName || 'there'},</p>

          <p>We received a request to reset your password. Click the button below to create a new password:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}"
               style="background-color: #dc3545; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>

          <p>Or copy and paste this link in your browser:</p>
          <p style="background-color: #f8f9fa; padding: 10px; border-radius: 4px;
                    word-break: break-all; font-family: monospace;">
            ${resetUrl}
          </p>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This password reset link will expire in 1 hour. If you didn't request a password reset,
            you can safely ignore this email.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            This email was sent from Demo App.
          </p>
        </div>
      `,
      text: `
        Hi ${userName || 'there'},

        We received a request to reset your password. Please visit this link to create a new password:
        ${resetUrl}

        This password reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.

        Best regards,
        Demo App Team
      `
    });

    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send password reset email'
    };
  }
}