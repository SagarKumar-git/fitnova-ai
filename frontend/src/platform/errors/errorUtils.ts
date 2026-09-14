/**
 * FitNova AI — Error Utilities
 * Normalization, retry classification, and user-safe error message sanitization.
 */

import {
  FitNovaError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  TimeoutError,
  UnknownError,
} from './FitNovaError.ts';

// Regular expressions to detect and redact sensitive tokens / credentials
const SENSITIVE_PATTERNS = [
  /bearer\s+[A-Za-z0-9-_=.]+/gi,
  /api[_-]?key[:=]\s*['"]?[A-Za-z0-9-_.]+['"]?/gi,
  /password[:=]\s*['"]?[^'"]+['"]?/gi,
  /token[:=]\s*['"]?[A-Za-z0-9-_.]+['"]?/gi,
];

export function sanitizeErrorMessage(message: string): string {
  let sanitized = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}

/**
 * Normalizes any caught unknown value into a strongly typed FitNovaError.
 */
export function normalizeError(
  err: unknown,
  defaultMessage: string = 'An unexpected error occurred'
): FitNovaError {
  if (err instanceof FitNovaError) {
    return err;
  }

  if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
    return new NetworkError(sanitizeErrorMessage(err.message), { cause: err });
  }

  if (err instanceof DOMException && err.name === 'AbortError') {
    return new TimeoutError('Request timed out or was aborted', { cause: err });
  }

  if (err instanceof Error) {
    const sanitizedMsg = sanitizeErrorMessage(err.message);
    const lower = sanitizedMsg.toLowerCase();

    if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('token expired')) {
      return new AuthenticationError(sanitizedMsg, { cause: err });
    }
    if (lower.includes('403') || lower.includes('forbidden')) {
      return new AuthorizationError(sanitizedMsg, { cause: err });
    }
    if (lower.includes('network') || lower.includes('failed to fetch') || lower.includes('connection')) {
      return new NetworkError(sanitizedMsg, { cause: err });
    }
    if (lower.includes('validation') || lower.includes('invalid input')) {
      return new ValidationError(sanitizedMsg, { cause: err });
    }
    if (lower.includes('timeout')) {
      return new TimeoutError(sanitizedMsg, { cause: err });
    }

    return new UnknownError(sanitizedMsg || defaultMessage, { cause: err });
  }

  if (typeof err === 'string') {
    return new UnknownError(sanitizeErrorMessage(err));
  }

  return new UnknownError(defaultMessage, { cause: err });
}

/**
 * Determines whether an error is safe to retry.
 */
export function isRetryableError(err: unknown): boolean {
  if (err instanceof FitNovaError) {
    return err.recoverability === 'retryable';
  }

  const normalized = normalizeError(err);
  return normalized.recoverability === 'retryable';
}

/**
 * Produces a sanitized, friendly message suitable for displaying to end users.
 * Never leaks internal traces, SQL syntax, or backend technicalities.
 */
export function getUserSafeMessage(err: unknown): string {
  const normalized = normalizeError(err);

  switch (normalized.code) {
    case 'AUTHENTICATION_ERROR':
      return 'Your session has expired. Please log in again.';
    case 'AUTHORIZATION_ERROR':
      return 'You do not have permission to perform this action.';
    case 'NETWORK_ERROR':
      return 'Network connection issue. Please check your internet connection.';
    case 'TIMEOUT_ERROR':
      return 'The request took too long to complete. Please try again.';
    case 'STORAGE_ERROR':
      return 'Local storage is full or restricted. Some offline data may not be saved.';
    case 'VALIDATION_ERROR':
      return normalized.message || 'Please check your input and try again.';
    case 'AI_ERROR':
    case 'PROVIDER_ERROR':
      return 'AI service is temporarily unavailable. Please try again in a moment.';
    case 'SYNC_ERROR':
      return 'Failed to sync offline changes. We will retry automatically.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
