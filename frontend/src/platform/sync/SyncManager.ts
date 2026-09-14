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
          queueInstance.update(op.id, {
            status: nextRetry >= op.maxRetries ? 'failed' : 'pending',
            retryCount: nextRetry,
            error: result.error ?? 'Sync processing failed',
          });
        }
      } catch (err) {
        failedCount++;
        const nextRetry = op.retryCount + 1;
        queueInstance.update(op.id, {
          status: nextRetry >= op.maxRetries ? 'failed' : 'pending',
          retryCount: nextRetry,
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
