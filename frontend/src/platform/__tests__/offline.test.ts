/**
 * FitNova AI — Offline Foundation Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OfflineManager } from '../offline/OfflineManager.ts';
import { StorageService } from '../storage/StorageService.ts';
import { MemoryStorageAdapter } from '../storage/MemoryStorageAdapter.ts';

describe('OfflineManager & SyncQueue', () => {
  let storage: StorageService;
  let offlineManager: OfflineManager;

  beforeEach(() => {
    storage = new StorageService({
      adapter: new MemoryStorageAdapter(),
      namespace: 'offline_test:',
    });

    offlineManager = new OfflineManager({
      storage,
      maxQueueSize: 5,
    });
  });

  it('queues offline operations with pending status and auto-generated IDs', () => {
    const op = offlineManager.queueOperation({
      type: 'LOG_SET',
      endpoint: '/api/workouts/sessions/log-set',
      method: 'POST',
      payload: { exerciseId: 'bench_press', reps: 10, weightKg: 100 },
      maxRetries: 3,
    });

    expect(op.id).toBeDefined();
    expect(op.status).toBe('pending');
    expect(op.retryCount).toBe(0);
    expect(offlineManager.getPendingCount()).toBe(1);
  });

  it('persists queue across manager reinstantiation', () => {
    offlineManager.queueOperation({
      type: 'LOG_WATER',
      endpoint: '/api/logs/water',
      method: 'POST',
      payload: { amountMl: 500 },
      maxRetries: 3,
    });

    // Recreate manager with same storage
    const newManager = new OfflineManager({ storage });
    expect(newManager.getPendingCount()).toBe(1);
    const queue = newManager.getQueue();
    expect(queue[0].type).toBe('LOG_WATER');
  });

  it('retries operations by resetting retryCount and status to pending', () => {
    const op = offlineManager.queueOperation({
      type: 'SYNC_MEAL',
      endpoint: '/api/logs/nutrition',
      method: 'POST',
      payload: { food: 'Oats' },
      maxRetries: 3,
    });

    // Simulate failure
    offlineManager.getQueueInstance().update(op.id, {
      status: 'failed',
      retryCount: 3,
      error: 'Network failure',
    });

    expect(offlineManager.getPendingCount()).toBe(0);

    const retried = offlineManager.retryOperation(op.id);
    expect(retried).toBe(true);
    expect(offlineManager.getPendingCount()).toBe(1);

    const updatedOp = offlineManager.getOperation(op.id);
    expect(updatedOp?.status).toBe('pending');
    expect(updatedOp?.retryCount).toBe(0);
    expect(updatedOp?.error).toBeUndefined();
  });

  it('removes and clears operations cleanly', () => {
    const op1 = offlineManager.queueOperation({
      type: 'OP1',
      endpoint: '/api/1',
      method: 'POST',
    });
    offlineManager.queueOperation({
      type: 'OP2',
      endpoint: '/api/2',
      method: 'POST',
    });

    expect(offlineManager.getQueue().length).toBe(2);

    offlineManager.removeOperation(op1.id);
    expect(offlineManager.getQueue().length).toBe(1);
    expect(offlineManager.getOperation(op1.id)).toBeUndefined();

    offlineManager.clearQueue();
    expect(offlineManager.getQueue().length).toBe(0);
  });
});
