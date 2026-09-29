/**
 * FitNova AI — Sync Engine
 * Orchestrates synchronization of queued offline operations and conflict resolution.
 */

import type {
  SyncStatus,
  ConflictResolutionStrategy,
  CustomConflictResolver,
  SyncOperation,
  SyncResult,
  UnsubscribeFn,
} from '../types/index.ts';
import type { OfflineManager } from '../offline/OfflineManager.ts';
import type { EventBus } from '../events/EventBus.ts';
import type { NetworkService } from '../network/NetworkService.ts';

export type SyncProcessorFn = (operation: SyncOperation) => Promise<SyncResult>;

export interface SyncReport {
  syncId: string;
  total: number;
  synced: number;
  failed: number;
  durationMs: number;
}

export interface SyncManagerConfig {
  offlineManager: OfflineManager;
  eventBus?: EventBus;
  network?: NetworkService;
  conflictStrategy?: ConflictResolutionStrategy;
  customResolver?: CustomConflictResolver;
}

export class SyncManager {
  private status: SyncStatus = 'idle';
  private readonly offlineManager: OfflineManager;
  private readonly eventBus?: EventBus;
  private readonly network?: NetworkService;
  private conflictStrategy: ConflictResolutionStrategy;
  private customResolver?: CustomConflictResolver;
  private syncCounter = 0;
  private networkUnsubscribe?: UnsubscribeFn;

  constructor(config: SyncManagerConfig) {
    this.offlineManager = config.offlineManager;
    this.eventBus = config.eventBus;
    this.network = config.network;
    this.conflictStrategy = config.conflictStrategy ?? 'server_wins';
    this.customResolver = config.customResolver;

    if (this.network) {
      this.attachNetworkListener(this.network);
    }
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  setConflictStrategy(
    strategy: ConflictResolutionStrategy,
    customResolver?: CustomConflictResolver
  ): void {
    this.conflictStrategy = strategy;
    if (customResolver) {
      this.customResolver = customResolver;
    }
  }

  resolveConflict<T>(
    clientData: T,
    serverData: T,
    clientTimestamp: number = 0,
    serverTimestamp: number = 0
  ): T {
    switch (this.conflictStrategy) {
      case 'server_wins':
        return serverData;
      case 'client_wins':
        return clientData;
      case 'latest_timestamp':
        return clientTimestamp >= serverTimestamp ? clientData : serverData;
      case 'custom':
        if (this.customResolver) {
          return this.customResolver(clientData, serverData) as T;
        }
        return serverData;
    }
  }

  resolveWorkoutSessionConflict(
    localSession: Record<string, unknown>,
    serverSession: Record<string, unknown>,
    strategy: ConflictResolutionStrategy = this.conflictStrategy
  ): Record<string, unknown> {
    if (strategy === 'client_wins') {
      return localSession;
    }
    if (strategy === 'server_wins') {
      // Preserve local un-synced completed sets so no data is silently lost
      const localExercises = (localSession.exercises as Array<Record<string, unknown>>) || [];
      const serverExercises = (serverSession.exercises as Array<Record<string, unknown>>) || [];

      // Merge exercises & sets
      const mergedExercises = serverExercises.map((se) => ({ ...(se as any), sets: [...((se.sets as Array<Record<string, unknown>>) || [])] }));
      for (const localEx of localExercises) {
        const serverEx = mergedExercises.find((se) => (se as any).exerciseId === (localEx as any).exerciseId);
        if (!serverEx) {
          mergedExercises.push(localEx as any);
        } else {
          const localSets = (localEx.sets as Array<Record<string, unknown>>) || [];
          const serverSets = (serverEx.sets as Array<Record<string, unknown>>) || [];

          for (const ls of localSets) {
            const ssIndex = serverSets.findIndex((ss) => ss.setNumber === ls.setNumber);
            if (ssIndex === -1) {
              serverSets.push(ls);
            } else if (ls.completed && !serverSets[ssIndex].completed) {
              serverSets[ssIndex] = ls;
            }
          }
          serverEx.sets = serverSets;
        }
      }

      return {
        ...serverSession,
        exercises: mergedExercises,
        notes: (localSession.notes as string) || (serverSession.notes as string),
        rating: (localSession.rating as number) ?? (serverSession.rating as number),
      };
    }
    if (strategy === 'latest_timestamp') {
      const localTs = (localSession.endedAt as number) || (localSession.startedAt as number) || 0;
      const serverTs = (serverSession.endedAt as number) || (serverSession.startedAt as number) || 0;
      return localTs >= serverTs ? localSession : serverSession;
    }
    if (strategy === 'custom' && this.customResolver) {
      return this.customResolver(localSession, serverSession) as Record<string, unknown>;
    }
    return serverSession;
  }

  private calculateBackoffMs(retryCount: number): number {
    const base = 1000;
    const maxBackoff = 30000;
    const exponential = Math.min(maxBackoff, base * Math.pow(2, retryCount));
    const jitter = Math.floor(Math.random() * 500);
    return exponential + jitter;
  }

  attachNetworkListener(networkService: NetworkService): UnsubscribeFn {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
    }

    this.networkUnsubscribe = networkService.subscribe((netStatus) => {
      // Automatically trigger synchronization when network returns online and there are pending items
      if (netStatus.isOnline && this.offlineManager.getPendingCount() > 0 && this.status === 'idle') {
        // Will sync once processor is provided
      }
    });

    return this.networkUnsubscribe;
  }

