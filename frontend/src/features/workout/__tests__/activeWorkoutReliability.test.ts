/**
 * FitNova AI — Sprint 3.5: Active Workout Reliability Test Suite
 * Validates real-time session fault-tolerance, state machine transitions,
 * wall-clock timer integrity, duplicate prevention, crash recovery, and offline sync.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkoutService } from '../services/WorkoutService.ts';
import { MockWorkoutRepository } from '../repositories/MockWorkoutRepository.ts';
import { EventBus } from '../../../platform/events/EventBus.ts';
import { AnalyticsService } from '../../../platform/analytics/AnalyticsService.ts';
import { NotificationService } from '../../../platform/notifications/NotificationService.ts';
import { StorageService } from '../../../platform/storage/StorageService.ts';
import { MemoryStorageAdapter } from '../../../platform/storage/MemoryStorageAdapter.ts';
import { OfflineManager } from '../../../platform/offline/OfflineManager.ts';
import { SyncManager } from '../../../platform/sync/SyncManager.ts';
import { canTransition, assertValidTransition } from '../state/WorkoutSessionState.ts';
import { calculateSessionDuration } from '../utils/workoutRules.ts';
import { ValidationError } from '../../../platform/errors/index.ts';
import type { SessionStatus } from '../types/enums.ts';

describe('Sprint 3.5 — Active Workout Reliability & Production Hardening', () => {
  let repository: MockWorkoutRepository;
  let eventBus: EventBus;
  let analytics: AnalyticsService;
  let notifications: NotificationService;
  let storage: StorageService;
  let offlineManager: OfflineManager;
  let syncManager: SyncManager;
  let service: WorkoutService;

  beforeEach(() => {
    storage = new StorageService({ adapter: new MemoryStorageAdapter() });
    repository = new MockWorkoutRepository({ storageService: storage });
    eventBus = new EventBus();
    analytics = new AnalyticsService({ enabled: true });
    notifications = new NotificationService();
    offlineManager = new OfflineManager({ storage });
    syncManager = new SyncManager({ offlineManager, eventBus });

    service = new WorkoutService({
      repository,
      eventBus,
      analytics,
      notifications,
      offlineManager,
      syncManager,
    });
  });

  // ==========================================================================
  // Category A: State Machine Transitions
  // ==========================================================================
  describe('A. State Machine Transitions', () => {
    it('supports the full reliability lifecycle: active -> offline -> syncing -> recovered -> active', () => {
      expect(canTransition('active', 'offline')).toBe(true);
      expect(canTransition('offline', 'syncing')).toBe(true);
      expect(canTransition('syncing', 'recovered')).toBe(true);
      expect(canTransition('recovered', 'active')).toBe(true);

      expect(() => {
        assertValidTransition('active', 'offline');
        assertValidTransition('offline', 'syncing');
        assertValidTransition('syncing', 'recovered');
        assertValidTransition('recovered', 'active');
      }).not.toThrow();
    });

    it('supports bidirectional transitions for network and pause states', () => {
      // active <-> paused
      expect(canTransition('active', 'paused')).toBe(true);
      expect(canTransition('paused', 'active')).toBe(true);

      // active <-> offline
      expect(canTransition('active', 'offline')).toBe(true);
      expect(canTransition('offline', 'active')).toBe(true);

      // offline <-> syncing
      expect(canTransition('offline', 'syncing')).toBe(true);
      expect(canTransition('syncing', 'offline')).toBe(true);

      // recovered <-> paused / completed / cancelled
      expect(canTransition('recovered', 'paused')).toBe(true);
      expect(canTransition('recovered', 'completed')).toBe(true);
      expect(canTransition('recovered', 'cancelled')).toBe(true);

      // failed -> recovered / cancelled / completed
      expect(canTransition('failed', 'recovered')).toBe(true);
      expect(canTransition('failed', 'cancelled')).toBe(true);
      expect(canTransition('failed', 'completed')).toBe(true);
    });

    it('strictly preserves terminal state protection for completed and cancelled', () => {
      const allStatuses: SessionStatus[] = [
        'idle',
        'preparing',
        'active',
        'paused',
        'offline',
        'syncing',
        'recovered',
        'completed',
        'cancelled',
        'failed',
      ];

      for (const target of allStatuses) {
        if (target !== 'completed') {
          expect(canTransition('completed', target)).toBe(false);
          expect(() => assertValidTransition('completed', target)).toThrow(ValidationError);
        }
        if (target !== 'cancelled') {
          expect(canTransition('cancelled', target)).toBe(false);
          expect(() => assertValidTransition('cancelled', target)).toThrow(ValidationError);
        }
      }
    });
  });

  // ==========================================================================
  // Category B: Wall-Clock Duration Calculations
  // ==========================================================================
  describe('B. Wall-Clock Duration Calculations', () => {
    it('calculates elapsed time using wall-clock timestamps rather than interval increments', () => {
      const startedAt = 1000000;
      const now = startedAt + 45000; // 45 seconds later

      const duration = calculateSessionDuration(startedAt, now, 0);
      expect(duration).toBe(45);
    });

    it('handles simulated background tab delays accurately without lost time', () => {
      const startedAt = Date.now() - 600000; // 10 minutes ago
      // Background tab was throttled for 10 minutes, Date.now() reflects true elapsed time
      const duration = calculateSessionDuration(startedAt, undefined, 0);
      expect(duration).toBe(600);
    });

    it('handles simulated device sleep and wake with accurate time reconciliation', () => {
      const startedAt = 2000000;
      // Laptop slept for 2 hours (7200 seconds)
      const wakeTime = startedAt + 7200 * 1000;

      const duration = calculateSessionDuration(startedAt, wakeTime, 0);
      expect(duration).toBe(7200);
    });

    it('deducts paused duration accurately from total elapsed time', () => {
      const startedAt = 1000000;
      const endedAt = startedAt + 120000; // 2 minutes total elapsed
      const pausedDurationMs = 30000; // 30 seconds paused

      const duration = calculateSessionDuration(startedAt, endedAt, pausedDurationMs);
      expect(duration).toBe(90); // 120 - 30 = 90 seconds
    });
  });

  // ==========================================================================
  // Category C: Duplicate Set Submission Protection
  // ==========================================================================
  describe('C. Duplicate Set Submission Protection', () => {
    it('suppresses duplicate set completion and does not emit duplicate events', async () => {
      const session = await service.startWorkout({ workoutId: 'workout_push_strength' });
      const ex = session.exercises[0];
      const set = ex.sets[0];

      const setCompletedSpy = vi.fn();
      eventBus.subscribe('SET_COMPLETED', setCompletedSpy);
      const analyticsSpy = vi.spyOn(analytics, 'track');

      // First submission
      const firstResult = await service.completeSet({
        sessionId: session.id,
        exerciseId: ex.exerciseId,
        setId: set.id,
        reps: 10,
        weight: 80,
        rpe: 8.5,
      });

      expect(firstResult.set.completed).toBe(true);
      expect(setCompletedSpy).toHaveBeenCalledTimes(1);
      expect(analyticsSpy).toHaveBeenCalledWith('SET_COMPLETED', expect.anything());

      // Identical second submission (e.g. rapid double-click or replay)
      const secondResult = await service.completeSet({
        sessionId: session.id,
        exerciseId: ex.exerciseId,
        setId: set.id,
        reps: 10,
        weight: 80,
        rpe: 8.5,
      });

      expect(secondResult.set.completed).toBe(true);
      // EventBus must NOT be invoked a second time
      expect(setCompletedSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Category D: Session Recovery from Crash / Refresh
  // ==========================================================================
  describe('D. Session Recovery after Crash / Reload', () => {
    it('persists active session and successfully recovers it with status "recovered"', async () => {
      const session = await service.startWorkout({ workoutId: 'workout_push_strength' });
      const ex = session.exercises[0];

      // Complete first set and advance progress
      await service.completeSet({
        sessionId: session.id,
        exerciseId: ex.exerciseId,
        setId: ex.sets[0].id,
        reps: 8,
        weight: 90,
      });
      await service.persistSessionProgress(session.id, 1, 0);

      // Simulate application restart by instantiating a fresh WorkoutService on the same storage
      const freshRepository = new MockWorkoutRepository({ storageService: storage });
      const freshService = new WorkoutService({
        repository: freshRepository,
        eventBus,
      });

      const recoveredSession = await freshService.recoverSession();
      expect(recoveredSession).not.toBeNull();
      expect(recoveredSession?.id).toBe(session.id);
      expect(recoveredSession?.status).toBe('recovered');
      expect(recoveredSession?.exercises[0].sets[0].completed).toBe(true);
      expect(recoveredSession?.exercises[0].sets[0].actualWeight).toBe(90);
      expect(recoveredSession?.totalVolume).toBe(8 * 90);
      expect(recoveredSession?.currentExerciseIndex).toBe(1);
    });
  });

  // ==========================================================================
  // Category E: Exercise Substitution Persistence
  // ==========================================================================
  describe('E. Exercise Substitution Persistence', () => {
    it('preserves substituted exercises and completed sets across refresh', async () => {
      const session = await service.startWorkout({ workoutId: 'workout_push_strength' });
      const originalExercise = session.exercises[0];

      // Complete 1 set on original exercise
      await service.completeSet({
        sessionId: session.id,
        exerciseId: originalExercise.exerciseId,
        setId: originalExercise.sets[0].id,
        reps: 10,
        weight: 70,
      });

      // Substitute with Dumbbell Bench Press
      const substitute = {
        id: 'ex_db_bench',
        name: 'Dumbbell Bench Press',
        description: 'Dumbbell press for chest.',
        primaryMuscleGroup: 'Chest' as const,
        secondaryMuscleGroups: ['Triceps' as const],
        equipment: 'Dumbbell' as const,
        difficulty: 'Intermediate' as const,
        instructions: ['Press dumbbells up', 'Lower under control'],
        tips: ['Keep shoulder blades retracted'],
        defaultRestSeconds: 90,
        isCustom: false,
      };

      await service.substituteExercise({
        sessionId: session.id,
        originalExerciseId: originalExercise.exerciseId,
        substituteExercise: substitute,
      });

      // Simulate refresh
      const freshRepository = new MockWorkoutRepository({ storageService: storage });
      const freshService = new WorkoutService({ repository: freshRepository });

      const reloaded = await freshService.getActiveSession();
      expect(reloaded?.exercises[0].exerciseId).toBe('ex_db_bench');
      expect(reloaded?.exercises[0].exerciseName).toBe('Dumbbell Bench Press');
      // Completed set preserved
      expect(reloaded?.exercises[0].sets[0].completed).toBe(true);
      expect(reloaded?.exercises[0].sets[0].actualWeight).toBe(70);
    });
  });

  // ==========================================================================
  // Category F: Offline Synchronization
  // ==========================================================================
  describe('F. Offline Synchronization', () => {
    it('logs sets locally while offline and queues for sync without losing state', async () => {
      const session = await service.startWorkout({ workoutId: 'workout_push_strength' });
      const ex = session.exercises[0];
      const set = ex.sets[0];

      // Simulate offline mode
      vi.spyOn(offlineManager, 'isOnline').mockReturnValue(false);
      const queueSpy = vi.spyOn(offlineManager, 'queueOperation');

      const result = await service.completeSet({
        sessionId: session.id,
        exerciseId: ex.exerciseId,
        setId: set.id,
        reps: 10,
        weight: 100,
      });

      // Local state is immediately updated
      expect(result.set.completed).toBe(true);
      expect(result.session.totalVolume).toBe(1000);

      // Operation enters the queue
      expect(queueSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'WORKOUT_LOG_SET',
          idempotencyKey: `set_${session.id}_${ex.exerciseId}_1`,
        })
      );

      // Online transition and sync
      vi.spyOn(offlineManager, 'isOnline').mockReturnValue(true);
      const syncedCount = await service.syncPendingOperations();
      expect(syncedCount).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Category G: Finalization Concurrency
  // ==========================================================================
  describe('G. Finalization Concurrency Guard', () => {
    it('prevents multiple concurrent finish operations with lock protection', async () => {
      const session = await service.startWorkout({ workoutId: 'workout_push_strength' });

      // Call finishWorkout twice concurrently
      const promise1 = service.finishWorkout({ sessionId: session.id });
      const promise2 = service.finishWorkout({ sessionId: session.id });

      const results = await Promise.allSettled([promise1, promise2]);
      const rejected = results.filter((r) => r.status === 'rejected');
      const fulfilled = results.filter((r) => r.status === 'fulfilled');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
      if (rejected[0].status === 'rejected') {
        expect(rejected[0].reason).toBeInstanceOf(ValidationError);
      }
    });
  });
});
