/**
 * FitNova AI — Sync Engine Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncManager } from '../sync/SyncManager.ts';
import { OfflineManager } from '../offline/OfflineManager.ts';
import { EventBus } from '../events/EventBus.ts';
import { StorageService } from '../storage/StorageService.ts';
import { MemoryStorageAdapter } from '../storage/MemoryStorageAdapter.ts';

describe('SyncManager', () => {
  let offlineManager: OfflineManager;
  let eventBus: EventBus;
  let syncManager: SyncManager;

  beforeEach(() => {
    const storage = new StorageService({
      adapter: new MemoryStorageAdapter(),
      namespace: 'sync_test:',
    });

    offlineManager = new OfflineManager({ storage });
    eventBus = new EventBus();

    syncManager = new SyncManager({
      offlineManager,
      eventBus,
      conflictStrategy: 'server_wins',
    });
  });

  it('starts in idle status and reports 0 syncs when queue is empty', async () => {
    expect(syncManager.getStatus()).toBe('idle');
    const report = await syncManager.sync();
    expect(report.total).toBe(0);
    expect(report.synced).toBe(0);
    expect(syncManager.getStatus()).toBe('idle');
  });

  it('processes queued operations and emits SYNC_STARTED and SYNC_COMPLETED', async () => {
    const syncStartedSpy = vi.fn();
    const syncCompletedSpy = vi.fn();

    eventBus.subscribe('SYNC_STARTED', syncStartedSpy);
    eventBus.subscribe('SYNC_COMPLETED', syncCompletedSpy);

    offlineManager.queueOperation({
      type: 'LOG_WORKOUT',
      endpoint: '/api/workouts/sessions/finish',
      method: 'POST',
      payload: { sessionId: 's_1' },
    });

    const report = await syncManager.sync(async (op) => {
      expect(op.type).toBe('LOG_WORKOUT');
      return { operationId: op.id, success: true };
    });

    expect(report.total).toBe(1);
    expect(report.synced).toBe(1);
    expect(report.failed).toBe(0);
    expect(syncManager.getStatus()).toBe('success');
    expect(syncStartedSpy).toHaveBeenCalledTimes(1);
    expect(syncCompletedSpy).toHaveBeenCalledTimes(1);
    expect(offlineManager.getPendingCount()).toBe(0);
  });

  it('handles failed operations and updates retry counts', async () => {
    const syncFailedSpy = vi.fn();
    eventBus.subscribe('SYNC_FAILED', syncFailedSpy);

    offlineManager.queueOperation({
      type: 'FAILING_OP',
      endpoint: '/api/fail',
      method: 'POST',
      maxRetries: 2,
    });

    const report = await syncManager.sync(async (op) => {
      return { operationId: op.id, success: false, error: 'Server unavailable (503)' };
    });

    expect(report.failed).toBe(1);
    expect(syncManager.getStatus()).toBe('failed');
    expect(syncFailedSpy).toHaveBeenCalledTimes(1);
    expect(offlineManager.getPendingCount()).toBe(1); // Still pending retry (retryCount 1 < maxRetries 2)
  });

  it('resolves conflicts based on conflict strategies', () => {
    const clientState = { weight: 78 };
    const serverState = { weight: 80 };

    // 1. Server wins
    syncManager.setConflictStrategy('server_wins');
    expect(syncManager.resolveConflict(clientState, serverState)).toBe(serverState);

    // 2. Client wins
    syncManager.setConflictStrategy('client_wins');
    expect(syncManager.resolveConflict(clientState, serverState)).toBe(clientState);

    // 3. Latest timestamp
    syncManager.setConflictStrategy('latest_timestamp');
    expect(syncManager.resolveConflict(clientState, serverState, 200, 100)).toBe(clientState);
    expect(syncManager.resolveConflict(clientState, serverState, 100, 200)).toBe(serverState);

    // 4. Custom resolver
    syncManager.setConflictStrategy('custom', (c, s) => ({ weight: Math.max((c as typeof clientState).weight, (s as typeof serverState).weight) }));
    expect(syncManager.resolveConflict(clientState, serverState)).toEqual({ weight: 80 });
  });
});
