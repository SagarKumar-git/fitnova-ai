/**
 * FitNova AI — Offline Manager
 * Coordinates local offline queues, retries, and inspection for offline-first readiness.
 */

import type { SyncOperation } from '../types/index.ts';
import type { StorageService } from '../storage/StorageService.ts';
import type { NetworkService } from '../network/NetworkService.ts';
import { SyncQueue } from './SyncQueue.ts';

export interface OfflineManagerConfig {
  storage?: StorageService;
  network?: NetworkService;
  maxQueueSize?: number;
}

export class OfflineManager {
  private readonly syncQueue: SyncQueue;
  private readonly network?: NetworkService;
  private counter = 0;

  constructor(config: OfflineManagerConfig = {}) {
    this.network = config.network;
    this.syncQueue = new SyncQueue({
      storage: config.storage,
      maxQueueSize: config.maxQueueSize,
    });
  }

  isOnline(): boolean {
    return this.network ? this.network.isOnline() : true;
  }

  queueOperation<T = unknown>(
    params: Omit<SyncOperation<T>, 'id' | 'timestamp' | 'retryCount' | 'status' | 'maxRetries'> & {
      maxRetries?: number;
    }
  ): SyncOperation<T> {
    const id = `op_${Date.now()}_${++this.counter}`;

    const operation: SyncOperation<T> = {
      ...params,
      id,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: params.maxRetries ?? 3,
      status: 'pending',
    };

    this.syncQueue.enqueue(operation as SyncOperation<unknown>);
    return operation;
  }

  getOperation(id: string): SyncOperation | undefined {
    return this.syncQueue.getById(id);
  }

  getQueue(): SyncOperation[] {
    return this.syncQueue.getAll();
  }

  getPendingOperations(): SyncOperation[] {
    return this.syncQueue.getPending();
  }

  getPendingCount(): number {
    return this.syncQueue.getPending().length;
  }

  retryOperation(id: string): boolean {
    const op = this.syncQueue.getById(id);
    if (!op) return false;

    return this.syncQueue.update(id, {
      status: 'pending',
      retryCount: 0,
      error: undefined,
    });
  }

  removeOperation(id: string): boolean {
    return this.syncQueue.remove(id);
  }

  clearQueue(): void {
    this.syncQueue.clear();
  }

  getQueueInstance(): SyncQueue {
    return this.syncQueue;
  }
}
