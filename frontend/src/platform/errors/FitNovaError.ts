/**
 * FitNova AI — Error Architecture
 * Standardized error classes across the platform and feature layers.
 */

import type { ErrorRecoverability, PlatformErrorCode } from '../types/index.ts';

export interface ErrorOptions {
  cause?: unknown;
  metadata?: Record<string, unknown>;
  recoverability?: ErrorRecoverability;
}

export class FitNovaError extends Error {
  readonly code: PlatformErrorCode | string;
  readonly cause?: unknown;
  readonly metadata: Record<string, unknown>;
  readonly timestamp: number;
  readonly recoverability: ErrorRecoverability;

  constructor(
    code: PlatformErrorCode | string,
    message: string,
    options: ErrorOptions = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.cause = options.cause;
    this.metadata = options.metadata ? { ...options.metadata } : {};
    this.timestamp = Date.now();
    this.recoverability = options.recoverability ?? 'transient';

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      recoverability: this.recoverability,
      timestamp: this.timestamp,
      metadata: this.metadata,
    };
  }
}

export class ValidationError extends FitNovaError {
  constructor(message: string, options: ErrorOptions = {}) {
    super('VALIDATION_ERROR', message, {
      recoverability: 'fatal',
      ...options,
    });
  }
}

export class NetworkError extends FitNovaError {
  readonly statusCode?: number;

  constructor(message: string, options: ErrorOptions & { statusCode?: number } = {}) {
    super('NETWORK_ERROR', message, {
      recoverability: 'retryable',
      ...options,
    });
    this.statusCode = options.statusCode;
    if (options.statusCode) {
      this.metadata['statusCode'] = options.statusCode;
    }
  }
}

export class AuthenticationError extends FitNovaError {
  constructor(message: string = 'Authentication required or token expired', options: ErrorOptions = {}) {
    super('AUTHENTICATION_ERROR', message, {
      recoverability: 'fatal',
      ...options,
    });
  }
}

export class AuthorizationError extends FitNovaError {
  constructor(message: string = 'Access denied', options: ErrorOptions = {}) {
    super('AUTHORIZATION_ERROR', message, {
      recoverability: 'fatal',
      ...options,
    });
  }
}

export class StorageError extends FitNovaError {
  constructor(message: string, options: ErrorOptions = {}) {
    super('STORAGE_ERROR', message, {
      recoverability: 'transient',
      ...options,
    });
  }
}

export class AIError extends FitNovaError {
  readonly provider?: string;

  constructor(message: string, options: ErrorOptions & { provider?: string } = {}) {
    super('AI_ERROR', message, {
      recoverability: 'retryable',
      ...options,
    });
    this.provider = options.provider;
    if (options.provider) {
      this.metadata['provider'] = options.provider;
    }
  }
}

export class ProviderError extends FitNovaError {
  constructor(message: string, options: ErrorOptions = {}) {
    super('PROVIDER_ERROR', message, {
      recoverability: 'retryable',
      ...options,
    });
  }
}

export class TimeoutError extends FitNovaError {
  constructor(message: string = 'Operation timed out', options: ErrorOptions = {}) {
    super('TIMEOUT_ERROR', message, {
      recoverability: 'retryable',
      ...options,
    });
  }
}

export class SyncError extends FitNovaError {
  constructor(message: string, options: ErrorOptions = {}) {
    super('SYNC_ERROR', message, {
      recoverability: 'retryable',
      ...options,
    });
  }
}

export class ConfigurationError extends FitNovaError {
  constructor(message: string, options: ErrorOptions = {}) {
    super('CONFIGURATION_ERROR', message, {
      recoverability: 'fatal',
      ...options,
    });
  }
}

export class UnknownError extends FitNovaError {
  constructor(message: string = 'An unknown error occurred', options: ErrorOptions = {}) {
    super('UNKNOWN_ERROR', message, {
      recoverability: 'transient',
      ...options,
    });
  }
}