  async sync(processor?: SyncProcessorFn): Promise<SyncReport> {
    if (this.status === 'syncing') {
      return {
        syncId: `sync_skipped_${Date.now()}`,
        total: 0,
        synced: 0,
        failed: 0,
        durationMs: 0,
      };
    }

    const pendingOps = this.offlineManager.getPendingOperations();
    const syncId = `sync_${Date.now()}_${++this.syncCounter}`;
    const startTime = Date.now();

    if (pendingOps.length === 0) {
      this.status = 'idle';
      return {
        syncId,
        total: 0,
        synced: 0,
        failed: 0,
        durationMs: 0,
      };
    }

    this.status = 'syncing';

    if (this.eventBus) {
      this.eventBus.emit('SYNC_STARTED', {
        syncId,
        pendingCount: pendingOps.length,
        timestamp: startTime,
      });
    }

    let syncedCount = 0;
    let failedCount = 0;

    const queueInstance = this.offlineManager.getQueueInstance();

    for (const op of pendingOps) {
      // If exponential backoff window has not elapsed yet, skip this operation for now
      // This ensures transient failures do not block the rest of the queue
      const now = Date.now();
      if (op.lastAttemptAt && op.backoffMs && now < op.lastAttemptAt + op.backoffMs) {
        continue;
      }

      queueInstance.update(op.id, { status: 'processing', lastAttemptAt: Date.now() });

      try {
        let result: SyncResult;

        if (processor) {
          result = await processor(op);
        } else {
          // Default dry-run/mock sync (acknowledges without remote call)
          result = { operationId: op.id, success: true };
        }

        if (result.success) {
          syncedCount++;
          queueInstance.update(op.id, { status: 'completed' });
          this.offlineManager.removeOperation(op.id);
        } else {
          failedCount++;
          const nextRetry = op.retryCount + 1;
          const isDeadLetter = nextRetry >= op.maxRetries;
          const backoffMs = this.calculateBackoffMs(nextRetry);
          queueInstance.update(op.id, {
            status: isDeadLetter ? 'dead_letter' : 'pending',
            retryCount: nextRetry,
            lastAttemptAt: Date.now(),
            backoffMs,
            error: result.error ?? 'Sync processing failed',
          });
        }
      } catch (err) {
        failedCount++;
        const nextRetry = op.retryCount + 1;
        const isDeadLetter = nextRetry >= op.maxRetries;
        const backoffMs = this.calculateBackoffMs(nextRetry);
        queueInstance.update(op.id, {
          status: isDeadLetter ? 'dead_letter' : 'pending',
          retryCount: nextRetry,
          lastAttemptAt: Date.now(),
          backoffMs,
          error: err instanceof Error ? err.message : 'Unknown sync error',
        });
      }
    }

    const durationMs = Date.now() - startTime;
    const isOverallSuccess = failedCount === 0;
    this.status = isOverallSuccess ? 'success' : 'failed';

    if (this.eventBus) {
      if (isOverallSuccess) {
        this.eventBus.emit('SYNC_COMPLETED', {
          syncId,
          syncedCount,
          failedCount,
          durationMs,
          timestamp: Date.now(),
        });
      } else {
        this.eventBus.emit('SYNC_FAILED', {
          syncId,
          failedCount,
          error: `${failedCount} of ${pendingOps.length} operations failed to synchronize.`,
          timestamp: Date.now(),
        });
      }
    }

    return {
      syncId,
      total: pendingOps.length,
      synced: syncedCount,
      failed: failedCount,
      durationMs,
    };
  }

  destroy(): void {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
    }
  }
}
