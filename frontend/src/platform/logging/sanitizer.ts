/**
 * FitNova AI — Log Sanitizer
 * Redacts sensitive credentials, tokens, passwords, and private secrets.
 */

import type { ILogSanitizer } from '../types/index.ts';

const SENSITIVE_KEYS = new Set([
  // Passwords, Tokens, Secrets & Auth
  'password',
  'pass',
  'token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'authorization',
  'auth',
  'apikey',
  'api_key',
  'x-api-key',
  'x_api_key',
  'key',
  'secret',
  'clientsecret',
  'client_secret',
  'cookie',
  'geminikey',
  'gemini_key',
  'fitnova_token',
  'credentials',
  'creditcard',
  'credit_card',
  'cardnumber',
  'cvv',

  // Raw Biometric Payloads
  'biometrics',
  'rawbiometrics',
  'raw_biometrics',
  'rawpayload',
  'raw_payload',
  'ecg',
  'ppg',
  'accelerometer',
  'gyroscope',
  'raw_samples',
  'samples',
  'heart_rate_samples',
  'hrv_samples',
  'rrintervals',
  'rr_intervals',
  'raw_hr_data',
  'raw_data',
  'rawdata',
  'rawsignals',
  'raw_signals',

  // Personally Identifiable Information (PII)
  'ssn',
  'socialsecurity',
  'social_security',
  'email',
  'user_email',
  'phone',
  'phonenumber',
  'phone_number',
  'telephone',
  'mobile',
  'address',
  'street',
  'street_address',
  'postalcode',
  'postal_code',
  'zipcode',
  'zip_code',
  'city',
  'state',
  'country',
  'fullname',
  'full_name',
  'firstname',
  'first_name',
  'lastname',
  'last_name',
  'birthdate',
  'birth_date',
  'date_of_birth',
  'dob',
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
        if (
          SENSITIVE_KEYS.has(lowerKey) ||
          lowerKey.includes('secret') ||
          lowerKey.includes('token') ||
          lowerKey.includes('password') ||
          lowerKey.includes('apikey') ||
          lowerKey.includes('api_key') ||
          lowerKey.includes('biometric') ||
          lowerKey.includes('raw_sample')
        ) {
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
      // Redact Bearer tokens (including optional 'token' prefix e.g. 'bearer token xyz')
      .replace(/bearer\s+(?:token\s+)?[A-Za-z0-9-_=.]+/gi, 'Bearer [REDACTED]')
      // Redact full or partial JWT patterns and JWT headers (base64 starting with eyJ)
      .replace(/ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+(?:\.[A-Za-z0-9-_.+/=]*)?/g, '[JWT_REDACTED]')
      .replace(/eyJ[A-Za-z0-9-_=]{10,}/g, '[JWT_REDACTED]')
      // Redact Google / Gemini API Keys
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[API_KEY_REDACTED]')
      // Redact OpenAI / generic sk- API keys
      .replace(/sk-[a-zA-Z0-9]{20,}/g, '[API_KEY_REDACTED]')
      // Redact URL query parameter secrets e.g. ?api_key=xxx, ?token=xxx
      .replace(/([?&](?:api[_-]?key|secret|token|password)=)[^&\s]+/gi, '$1[REDACTED]')
      // Redact email addresses
      .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[EMAIL_REDACTED]');
  }

  /**
   * Helper to ensure health data payloads are minimized and anonymized.
   * Strips out raw biometric time series, sensor waveforms, and user IDs.
   */
  minimizeHealthTelemetry(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized = this.sanitize(data) as Record<string, unknown>;
    const allowedKeys = new Set([
      'provider',
      'source',
      'status',
      'state',
      'freshness',
      'confidence',
      'hasHeartRate',
      'hasHRV',
      'hasSleep',
      'hasActivity',
      'sampleCount',
      'samplesCount',
      'durationMs',
      'syncDurationMs',
      'category',
      'ageMs',
      'timestamp',
    ]);

    const minimized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(sanitized)) {
      if (allowedKeys.has(key)) {
        minimized[key] = value;
      }
    }
    return minimized;
  }
}

export const defaultSanitizer = new DefaultLogSanitizer();
