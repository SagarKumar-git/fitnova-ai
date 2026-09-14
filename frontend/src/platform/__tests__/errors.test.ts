/**
 * FitNova AI — Error Architecture Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  FitNovaError,
  NetworkError,
  AuthenticationError,
  ValidationError,
  normalizeError,
  isRetryableError,
  getUserSafeMessage,
  sanitizeErrorMessage,
} from '../errors/index.ts';

describe('Error Architecture', () => {
  it('instantiates strongly typed FitNovaError subclasses with metadata', () => {
    const netErr = new NetworkError('Failed to fetch', { statusCode: 504 });
    expect(netErr.code).toBe('NETWORK_ERROR');
    expect(netErr.recoverability).toBe('retryable');
    expect(netErr.statusCode).toBe(504);
    expect(netErr.metadata['statusCode']).toBe(504);

    const authErr = new AuthenticationError();
    expect(authErr.code).toBe('AUTHENTICATION_ERROR');
    expect(authErr.recoverability).toBe('fatal');
  });

  it('normalizes arbitrary errors into FitNovaError instances', () => {
    const rawError = new Error('Network request failed');
    const normalized = normalizeError(rawError);
    expect(normalized).toBeInstanceOf(FitNovaError);
    expect(normalized.code).toBe('NETWORK_ERROR');

    const authRaw = new Error('401 Unauthorized user token');
    const normalizedAuth = normalizeError(authRaw);
    expect(normalizedAuth.code).toBe('AUTHENTICATION_ERROR');

    const stringErr = normalizeError('Unknown string exception');
    expect(stringErr).toBeInstanceOf(FitNovaError);
    expect(stringErr.code).toBe('UNKNOWN_ERROR');
  });

  it('correctly assesses error retryability', () => {
    const retryableNet = new NetworkError('timeout');
    expect(isRetryableError(retryableNet)).toBe(true);

    const fatalVal = new ValidationError('Bad email');
    expect(isRetryableError(fatalVal)).toBe(false);

    expect(isRetryableError(new Error('connection reset'))).toBe(true);
  });

  it('returns clean, user-safe messages without leaking traces', () => {
    const authErr = new AuthenticationError('secret jwt stack trace: /var/log/db');
    expect(getUserSafeMessage(authErr)).toBe('Your session has expired. Please log in again.');

    const netErr = new NetworkError('socket hangup');
    expect(getUserSafeMessage(netErr)).toBe('Network connection issue. Please check your internet connection.');
  });

  it('redacts tokens and credentials in error messages', () => {
    const leakedMessage = 'Failed with Bearer eyJhbGciOi... and apiKey: secret-key-xyz';
    const sanitized = sanitizeErrorMessage(leakedMessage);
    expect(sanitized).not.toContain('eyJhbGciOi');
    expect(sanitized).not.toContain('secret-key-xyz');
    expect(sanitized).toContain('[REDACTED]');
  });
});
