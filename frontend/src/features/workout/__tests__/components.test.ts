/**
 * FitNova AI — Workout OS Experience & Component Contracts Test Suite
 * Validates component models, calculations, PR alerts, progress bars, and end-to-end session lifecycles.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateWorkoutCompletionPercentage,
  calculateTotalWorkoutVolume,
  calculateCompletedSets,
  calculateTotalSets,
  calculateEstimated1RM,
  comparePreviousPerformance,
  detectPersonalRecords,
  calculateWorkoutStats,
} from '../utils/workoutRules.ts';
import { WorkoutService } from '../services/WorkoutService.ts';
import { MockWorkoutRepository } from '../repositories/MockWorkoutRepository.ts';
import { StorageService } from '../../../platform/storage/StorageService.ts';
import { MemoryStorageAdapter } from '../../../platform/storage/MemoryStorageAdapter.ts';
import { EventBus } from '../../../platform/events/EventBus.ts';
import { AnalyticsService } from '../../../platform/analytics/AnalyticsService.ts';
import { NotificationService } from '../../../platform/notifications/NotificationService.ts';
import { TelemetryService } from '../../../platform/telemetry/TelemetryService.ts';
import type { WorkoutExercise } from '../models/WorkoutExercise.ts';
import type { WorkoutSession } from '../models/WorkoutSession.ts';
import type { PersonalRecord } from '../models/PersonalRecord.ts';
import type { WorkoutHistoryEntry } from '../models/WorkoutHistory.ts';

describe('Workout OS — Component Logic & Experience Contracts', () => {
  let storage: StorageService;
  let repository: MockWorkoutRepository;
  let service: WorkoutService;

  beforeEach(() => {
    storage = new StorageService({ adapter: new MemoryStorageAdapter() });
    repository = new MockWorkoutRepository({ storageService: storage });
    service = new WorkoutService({
      repository,
      eventBus: new EventBus(),
      analytics: new AnalyticsService({ enabled: false }),
      notifications: new NotificationService(),
      telemetry: new TelemetryService({ enabled: false }),
    });
  });

  describe('WorkoutProgress Calculations', () => {
    it('accurately computes 0% when no sets are completed', () => {
      const exercises: WorkoutExercise[] = [
        {
          id: 'we_1',
          exerciseId: 'ex_1',
          exerciseName: 'Bench Press',
          order: 0,
          targetSets: 3,
          targetReps: 10,
          restSeconds: 90,
          sets: [
            { id: 's1', setNumber: 1, type: 'normal', targetReps: 10, targetWeight: 80, completed: false },
            { id: 's2', setNumber: 2, type: 'normal', targetReps: 10, targetWeight: 80, completed: false },
            { id: 's3', setNumber: 3, type: 'normal', targetReps: 10, targetWeight: 80, completed: false },
          ],
        },
      ];

      expect(calculateTotalSets(exercises)).toBe(3);
      expect(calculateCompletedSets(exercises)).toBe(0);
      expect(calculateWorkoutCompletionPercentage(exercises)).toBe(0);
    });

    it('accurately computes percentage as sets are completed or skipped', () => {
      const exercises: WorkoutExercise[] = [
        {
          id: 'we_1',
          exerciseId: 'ex_1',
          exerciseName: 'Squat',
          order: 0,
          targetSets: 4,
          targetReps: 8,
          restSeconds: 120,
          sets: [
            { id: 's1', setNumber: 1, type: 'normal', targetReps: 8, targetWeight: 100, completed: true },
            { id: 's2', setNumber: 2, type: 'normal', targetReps: 8, targetWeight: 100, completed: true },
            { id: 's3', setNumber: 3, type: 'normal', targetReps: 8, targetWeight: 100, completed: false },
            { id: 's4', setNumber: 4, type: 'normal', targetReps: 8, targetWeight: 100, completed: false, skipped: true },
          ],
        },
      ];

      expect(calculateCompletedSets(exercises)).toBe(2);
      expect(calculateTotalSets(exercises)).toBe(4);
      expect(calculateWorkoutCompletionPercentage(exercises)).toBe(50);
    });

    it('calculates total accumulated volume across completed sets', () => {
      const exercises: WorkoutExercise[] = [
        {
          id: 'we_1',
          exerciseId: 'ex_1',
          exerciseName: 'Deadlift',
          order: 0,
          targetSets: 2,
          targetReps: 5,
          restSeconds: 180,
          sets: [
            { id: 's1', setNumber: 1, type: 'normal', targetReps: 5, targetWeight: 140, actualReps: 5, actualWeight: 140, completed: true },
            { id: 's2', setNumber: 2, type: 'normal', targetReps: 5, targetWeight: 140, actualReps: 5, actualWeight: 150, completed: true },
          ],
        },
      ];

      // 5 * 140 = 700, 5 * 150 = 750 -> total 1450 kg
      expect(calculateTotalWorkoutVolume(exercises)).toBe(1450);
    });
  });

  describe('SetRow Stepper & Performance Comparison', () => {
    it('compares completed set against previous performance and calculates diffs', () => {
      const current = { reps: 10, weight: 82.5 };
      const previous = { reps: 8, weight: 80 };

      const diff = comparePreviousPerformance(current, previous);
      expect(diff.weightDiff).toBe(2.5);
      expect(diff.repsDiff).toBe(2);
      expect(diff.volumeDiff).toBe(825 - 640);
    });

    it('computes accurate estimated 1RM using the Epley formula', () => {
      // 100 kg x 10 reps -> 100 * (1 + 10/30) = 133.3 kg
      const e1rm = calculateEstimated1RM(100, 10);
      expect(e1rm).toBe(133.3);

      // 1 rep max returns exact weight
      expect(calculateEstimated1RM(150, 1)).toBe(150);
    });
  });

  describe('PR Detection & Gamification Banner Logic', () => {
    it('identifies new personal records when 1RM or weight exceeds existing benchmarks', () => {
      const existingPRs: PersonalRecord[] = [
        {
          id: 'pr_1',
          exerciseId: 'ex_overhead_press',
          exerciseName: 'Overhead Press',
          metric: 'max_weight',
          value: 60,
          achievedAt: Date.now() - 86400000,
        },
      ];

      const mockSession: WorkoutSession = {
        id: 'sess_pr_test',
        workoutId: 'w_test',
        workoutName: 'Shoulder Protocol',
        status: 'active',
        startedAt: Date.now(),
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        totalVolume: 650,
        durationSeconds: 1200,
        pausedDurationMs: 0,
        personalRecords: [],
        exercises: [
          {
            id: 'we_ohp',
            exerciseId: 'ex_overhead_press',
            exerciseName: 'Overhead Press',
            order: 0,
            targetSets: 1,
            targetReps: 5,
            restSeconds: 90,
            sets: [
              {
                id: 'set_1',
                setNumber: 1,
                type: 'normal',
                targetReps: 5,
                targetWeight: 65,
                actualReps: 5,
                actualWeight: 65, // Exceeds 60kg!
                completed: true,
              },
            ],
          },
        ],
      };

      const newPRs = detectPersonalRecords(mockSession, existingPRs);
      expect(newPRs.length).toBeGreaterThanOrEqual(1);

      const weightPR = newPRs.find((p) => p.metric === 'max_weight');
      expect(weightPR).toBeDefined();
      expect(weightPR?.value).toBe(65);
      expect(weightPR?.previousValue).toBe(60);
    });
  });

  describe('Workout History & Analytics Aggregation', () => {
    it('correctly aggregates multi-session history into comprehensive stats', () => {
      const mockHistory: WorkoutHistoryEntry[] = [
        {
          id: 'hist_1',
          sessionId: 's1',
          workoutId: 'w1',
          workoutName: 'Upper Body A',
          date: '2026-09-10',
          completedAt: 1789000000000,
          durationSeconds: 3000,
          totalVolume: 4500,
          totalSets: 16,
          completedSets: 16,
          exercisesCount: 4,
          personalRecordsCount: 2,
          exercises: [],
        },
        {
          id: 'hist_2',
          sessionId: 's2',
          workoutId: 'w2',
          workoutName: 'Lower Body A',
          date: '2026-09-12',
          completedAt: 1789200000000,
          durationSeconds: 3600,
          totalVolume: 6200,
          totalSets: 18,
          completedSets: 18,
          exercisesCount: 5,
          personalRecordsCount: 1,
          exercises: [],
        },
      ];

      const stats = calculateWorkoutStats(mockHistory);
      expect(stats.totalWorkouts).toBe(2);
      expect(stats.totalVolumeKg).toBe(10700);
      expect(stats.totalDurationMinutes).toBe(110);
      expect(stats.totalPersonalRecords).toBe(3);
    });
  });

  describe('Full Live Workout Flow Simulation', () => {
    it('executes full workout lifecycle from start to finish with volume accumulation', async () => {
      const workout = await repository.getWorkoutById('workout_push_strength');
      expect(workout).not.toBeNull();

      // 1. Start Workout
      const session = await service.startWorkout({ workoutId: workout!.id });
      expect(session.status).toBe('active');
      expect(session.exercises.length).toBe(workout!.exercises.length);

      // 2. Complete Set 1
      const firstExercise = session.exercises[0];
      const firstSet = firstExercise.sets[0];
      const { session: s1 } = await service.completeSet({
        sessionId: session.id,
        exerciseId: firstExercise.exerciseId,
        setId: firstSet.id,
        reps: 8,
        weight: 85,
      });

      expect(s1.totalVolume).toBe(8 * 85);
      expect(s1.exercises[0].sets[0].completed).toBe(true);

      // 3. Skip Set 2
      const secondSet = firstExercise.sets[1];
      const s2 = await service.skipSet(session.id, firstExercise.exerciseId, secondSet.id);
      expect(s2.exercises[0].sets[1].skipped).toBe(true);

      // 4. Finish Workout
      const { historyEntry, session: finishedSession } = await service.finishWorkout({
        sessionId: session.id,
        notes: 'Great pump on bench press!',
        rating: 5,
      });

      expect(finishedSession.totalVolume).toBe(680);
      expect(finishedSession.rating).toBe(5);
      expect(finishedSession.notes).toBe('Great pump on bench press!');
      expect(historyEntry).toBeDefined();

      // 5. Active session is cleared
      const activeAfter = await service.getActiveSession();
      expect(activeAfter).toBeNull();
    });
  });
});
