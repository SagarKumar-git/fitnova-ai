/**
 * FitNova AI — Offline Sync Queue
 * Persistent offline operation queue backed by StorageService.
 */

import type { SyncOperation } from '../types/index.ts';
import type { StorageService } from '../storage/StorageService.ts';

export interface SyncQueueConfig {
  storage?: StorageService;
  storageKey?: string;
  maxQueueSize?: number;
}

export class SyncQueue {
  private readonly storage?: StorageService;
  private readonly storageKey: string;
  private readonly maxQueueSize: number;
  private queue: SyncOperation[] = [];

  constructor(config: SyncQueueConfig = {}) {
    this.storage = config.storage;
    this.storageKey = config.storageKey ?? 'offline_sync_queue';
    this.maxQueueSize = config.maxQueueSize ?? 100;
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (!this.storage) return;

    try {
      const saved = this.storage.getJSON<SyncOperation[]>(this.storageKey, []);
      if (Array.isArray(saved)) {
        this.queue = saved;
      }
    } catch {
      this.queue = [];
    }
  }

  private persist(): void {
    if (!this.storage) return;

    try {
      this.storage.setJSON(this.storageKey, this.queue);
    } catch {
      // Safe fallback
    }
  }

  enqueue(operation: SyncOperation): void {
    // If queue exceeds max size, drop oldest completed or failed operation
    if (this.queue.length >= this.maxQueueSize) {
      const dropIndex = this.queue.findIndex(
        (op) => op.status === 'completed' || op.status === 'failed'
      );
      if (dropIndex >= 0) {
        this.queue.splice(dropIndex, 1);
      } else {
        // Drop oldest pending
        this.queue.shift();
      }
    }

    this.queue.push(operation);
    this.persist();
  }

  dequeue(): SyncOperation | undefined {
    const op = this.queue.shift();
    if (op) {
      this.persist();
    }
    return op;
  }

  peek(): SyncOperation | undefined {
    return this.queue[0];
  }

  getPending(): SyncOperation[] {
    return this.queue.filter((op) => op.status === 'pending');
  }

  getAll(): SyncOperation[] {
    return [...this.queue];
  }

  getById(id: string): SyncOperation | undefined {
    return this.queue.find((op) => op.id === id);
  }

  update(id: string, updates: Partial<SyncOperation>): boolean {
    const idx = this.queue.findIndex((op) => op.id === id);
    if (idx === -1) return false;

    this.queue[idx] = { ...this.queue[idx], ...updates };
    this.persist();
    return true;
  }

  remove(id: string): boolean {
    const prevLen = this.queue.length;
    this.queue = this.queue.filter((op) => op.id !== id);
    if (this.queue.length !== prevLen) {
      this.persist();
      return true;
    }
    return false;
  }

  clear(): void {
    this.queue = [];
    this.persist();
  }

  size(): number {
    return this.queue.length;
  }
}
