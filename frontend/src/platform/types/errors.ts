/**
 * FitNova AI — Platform Error Types
 * Standardized error taxonomy and metadata contracts.
 */

export type ErrorRecoverability = 'retryable' | 'fatal' | 'transient';

export type PlatformErrorCode =
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'STORAGE_ERROR'
  | 'AI_ERROR'
  | 'PROVIDER_ERROR'
  | 'TIMEOUT_ERROR'
  | 'SYNC_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'UNKNOWN_ERROR';

export interface PlatformErrorContract {
  name: string;
  code: PlatformErrorCode | string;
  message: string;
  cause?: unknown;
  metadata?: Record<string, unknown>;
  timestamp: number;
  recoverability: ErrorRecoverability;
}
