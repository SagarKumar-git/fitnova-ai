import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HealthSyncManager } from '../HealthSyncManager.ts';

describe('HealthSyncManager', () => {
  let mockHealthDataService: any;
  let mockEventBus: any;
  let mockLogger: any;
  let syncManager: HealthSyncManager;

  beforeEach(() => {
    mockHealthDataService = {
      connect: vi.fn().mockResolvedValue(undefined),
      getComprehensiveDataset: vi.fn().mockResolvedValue({
        recoveryScore: { confidence: 0.9 },
        heartRate: { confidence: 0.8 }
      })
    };

    mockEventBus = {
      emit: vi.fn(),
      subscribe: vi.fn().mockReturnValue(() => {})
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn()
    };

    vi.useFakeTimers();
    syncManager = new HealthSyncManager(mockHealthDataService as any, mockEventBus as any, mockLogger as any);
  });

  afterEach(() => {
    syncManager.cleanup();
    vi.restoreAllMocks();
  });

  it('should emit HEALTH_SYNC_STARTED on syncNow', async () => {
    await syncManager.syncNow();
    expect(mockEventBus.emit).toHaveBeenCalledWith('HEALTH_SYNC_STARTED', expect.any(Object));
  });

  it('should emit HEALTH_SYNC_COMPLETED and ADAPTIVE_DECISION_UPDATED on successful sync', async () => {
    await syncManager.syncNow();
    expect(mockEventBus.emit).toHaveBeenCalledWith('HEALTH_SYNC_COMPLETED', expect.any(Object));
    expect(mockEventBus.emit).toHaveBeenCalledWith('ADAPTIVE_DECISION_UPDATED', expect.any(Object));
  });

  it('should emit HEALTH_SYNC_FAILED on error', async () => {
    mockHealthDataService.getComprehensiveDataset.mockRejectedValue(new Error('Network error'));
    await syncManager.syncNow();
    expect(mockEventBus.emit).toHaveBeenCalledWith('HEALTH_SYNC_FAILED', expect.objectContaining({ error: 'Network error' }));
  });

  it('should not allow concurrent syncs', async () => {
    // Delay resolution to simulate ongoing sync
    let resolveSync: any;
    const syncPromise = new Promise(resolve => { resolveSync = resolve; });
    mockHealthDataService.getComprehensiveDataset.mockReturnValue(syncPromise);

    syncManager.syncNow(); // First call starts syncing
    await Promise.resolve(); // Allow event loop to tick

    await syncManager.syncNow(); // Second call should be ignored

    expect(mockEventBus.emit).toHaveBeenCalledTimes(1); // Only one HEALTH_SYNC_STARTED

    resolveSync({
        recoveryScore: { confidence: 0.9 },
        formQuality: { confidence: 0.8 }
    });
  });
});
