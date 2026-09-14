/**
 * FitNova AI — Workout Domain Rules Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  calculateSetVolume,
  calculateExerciseVolume,
  calculateTotalWorkoutVolume,
  calculateCompletedSets,
  calculateTotalSets,
  calculateWorkoutCompletionPercentage,
  calculateSessionDuration,
  calculateEstimated1RM,
  isSetValid,
  isWorkoutComplete,
  comparePreviousPerformance,
  detectPersonalRecords,
  calculateWorkoutStats,
} from '../utils/workoutRules.ts';
import type {
  WorkoutExercise,
  WorkoutSession,
  PersonalRecord,
  WorkoutHistoryEntry,
} from '../models/index.ts';

describe('Workout OS — Domain Business Rules', () => {
  describe('Volume & Set Calculations', () => {
    it('calculates set volume accurately and handles zero/negative edge cases', () => {
      expect(calculateSetVolume(10, 80)).toBe(800);
      expect(calculateSetVolume(5, 102.5)).toBe(512.5);
      expect(calculateSetVolume(0, 100)).toBe(0);
      expect(calculateSetVolume(10, 0)).toBe(0);
      expect(calculateSetVolume(-5, 50)).toBe(0);
      expect(calculateSetVolume(10, -50)).toBe(0);
    });

    it('calculates exercise volume ignoring incomplete or skipped sets', () => {
      const sets = [
        { id: '1', setNumber: 1, type: 'normal' as const, targetReps: 10, targetWeight: 50, actualReps: 10, actualWeight: 50, completed: true },
        { id: '2', setNumber: 2, type: 'normal' as const, targetReps: 10, targetWeight: 50, actualReps: 8, actualWeight: 50, completed: true },
        { id: '3', setNumber: 3, type: 'normal' as const, targetReps: 10, targetWeight: 50, completed: false }, // not completed
        { id: '4', setNumber: 4, type: 'normal' as const, targetReps: 10, targetWeight: 50, actualReps: 10, actualWeight: 50, completed: true, skipped: true }, // skipped
      ];

      expect(calculateExerciseVolume(sets)).toBe(500 + 400); // 900
    });

    it('calculates total workout volume across all exercises', () => {
      const exercises: WorkoutExercise[] = [
        {
          id: 'we_1',
          exerciseId: 'ex_1',
          exerciseName: 'Bench Press',
          order: 1,
          targetSets: 2,
          targetReps: 10,
          restSeconds: 90,
          sets: [
            { id: 's1', setNumber: 1, type: 'normal', targetReps: 10, targetWeight: 80, actualReps: 10, actualWeight: 80, completed: true },
            { id: 's2', setNumber: 2, type: 'normal', targetReps: 10, targetWeight: 80, actualReps: 10, actualWeight: 80, completed: true },
          ],
        },
        {
          id: 'we_2',
          exerciseId: 'ex_2',
          exerciseName: 'Overhead Press',
          order: 2,
          targetSets: 1,
          targetReps: 5,
          restSeconds: 90,
          sets: [
            { id: 's3', setNumber: 1, type: 'normal', targetReps: 5, targetWeight: 50, actualReps: 5, actualWeight: 50, completed: true },
          ],
        },
      ];

      expect(calculateTotalWorkoutVolume(exercises)).toBe(800 + 800 + 250); // 1850
    });

    it('calculates completed sets and completion percentage correctly', () => {
      const exercises: WorkoutExercise[] = [
        {
          id: 'we_1',
          exerciseId: 'ex_1',
          exerciseName: 'Bench',
          order: 1,
          targetSets: 2,
          targetReps: 5,
          restSeconds: 90,
          sets: [
            { id: 's1', setNumber: 1, type: 'normal', targetReps: 5, targetWeight: 80, completed: true },
            { id: 's2', setNumber: 2, type: 'normal', targetReps: 5, targetWeight: 80, completed: false },
          ],
        },
        {
          id: 'we_2',
          exerciseId: 'ex_2',
          exerciseName: 'Squat',
          order: 2,
          targetSets: 2,
          targetReps: 5,
          restSeconds: 90,
          sets: [
            { id: 's3', setNumber: 1, type: 'normal', targetReps: 5, targetWeight: 100, completed: true },
            { id: 's4', setNumber: 2, type: 'normal', targetReps: 5, targetWeight: 100, completed: false },
          ],
        },
      ];

      expect(calculateTotalSets(exercises)).toBe(4);
      expect(calculateCompletedSets(exercises)).toBe(2);
      expect(calculateWorkoutCompletionPercentage(exercises)).toBe(50);
      expect(calculateWorkoutCompletionPercentage([])).toBe(0);
    });
  });

  describe('Duration & 1RM Calculations', () => {
    it('calculates session duration excluding pauses', () => {
      const startedAt = 10000;
      const endedAt = 70000; // 60s total
      const pausedDurationMs = 10000; // 10s pause

      expect(calculateSessionDuration(startedAt, endedAt, pausedDurationMs)).toBe(50);
      expect(calculateSessionDuration(startedAt, endedAt, 0)).toBe(60);
    });

    it('calculates estimated 1RM using the Epley formula', () => {
      // 1RM = weight * (1 + reps/30)
      expect(calculateEstimated1RM(100, 1)).toBe(100);
      expect(calculateEstimated1RM(100, 10)).toBe(133.3); // 100 * (1 + 1/3) = 133.33 -> 133.3
      expect(calculateEstimated1RM(80, 5)).toBe(93.3); // 80 * (1 + 5/30) = 80 * 1.16667 = 93.33 -> 93.3
      expect(calculateEstimated1RM(0, 10)).toBe(0);
      expect(calculateEstimated1RM(100, 0)).toBe(0);
    });
  });

  describe('Validation & Completion', () => {
    it('validates set parameters strictly', () => {
      expect(isSetValid({ actualReps: 10, actualWeight: 80 })).toBe(true);
      expect(isSetValid({ actualReps: 10, actualWeight: 80, rpe: 8 })).toBe(true);
      expect(isSetValid({ actualReps: 0, actualWeight: 80 })).toBe(false);
      expect(isSetValid({ actualReps: 200, actualWeight: 80 })).toBe(false);
      expect(isSetValid({ actualReps: 10, actualWeight: -10 })).toBe(false);
      expect(isSetValid({ actualReps: 10, actualWeight: 900 })).toBe(false);
      expect(isSetValid({ actualReps: 10, actualWeight: 80, rpe: 11 })).toBe(false);
    });

    it('determines whether workout is completely finished', () => {
      const incompleteExercises: WorkoutExercise[] = [
        {
          id: 'we_1',
          exerciseId: 'ex_1',
          exerciseName: 'Bench',
          order: 1,
          targetSets: 1,
          targetReps: 5,
          restSeconds: 90,
          sets: [{ id: 's1', setNumber: 1, type: 'normal', targetReps: 5, targetWeight: 80, completed: false }],
        },
      ];
      expect(isWorkoutComplete(incompleteExercises)).toBe(false);

      const completeExercises: WorkoutExercise[] = [
        {
          id: 'we_1',
          exerciseId: 'ex_1',
          exerciseName: 'Bench',
          order: 1,
          targetSets: 2,
          targetReps: 5,
          restSeconds: 90,
          sets: [
            { id: 's1', setNumber: 1, type: 'normal', targetReps: 5, targetWeight: 80, completed: true },
            { id: 's2', setNumber: 2, type: 'normal', targetReps: 5, targetWeight: 80, completed: false, skipped: true },
          ],
        },
      ];
      expect(isWorkoutComplete(completeExercises)).toBe(true);
    });
  });

  describe('Performance Comparison & PR Detection', () => {
    it('compares current performance against previous best set', () => {
      const current = { reps: 8, weight: 85 };
      const previous = { reps: 8, weight: 80 };

      const diff = comparePreviousPerformance(current, previous);
      expect(diff.weightDiff).toBe(5);
      expect(diff.repsDiff).toBe(0);
      expect(diff.volumeDiff).toBe(40); // 85*8 - 80*8 = 680 - 640 = 40
    });

    it('detects new 1RM and max weight personal records accurately', () => {
      const existingPRs: PersonalRecord[] = [
        {
          id: 'pr_1',
          exerciseId: 'ex_bench',
          exerciseName: 'Bench Press',
          metric: '1rm',
          value: 90,
          achievedAt: 1,
        },
        {
          id: 'pr_2',
          exerciseId: 'ex_bench',
          exerciseName: 'Bench Press',
          metric: 'max_weight',
          value: 80,
          achievedAt: 1,
        },
      ];

      const session: WorkoutSession = {
        id: 'sess_1',
        workoutId: 'w_1',
        workoutName: 'Push',
        status: 'active',
        startedAt: 1000,
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        totalVolume: 850,
        durationSeconds: 100,
        pausedDurationMs: 0,
        personalRecords: [],
        exercises: [
          {
            id: 'we_1',
            exerciseId: 'ex_bench',
            exerciseName: 'Bench Press',
            order: 1,
            targetSets: 1,
            targetReps: 5,
            restSeconds: 90,
            sets: [
              // 85kg * 5 reps -> 1RM = 85 * (1 + 5/30) = 99.2kg (> 90kg existing PR)
              // max_weight = 85kg (> 80kg existing PR)
              {
                id: 's1',
                setNumber: 1,
                type: 'normal',
                targetReps: 5,
                targetWeight: 80,
                actualReps: 5,
                actualWeight: 85,
                completed: true,
              },
            ],
          },
        ],
      };

      const newPRs = detectPersonalRecords(session, existingPRs);
      expect(newPRs.length).toBe(2);

      const pr1rm = newPRs.find((p) => p.metric === '1rm');
      expect(pr1rm).toBeDefined();
      expect(pr1rm?.value).toBe(99.2);
      expect(pr1rm?.previousValue).toBe(90);

      const prWeight = newPRs.find((p) => p.metric === 'max_weight');
      expect(prWeight).toBeDefined();
      expect(prWeight?.value).toBe(85);
      expect(prWeight?.previousValue).toBe(80);
    });

    it('aggregates workout history into stats', () => {
      const history: WorkoutHistoryEntry[] = [
        {
          id: 'h1',
          sessionId: 's1',
          workoutId: 'w1',
          workoutName: 'Push',
          date: '2026-09-10',
          completedAt: 1,
          durationSeconds: 3000, // 50m
          totalVolume: 5000,
          totalSets: 10,
          completedSets: 10,
          exercisesCount: 3,
          personalRecordsCount: 2,
          exercises: [],
        },
        {
          id: 'h2',
          sessionId: 's2',
          workoutId: 'w2',
          workoutName: 'Pull',
          date: '2026-09-12',
          completedAt: 2,
          durationSeconds: 3600, // 60m
          totalVolume: 6000,
          totalSets: 12,
          completedSets: 12,
          exercisesCount: 4,
          personalRecordsCount: 1,
          exercises: [],
        },
      ];

      const stats = calculateWorkoutStats(history);
      expect(stats.totalWorkouts).toBe(2);
      expect(stats.totalVolumeKg).toBe(11000);
      expect(stats.totalDurationMinutes).toBe(110);
      expect(stats.totalPersonalRecords).toBe(3);
    });
  });
});
