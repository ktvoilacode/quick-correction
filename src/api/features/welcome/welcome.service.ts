/**
 * Welcome Feature Service - Business logic with AppKit integration
 * @module bloomneo/welcome-service
 * @file bloomneo/src/api/features/{featureName}/{featureName}.service.ts
 *
 * @llm-rule WHEN: Need business logic layer with validation, logging, and config
 * @llm-rule AVOID: Direct database calls from routes - always use service layer
 * @llm-rule NOTE: Demonstrates AppKit logger, config, and error patterns for FBCA
 */

import { loggerClass } from '@bloomneo/appkit/logger';
import { configClass } from '@bloomneo/appkit/config';
import { errorClass } from '@bloomneo/appkit/error';
import type { WelcomeResponse, PersonalizedWelcomeResponse } from './welcome.types.js';

// Initialize AppKit modules following the pattern
const logger = loggerClass.get('welcome');
const config = configClass.get();
const error = errorClass.get();

export const welcomeService = {
  /**
   * Get basic hello message
   */
  async getHello(): Promise<WelcomeResponse> {
    try {
      // Get default welcome from config (with fallback)
      const defaultWelcome = config.get('welcome.default', 'hello') as string;

      return {
        message: defaultWelcome,
        timestamp: new Date().toISOString()
      };

    } catch (err) {
      /*
       * The reason goes in the MESSAGE, not a metadata object.
       *
       * The default logger scope prints the message and drops the metadata, so
       * passing the error as `{ error: err }` logs a sentence that says
       * something failed and refuses to say what — precisely inverting which
       * half you needed. Interpolate it.
       */
      logger.error(`welcome.getHello failed: ${(err as Error)?.message ?? err}`);
      throw error.serverError('Failed to generate welcome message');
    }
  },

  /**
   * Get hello message with name
   */
  async getHelloWithName(name: string): Promise<PersonalizedWelcomeResponse> {
    try {
      // Validate input. These warns survive the default scope because the
      // offending value is in the message — that is the whole convention.
      if (!name || typeof name !== 'string') {
        logger.warn(`welcome: rejected non-string name (${typeof name})`);
        throw error.badRequest('Name must be a valid string');
      }

      if (name.length > 100) {
        logger.warn(`welcome: rejected name of ${name.length} chars (max 100)`);
        throw error.badRequest('Name must be less than 100 characters');
      }

      // Get welcome format from config
      const welcomeFormat = config.get('welcome.format', 'hello {name}') as string;
      const message = welcomeFormat.replace('{name}', name);

      const result = {
        message,
        name,
        timestamp: new Date().toISOString()
      };

      return result;

    } catch (err: any) {
      // Re-throw AppKit errors as-is
      if (err.statusCode) {
        throw err;
      }

      // Convert other errors to server errors
      logger.error(`welcome.getHelloWithName failed for "${name}": ${err?.message ?? err}`);
      throw error.serverError('Failed to generate personalized welcome message');
    }
  }
};