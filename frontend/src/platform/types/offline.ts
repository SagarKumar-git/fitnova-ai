/**
 * FitNova AI — Platform Offline & Sync Types
 * Foundational models for offline operation queues, synchronization, and conflict resolution.
 */

export type SyncStatus = 'idle' | 'queued' | 'syncing' | 'success' | 'failed' | 'conflict';

export type ConflictResolutionStrategy =
  | 'server_wins'
  | 'client_wins'
  | 'latest_timestamp'
  | 'custom';

export type SyncOperationStatus = 'pending' | 'processing' | 'failed' | 'completed';

export interface SyncOperation<TPayload = unknown> {
  id: string;
  type: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload?: TPayload;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: SyncOperationStatus;
  lastAttemptAt?: number;
  error?: string;
  correlationId?: string;
}

export interface SyncResult {
  operationId: string;
  success: boolean;
  statusCode?: number;
  error?: string;
}

export type CustomConflictResolver<T = unknown> = (clientData: T, serverData: T) => T;
