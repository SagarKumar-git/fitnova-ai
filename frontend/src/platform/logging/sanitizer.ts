/**
 * FitNova AI — Log Sanitizer
 * Redacts sensitive credentials, tokens, passwords, and private secrets.
 */

import type { ILogSanitizer } from '../types/index.ts';

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'apikey',
  'api_key',
  'secret',
  'clientsecret',
  'cookie',
  'geminikey',
  'gemini_key',
  'fitnova_token',
  'creditcard',
  'credentials',
]);

const REDACTED = '[REDACTED]';

export class DefaultLogSanitizer implements ILogSanitizer {
  sanitize(input: unknown, seen = new WeakSet<object>()): unknown {
    if (input === null || input === undefined) {
      return input;
    }

    if (typeof input === 'string') {
      return this.sanitizeString(input);
    }

    if (typeof input === 'number' || typeof input === 'boolean' || typeof input === 'symbol') {
      return input;
    }

    if (input instanceof Error) {
      return {
        name: input.name,
        message: this.sanitizeString(input.message),
        stack: input.stack ? this.sanitizeString(input.stack) : undefined,
      };
    }

    if (typeof input === 'object') {
      if (seen.has(input)) {
        return '[CIRCULAR]';
      }
      seen.add(input);

      if (Array.isArray(input)) {
        return input.map((item) => this.sanitize(item, seen));
      }

      const sanitizedObj: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(input)) {
        const lowerKey = key.toLowerCase();
        if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('secret') || lowerKey.includes('token') || lowerKey.includes('password')) {
          sanitizedObj[key] = REDACTED;
        } else {
          sanitizedObj[key] = this.sanitize(val, seen);
        }
      }
      return sanitizedObj;
    }

    return String(input);
  }

  private sanitizeString(str: string): string {
    return str
      .replace(/bearer\s+[A-Za-z0-9-_=.]+/gi, 'Bearer [REDACTED]')
      .replace(/ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, '[JWT_REDACTED]');
  }
}

export const defaultSanitizer = new DefaultLogSanitizer();
