/**
 * FitNova AI — Workout Offline Sync & Analytics Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkoutService } from '../services/WorkoutService.ts';
import { MockWorkoutRepository } from '../repositories/MockWorkoutRepository.ts';
import { EventBus } from '../../../platform/events/EventBus.ts';
import { StorageService } from '../../../platform/storage/StorageService.ts';
import { MemoryStorageAdapter } from '../../../platform/storage/MemoryStorageAdapter.ts';
import { OfflineManager } from '../../../platform/offline/OfflineManager.ts';
import { SyncManager } from '../../../platform/sync/SyncManager.ts';
import { calculateExerciseProgressionCurve } from '../analytics/strengthProgression.ts';
import { calculateWeeklyVolumeProgression, calculateVolumeByExercise } from '../analytics/volumeAnalytics.ts';
import { calculateConsistencyMetrics } from '../analytics/consistencyMetrics.ts';
import { calculateEstimated1RM } from '../utils/workoutRules.ts';
import type { WorkoutCompletedPayload } from '../../../platform/types/events.ts';
import type { WorkoutHistoryEntry } from '../models/WorkoutHistory.ts';

describe('Workout OS — Sync & Analytics Integration', () => {
  let repository: MockWorkoutRepository;
  let eventBus: EventBus;
  let storage: StorageService;
  let offlineManager: OfflineManager;
  let syncManager: SyncManager;
  let service: WorkoutService;

  beforeEach(() => {
    storage = new StorageService({ adapter: new MemoryStorageAdapter() });
    repository = new MockWorkoutRepository({ storageService: storage });
    eventBus = new EventBus();
    offlineManager = new OfflineManager({ storage });
    syncManager = new SyncManager({ offlineManager, eventBus });

    service = new WorkoutService({
      repository,
      eventBus,
      offlineManager,
      syncManager,
    });
  });

  describe('Offline Queueing during Live Workout', () => {
    it('queues set mutation into OfflineManager when repository remote update fails', async () => {
      const queueSpy = vi.spyOn(offlineManager, 'queueOperation');

      const session = await service.startWorkout({
        workoutId: 'workout_push_strength',
      });

      const firstExercise = session.exercises[0];
      const firstSet = firstExercise.sets[0];

      // Simulate remote network failure on repository.updateWorkoutSession
      vi.spyOn(repository, 'updateWorkoutSession').mockRejectedValueOnce(
        new Error('Network offline')
      );

      const result = await service.completeSet({
        sessionId: session.id,
        exerciseId: firstExercise.exerciseId,
        setId: firstSet.id,
        reps: 8,
        weight: 85,
        rpe: 8.5,
      });

      // Optimistic local state updated successfully
      expect(result.set.completed).toBe(true);
      expect(result.set.actualWeight).toBe(85);
      expect(result.set.actualReps).toBe(8);

      // Offline manager captured mutation
      expect(queueSpy).toHaveBeenCalledTimes(1);
      expect(queueSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'WORKOUT_LOG_SET',
          endpoint: '/workouts/sessions/log-set',
          payload: expect.objectContaining({
            exercise_id: firstExercise.exerciseId,
            reps: 8,
            weight: 85,
          }),
        })
      );
    });

    it('emits rich WORKOUT_COMPLETED event payload for Dashboard OS consumption', async () => {
      let emittedPayload: WorkoutCompletedPayload | undefined;
      eventBus.subscribe('WORKOUT_COMPLETED', (payload) => {
        emittedPayload = payload;
      });

      const session = await service.startWorkout({
        workoutId: 'workout_push_strength',
      });

      const firstExercise = session.exercises[0];
      const firstSet = firstExercise.sets[0];

      await service.completeSet({
        sessionId: session.id,
        exerciseId: firstExercise.exerciseId,
        setId: firstSet.id,
        reps: 6,
        weight: 100,
        rpe: 8,
      });

      await service.finishWorkout({
        sessionId: session.id,
        notes: 'Great heavy push session',
      });

      expect(emittedPayload).toBeDefined();
      expect(emittedPayload?.workoutId).toBe('workout_push_strength');
      expect(emittedPayload?.workoutName).toBe('Push Strength Routine');
      expect(emittedPayload?.completedSets).toBe(1);
      expect(emittedPayload?.totalVolume).toBe(600);
      expect(emittedPayload?.caloriesBurned).toBeGreaterThanOrEqual(0);
      expect(typeof emittedPayload?.personalRecordsCount).toBe('number');
    });
  });

  describe('Workout Analytics Engine Integration', () => {
    it('calculates Epley 1RM accurately', () => {
      // 1 rep = exact weight
      expect(calculateEstimated1RM(100, 1)).toBe(100);

      // 5 reps at 100kg -> 100 * (1 + 5/30) = 116.66 -> rounds to 116.7
      expect(calculateEstimated1RM(100, 5)).toBe(116.7);

      // 10 reps at 80kg -> 80 * (1 + 10/30) = 106.66 -> rounds to 106.7
      expect(calculateEstimated1RM(80, 10)).toBe(106.7);
    });

    it('computes exercise strength progression curve and percentage gain', () => {
      const historyEntries: WorkoutHistoryEntry[] = [
        {
          id: 'h1',
          sessionId: 's1',
          workoutId: 'w1',
          workoutName: 'Push A',
          date: '2026-09-01',
          completedAt: 1000,
          durationSeconds: 3000,
          totalVolume: 800,
          totalSets: 1,
          completedSets: 1,
          exercisesCount: 1,
          personalRecordsCount: 0,
          exercises: [
            {
              exerciseId: 'ex_bench',
              exerciseName: 'Bench Press',
              setsCount: 1,
              bestSet: { reps: 8, weight: 80 },
              volume: 640,
            },
          ],
        },
        {
          id: 'h2',
          sessionId: 's2',
          workoutId: 'w1',
          workoutName: 'Push A',
          date: '2026-09-08',
          completedAt: 2000,
          durationSeconds: 3200,
          totalVolume: 1000,
          totalSets: 1,
          completedSets: 1,
          exercisesCount: 1,
          personalRecordsCount: 1,
          exercises: [
            {
              exerciseId: 'ex_bench',
              exerciseName: 'Bench Press',
              setsCount: 1,
              bestSet: { reps: 8, weight: 90 },
              volume: 720,
            },
          ],
        },
      ];

      const summary = calculateExerciseProgressionCurve('ex_bench', historyEntries);
      expect(summary.exerciseId).toBe('ex_bench');
      expect(summary.initial1RM).toBe(calculateEstimated1RM(80, 8));
      expect(summary.current1RM).toBe(calculateEstimated1RM(90, 8));
      expect(summary.percentageGain).toBeGreaterThan(0);
      expect(summary.curve.length).toBe(2);
    });

    it('aggregates volume breakdown by exercise and weekly progression', () => {
      const historyEntries: WorkoutHistoryEntry[] = [
        {
          id: 'h1',
          sessionId: 's1',
          workoutId: 'w1',
          workoutName: 'Push Routine',
          date: '2026-09-01',
          completedAt: Date.now() - 86400000,
          durationSeconds: 3000,
          totalVolume: 1000,
          totalSets: 2,
          completedSets: 2,
          exercisesCount: 1,
          personalRecordsCount: 0,
          exercises: [
            {
              exerciseId: 'ex_bench',
              exerciseName: 'Bench Press',
              setsCount: 2,
              bestSet: { reps: 10, weight: 50 },
              volume: 1000,
            },
          ],
        },
      ];

      const exerciseVolume = calculateVolumeByExercise(historyEntries);
      expect(exerciseVolume['Bench Press']).toBe(1000);

      const weeklyTrends = calculateWeeklyVolumeProgression(historyEntries);
      expect(weeklyTrends.length).toBeGreaterThan(0);
      expect(weeklyTrends[0].volumeKg).toBe(1000);
      expect(weeklyTrends[0].workoutsCount).toBe(1);
    });

    it('computes workout consistency metrics and weekly adherence', () => {
      const historyEntries: WorkoutHistoryEntry[] = [
        {
          id: 'h1',
          sessionId: 's1',
          workoutId: 'w1',
          workoutName: 'Routine 1',
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          completedAt: Date.now() - 86400000,
          durationSeconds: 3000,
          totalVolume: 2000,
          totalSets: 6,
          completedSets: 6,
          exercisesCount: 2,
          personalRecordsCount: 0,
          exercises: [],
        },
      ];

      const consistency = calculateConsistencyMetrics(historyEntries, 3);
      expect(consistency.totalWorkouts).toBe(1);
      expect(consistency.workoutsPast30Days).toBe(1);
      expect(consistency.currentStreakWeeks).toBeGreaterThanOrEqual(1);
    });
  });
});
