/**
 * FitNova AI — Sprint 4.7: Offline, Sync & Crash Recovery Hardening Test Suite
 * Validates network disconnects, offline set logging, queue persistence,
 * network restoration, duplicate sync prevention, exponential backoff,
 * conflict resolution, browser refresh, state restoration, crash recovery,
 * session discard, and background tab / device sleep reconciliation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkoutService } from '../services/WorkoutService.ts';
import { MockWorkoutRepository } from '../repositories/MockWorkoutRepository.ts';
import { EventBus } from '../../../platform/events/EventBus.ts';
import { AnalyticsService } from '../../../platform/analytics/AnalyticsService.ts';
import { NotificationService } from '../../../platform/notifications/NotificationService.ts';
import { StorageService } from '../../../platform/storage/StorageService.ts';
import { MemoryStorageAdapter } from '../../../platform/storage/MemoryStorageAdapter.ts';
import { OfflineManager } from '../../../platform/offline/OfflineManager.ts';
import { SyncManager } from '../../../platform/sync/SyncManager.ts';
import { NetworkService } from '../../../platform/network/NetworkService.ts';
import type { SyncOperation, SyncResult } from '../../../platform/types/index.ts';

describe('Sprint 4.7 — Offline, Sync & Crash Recovery Hardening', () => {
  let storage: StorageService;
  let repository: MockWorkoutRepository;
  let eventBus: EventBus;
  let analytics: AnalyticsService;
  let notifications: NotificationService;
  let networkService: NetworkService;
  let offlineManager: OfflineManager;
  let syncManager: SyncManager;
  let service: WorkoutService;

  beforeEach(() => {
    vi.useFakeTimers();
    storage = new StorageService({ adapter: new MemoryStorageAdapter() });
    repository = new MockWorkoutRepository({ storageService: storage });
    eventBus = new EventBus();
    analytics = new AnalyticsService({ enabled: true });
    notifications = new NotificationService();
    networkService = new NetworkService({ initialOnline: true, eventBus });
    offlineManager = new OfflineManager({ storage, network: networkService });
    syncManager = new SyncManager({ offlineManager, eventBus, network: networkService });

    service = new WorkoutService({
      repository,
      eventBus,
      analytics,
      notifications,
      offlineManager,
      syncManager,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Tasks 1 & 2: Active workout -> network disconnect & status change to offline
  // ==========================================================================
  describe('Tasks 1 & 2: Active Workout Network Disconnect & Status Transition', () => {
    it('transitions active session to offline and persists status when network disconnects', async () => {
      const session = await service.startWorkout({ workoutId: 'workout_push_strength' });
      expect(session.status).toBe('active');

      // Simulate network disconnect
      networkService.setOnline(false);
      eventBus.emit('NETWORK_OFFLINE', { timestamp: Date.now() });

      const updated = await service.setSessionOffline(session.id);
      expect(updated?.status).toBe('offline');

      // Verify persistent storage in repository matches offline status
      const saved = await repository.getActiveSession();
      expect(saved?.status).toBe('offline');
    });
  });

  // ==========================================================================
  // Tasks 3, 4, 5: Logging sets while offline, local persistence & queueing
  // ==========================================================================
  describe('Tasks 3, 4, 5: Offline Set Logging, Persistence & Operation Queueing', () => {
    it('continues logging sets while offline, persists all mutations locally, and queues operations', async () => {
      const session = await service.startWorkout({ workoutId: 'workout_push_strength' });
      const ex = session.exercises[0];
      const set1 = ex.sets[0];
      const set2 = ex.sets[1];

      // Disconnect network
      networkService.setOnline(false);
      await service.setSessionOffline(session.id);

      // Log Set 1 offline
      const res1 = await service.completeSet({
        sessionId: session.id,
        exerciseId: ex.exerciseId,
        setId: set1.id,
        reps: 10,
        weight: 80,
        rpe: 8,
      });

      expect(res1.set.completed).toBe(true);
      expect(res1.set.actualReps).toBe(10);
      expect(res1.set.actualWeight).toBe(80);
      expect(res1.set.rpe).toBe(8);
      expect(res1.session.totalVolume).toBe(800);

      // Verify local storage repository persisted this set mutation
      const storedAfterSet1 = await repository.getActiveSession();
      const storedSet1 = storedAfterSet1?.exercises[0].sets[0];
      expect(storedSet1?.completed).toBe(true);
      expect(storedSet1?.actualReps).toBe(10);
      expect(storedSet1?.actualWeight).toBe(80);
      expect(storedAfterSet1?.totalVolume).toBe(800);

      // Log Set 2 offline
      const res2 = await service.completeSet({
        sessionId: session.id,
        exerciseId: ex.exerciseId,
        setId: set2.id,
        reps: 8,
        weight: 85,
        rpe: 9,
      });

      expect(res2.session.totalVolume).toBe(800 + 680); // 1480kg

      // Check OfflineManager Queue
      const pendingOps = offlineManager.getPendingOperations();
      expect(pendingOps.length).toBe(2);
      expect(pendingOps[0].type).toBe('WORKOUT_LOG_SET');
      expect((pendingOps[0].payload as any).reps).toBe(10);
      expect((pendingOps[0].payload as any).weight).toBe(80);
      expect(pendingOps[1].type).toBe('WORKOUT_LOG_SET');
      expect((pendingOps[1].payload as any).reps).toBe(8);
      expect((pendingOps[1].payload as any).weight).toBe(85);
    });
  });

  // ==========================================================================
  // Tasks 6 & 7: Network restoration & transition: offline -> syncing -> active
  // ==========================================================================
  describe('Tasks 6 & 7: Network Restoration & Status Transitions', () => {
    it('transitions offline -> syncing -> active upon network restoration', async () => {
      const session = await service.startWorkout({ workoutId: 'workout_push_strength' });
      await service.setSessionOffline(session.id);

      // Log set while offline to have pending sync queue item
      networkService.setOnline(false);
      await service.completeSet({
        sessionId: session.id,
        exerciseId: session.exercises[0].exerciseId,
        setId: session.exercises[0].sets[0].id,
        reps: 10,
        weight: 75,
      });

      expect(offlineManager.getPendingCount()).toBe(1);

      // Track sync events
      const syncStates: string[] = [];
      eventBus.subscribe('SYNC_STARTED', () => { syncStates.push('syncing'); });
      eventBus.subscribe('SYNC_COMPLETED', () => { syncStates.push('completed'); });

      // Restore network connection
      networkService.setOnline(true);
      await Promise.resolve();

      // Verify sync triggered automatically and queue emptied
      expect(syncStates).toContain('syncing');
      expect(syncStates).toContain('completed');
      expect(offlineManager.getPendingCount()).toBe(0);

      // Transition session back to active
      const activeAfterSync = await service.setSessionActive(session.id);
      expect(activeAfterSync?.status).toBe('active');
    });
  });

  // ==========================================================================
  // Task 8: Replay queued operations exactly once
  // ==========================================================================
  describe('Task 8: Exactly-Once Queue Replay', () => {
    it('replays queued operations exactly once and empties the queue', async () => {
      offlineManager.queueOperation({
        type: 'WORKOUT_LOG_SET',
        endpoint: '/workouts/sessions/log-set',
        method: 'POST',
        payload: { exercise_id: 'ex_1', reps: 10, weight: 100 },
      });
      offlineManager.queueOperation({
        type: 'WORKOUT_LOG_SET',
        endpoint: '/workouts/sessions/log-set',
        method: 'POST',
        payload: { exercise_id: 'ex_1', reps: 8, weight: 105 },
      });

      expect(offlineManager.getPendingCount()).toBe(2);

      const processedIds: string[] = [];
      const processor = vi.fn().mockImplementation(async (op: SyncOperation): Promise<SyncResult> => {
        processedIds.push(op.id);
        return { operationId: op.id, success: true };
      });

      const report1 = await syncManager.sync(processor);
      expect(report1.synced).toBe(2);
      expect(processedIds.length).toBe(2);
      expect(offlineManager.getPendingCount()).toBe(0);

      // Subsequent sync runs: should find 0 pending operations
      const report2 = await syncManager.sync(processor);
      expect(report2.total).toBe(0);
      expect(report2.synced).toBe(0);
      expect(processor).toHaveBeenCalledTimes(2); // no second replay!
    });
  });

  // ==========================================================================
  // Task 9: Prevent duplicate synchronization
  // ==========================================================================
  describe('Task 9: Concurrency Guard & Duplicate Sync Prevention', () => {
    it('skips concurrent sync requests when synchronization is already in progress', async () => {
      offlineManager.queueOperation({
        type: 'WORKOUT_LOG_SET',
        endpoint: '/workouts/sessions/log-set',
        method: 'POST',
        payload: { exercise_id: 'ex_1', reps: 10, weight: 100 },
      });

      let resolveSync!: (value: SyncResult) => void;
      const delayedPromise = new Promise<SyncResult>((resolve) => {
        resolveSync = resolve;
      });

      const processor = vi.fn().mockImplementation(() => delayedPromise);

      // Start first sync
      const firstSyncPromise = syncManager.sync(processor);
      expect(syncManager.getStatus()).toBe('syncing');

      // Attempt second parallel sync while first is still running
      const secondSyncPromise = syncManager.sync(processor);
      const secondReport = await secondSyncPromise;

      expect(secondReport.total).toBe(0);
      expect(secondReport.synced).toBe(0);
      expect(secondReport.syncId).toContain('sync_skipped');

      // Resolve the ongoing first sync
      resolveSync({ operationId: 'op_test', success: true });
      const firstReport = await firstSyncPromise;

      expect(firstReport.synced).toBe(1);
      expect(processor).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Task 10: Exponential retry / backoff
  // ==========================================================================
  describe('Task 10: Exponential Retry / Backoff', () => {
    it('applies exponential backoff on failure, skips during backoff, and marks dead_letter on max retries', async () => {
      const op = offlineManager.queueOperation({
        type: 'WORKOUT_LOG_SET',
        endpoint: '/workouts/sessions/log-set',
        method: 'POST',
        payload: { exercise_id: 'ex_1', reps: 5, weight: 120 },
        maxRetries: 2,
      });

      const failProcessor = vi.fn().mockResolvedValue({
        operationId: op.id,
        success: false,
        error: '503 Service Unavailable',
      });

      // Attempt 1: Fails
      const report1 = await syncManager.sync(failProcessor);
      expect(report1.failed).toBe(1);

      const opAfterFail1 = offlineManager.getOperation(op.id);
      expect(opAfterFail1?.retryCount).toBe(1);
      expect(opAfterFail1?.status).toBe('pending');
      expect(opAfterFail1?.backoffMs).toBeGreaterThanOrEqual(1000);

      // Immediate attempt 2: within backoff window -> skipped
      const report2 = await syncManager.sync(failProcessor);
      expect(report2.synced).toBe(0);
      expect(report2.failed).toBe(0); // skipped, not attempted
      expect(failProcessor).toHaveBeenCalledTimes(1); // not called again yet

      // Advance clock past backoff window (e.g. 3 seconds)
      vi.advanceTimersByTime(3500);

      // Attempt 3: Fails second time -> reaches maxRetries (2) -> dead_letter
      const report3 = await syncManager.sync(failProcessor);
      expect(report3.failed).toBe(1);

      const opAfterFail2 = offlineManager.getOperation(op.id);
      expect(opAfterFail2?.retryCount).toBe(2);
      expect(opAfterFail2?.status).toBe('dead_letter');

      // Verify dead-letter inspection & retry functionality
      expect(offlineManager.getDeadLetterOperations()).toHaveLength(1);
      const retried = offlineManager.retryDeadLetter(op.id);
      expect(retried).toBe(true);
      expect(offlineManager.getOperation(op.id)?.status).toBe('pending');
    });
  });

  // ==========================================================================
  // Task 11: Conflict-resolution strategy
  // ==========================================================================
  describe('Task 11: Conflict Resolution Strategy', () => {
    it('preserves locally completed sets when merging workout sessions with server_wins', () => {
      const localSession = {
        id: 'sess_1',
        workoutId: 'wk_1',
        exercises: [
          {
            exerciseId: 'ex_bench',
            sets: [
              { setNumber: 1, reps: 10, weight: 80, completed: true },
              { setNumber: 2, reps: 8, weight: 85, completed: true }, // completed offline
            ],
          },
        ],
        notes: 'Local athlete notes',
      };

      const serverSession = {
        id: 'sess_1',
        workoutId: 'wk_1',
        exercises: [
          {
            exerciseId: 'ex_bench',
            sets: [
              { setNumber: 1, reps: 10, weight: 80, completed: true },
              { setNumber: 2, reps: 8, weight: 85, completed: false }, // server had incomplete
            ],
          },
        ],
        notes: 'Server notes',
      };

      const resolved = syncManager.resolveWorkoutSessionConflict(localSession, serverSession, 'server_wins');
      const sets = (resolved.exercises as any[])[0].sets;

      // Set 2 must be marked completed because client logged it!
      expect(sets[1].completed).toBe(true);
      expect(sets[1].weight).toBe(85);
    });

    it('respects client_wins, latest_timestamp, and custom conflict strategies', () => {
      const clientObj = { name: 'Client Update', v: 2 };
      const serverObj = { name: 'Server Update', v: 1 };

      syncManager.setConflictStrategy('client_wins');
      expect(syncManager.resolveConflict(clientObj, serverObj)).toBe(clientObj);

      syncManager.setConflictStrategy('server_wins');
      expect(syncManager.resolveConflict(clientObj, serverObj)).toBe(serverObj);

      syncManager.setConflictStrategy('latest_timestamp');
      expect(syncManager.resolveConflict(clientObj, serverObj, 2000, 1000)).toBe(clientObj);
      expect(syncManager.resolveConflict(clientObj, serverObj, 1000, 2000)).toBe(serverObj);

      syncManager.setConflictStrategy('custom', (c, s) => ({ ...(s as any), ...(c as any) }));
      expect(syncManager.resolveConflict({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
    });
  });

  // ==========================================================================
  // Task 12: Failed synchronization and recovery
  // ==========================================================================
  describe('Task 12: Failed Synchronization & Recovery', () => {
    it('emits SYNC_FAILED on network failure, retains operations, and succeeds upon server recovery', async () => {
      offlineManager.queueOperation({
        type: 'WORKOUT_LOG_SET',
        endpoint: '/workouts/sessions/log-set',
        method: 'POST',
        payload: { exercise_id: 'ex_1', reps: 12, weight: 60 },
      });

      const failedEvents: any[] = [];
      const completedEvents: any[] = [];
      eventBus.subscribe('SYNC_FAILED', (p) => { failedEvents.push(p); });
      eventBus.subscribe('SYNC_COMPLETED', (p) => { completedEvents.push(p); });

      let shouldFail = true;
      const processor = vi.fn().mockImplementation(async (op: SyncOperation): Promise<SyncResult> => {
        if (shouldFail) {
          throw new Error('Connection refused (Server down)');
        }
        return { operationId: op.id, success: true };
      });

      // Sync while server is down
      const reportFail = await syncManager.sync(processor);
      expect(reportFail.failed).toBe(1);
      expect(failedEvents).toHaveLength(1);
      expect(offlineManager.getPendingCount()).toBe(1);

      // Server recovers; advance clock past backoff (1000 * 2^1 + jitter < 3000ms)
      shouldFail = false;
      vi.advanceTimersByTime(5000);

      const reportSuccess = await syncManager.sync(processor);
      expect(reportSuccess.synced).toBe(1);
      expect(completedEvents).toHaveLength(1);
      expect(offlineManager.getPendingCount()).toBe(0);
    });
  });

  // ==========================================================================
  // Tasks 13 & 14: Refresh browser during active workout & complete restoration
  // ==========================================================================
  describe('Tasks 13 & 14: Browser Refresh & Full State Restoration', () => {
    it('restores all session fields: workout, completed sets, reps, weight, RPE, volume, substitution, duration, and exercise indexes', async () => {
      const session = await service.startWorkout({ workoutId: 'workout_push_strength' });

      // Substitute exercise 1
      const substituteEx = {
        id: 'ex_incline_db_press',
        name: 'Incline Dumbbell Press',
        muscleGroup: 'Chest',
        defaultSets: 3,
        defaultReps: 10,
        defaultWeight: 30,
        defaultRestSeconds: 90,
      };

      const updatedSession = await service.substituteExercise({
        sessionId: session.id,
        originalExerciseId: session.exercises[0].exerciseId,
        substituteExercise: substituteEx as any,
      });

      // Complete Set 1 on substituted exercise
      await service.completeSet({
        sessionId: session.id,
        exerciseId: substituteEx.id,
        setId: updatedSession.exercises[0].sets[0].id,
        reps: 10,
        weight: 32,
        rpe: 8.5,
      });

      // Progress exercise index
      await service.persistSessionProgress(session.id, 1, 0);

      // Advance wall-clock by 15 minutes (900 seconds)
      vi.advanceTimersByTime(900 * 1000);

      // --- SIMULATE FULL BROWSER REFRESH / PAGE RELOAD ---
      // Instantiate fresh WorkoutService pointing to the same storage
      const newRepo = new MockWorkoutRepository({ storageService: storage });
      const freshService = new WorkoutService({
        repository: newRepo,
        eventBus: new EventBus(),
        analytics,
        notifications,
      });

      const recovered = await freshService.recoverSession();

      expect(recovered).not.toBeNull();
      // 1. Workout identity
      expect(recovered?.workoutId).toBe('workout_push_strength');
      expect(recovered?.status).toBe('recovered');

      // 2. Exercise substitution preserved
      expect(recovered?.exercises[0].exerciseId).toBe('ex_incline_db_press');
      expect(recovered?.exercises[0].exerciseName).toBe('Incline Dumbbell Press');

      // 3. Completed sets, reps, weight, RPE
      const completedSet = recovered?.exercises[0].sets[0];
      expect(completedSet?.completed).toBe(true);
      expect(completedSet?.actualReps).toBe(10);
      expect(completedSet?.actualWeight).toBe(32);
      expect(completedSet?.rpe).toBe(8.5);

      // 4. Volume
      expect(recovered?.totalVolume).toBe(320); // 10 * 32

      // 5. Elapsed duration calculated from wall-clock timestamps
      expect(recovered?.durationSeconds).toBeGreaterThanOrEqual(900);

      // 6. Current exercise and set index
      expect(recovered?.currentExerciseIndex).toBe(1);
      expect(recovered?.currentSetIndex).toBe(0);
    });
  });

  // ==========================================================================
  // Task 15: Browser / Application crash recovery
  // ==========================================================================
  describe('Task 15: Crash Recovery', () => {
    it('recovers corrupted or interrupted sessions gracefully, clears corrupted data, and finishes recovered workout', async () => {
      // 1. Corrupted session test
      storage.setJSON('fitnova_active_workout_session', { id: 'corrupt_session' }); // missing required fields
      const corruptRecovery = await service.recoverSession();
      expect(corruptRecovery).toBeNull();
      expect(await repository.getActiveSession()).toBeNull();

      // 2. Uncorrupted interrupted session crash recovery & finish
      const session = await service.startWorkout({ workoutId: 'workout_push_strength' });
      await service.completeSet({
        sessionId: session.id,
        exerciseId: session.exercises[0].exerciseId,
        setId: session.exercises[0].sets[0].id,
        reps: 12,
        weight: 70,
      });

      // Application unceremoniously crashed (no finishSession called)
      // New instance mounts and recovers
      const recovered = await service.recoverSession();
      expect(recovered?.status).toBe('recovered');

      // Resume & finish workout after crash
      const finished = await service.finishWorkout({ sessionId: recovered!.id, rating: 5 });
      expect(finished.session.status).toBe('completed');
      expect(await repository.getActiveSession()).toBeNull();
    });
  });

  // ==========================================================================
  // Task 16: Recovered-session discard
  // ==========================================================================
  describe('Task 16: Discard Recovered Session', () => {
    it('discards a recovered workout session and clears local active storage', async () => {
      const session = await service.startWorkout({ workoutId: 'workout_push_strength' });
      expect(await repository.getActiveSession()).not.toBeNull();

      const cancelledEvents: any[] = [];
      eventBus.subscribe('WORKOUT_CANCELLED', (p) => { cancelledEvents.push(p); });

      // Discard active/recovered session
      await service.discardActiveSession();

      expect(await repository.getActiveSession()).toBeNull();
      expect(cancelledEvents).toHaveLength(1);
      expect(cancelledEvents[0].sessionId).toBe(session.id);
    });
  });

  // ==========================================================================
  // Task 17: Background tab & device sleep recovery
  // ==========================================================================
  describe('Task 17: Background Tab & Device Sleep Recovery', () => {
    it('reconciles elapsed wall-clock duration after background tab or sleep interval', async () => {
      const session = await service.startWorkout({ workoutId: 'workout_push_strength' });
      expect(session.durationSeconds).toBe(0);

      // Simulate device sleeping or tab backgrounded for 20 minutes (1200s)
      vi.advanceTimersByTime(1200 * 1000);

      // Reconcile progress
      const updated = await service.persistSessionProgress(session.id);
      expect(updated.durationSeconds).toBeGreaterThanOrEqual(1200);

      // Verify paused sessions properly account for pausedDurationMs during sleep
      await service.pauseWorkout(session.id);
      // Asleep while paused for 5 minutes (300s)
      vi.advanceTimersByTime(300 * 1000);
      await service.resumeWorkout(session.id);

      // Total session duration should still be 1200s (excluding the 300s paused time)
      const afterResume = await repository.getActiveSession();
      expect(afterResume?.durationSeconds).toBe(1200);
      expect(afterResume?.pausedDurationMs).toBeGreaterThanOrEqual(300 * 1000);
    });
  });
});
