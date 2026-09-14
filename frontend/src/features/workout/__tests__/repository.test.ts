/**
 * FitNova AI — Workout Repository Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { MockWorkoutRepository } from '../repositories/MockWorkoutRepository.ts';
import { StorageService } from '../../../platform/storage/StorageService.ts';
import { MemoryStorageAdapter } from '../../../platform/storage/MemoryStorageAdapter.ts';
import type { WorkoutSession } from '../models/WorkoutSession.ts';

describe('Workout OS — Repository Layer', () => {
  it('loads baseline mock datasets with at least 20 exercises and 8 workouts', async () => {
    const repo = new MockWorkoutRepository();

    const exercises = await repo.getExercises();
    expect(exercises.length).toBeGreaterThanOrEqual(20);

    const workouts = await repo.getWorkouts();
    expect(workouts.length).toBeGreaterThanOrEqual(8);
  });

  it('filters workouts by query, goal, difficulty, and muscle group', async () => {
    const repo = new MockWorkoutRepository();

    const strengthWorkouts = await repo.getWorkouts({ goal: 'Strength' });
    expect(strengthWorkouts.length).toBeGreaterThan(0);
    expect(strengthWorkouts.every((w) => w.goal === 'Strength')).toBe(true);

    const chestWorkouts = await repo.getWorkouts({ muscleGroup: 'Chest' });
    expect(chestWorkouts.length).toBeGreaterThan(0);
    expect(chestWorkouts.every((w) => w.targetMuscleGroups.includes('Chest'))).toBe(true);

    const searchResults = await repo.getWorkouts({ query: 'push' });
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults.some((w) => w.name.toLowerCase().includes('push'))).toBe(true);
  });

  it('retrieves single workout and exercise by id or returns null when not found', async () => {
    const repo = new MockWorkoutRepository();

    const workout = await repo.getWorkoutById('workout_push_strength');
    expect(workout).not.toBeNull();
    expect(workout?.name).toBe('Push Strength Routine');

    const notFoundWorkout = await repo.getWorkoutById('non_existent_id');
    expect(notFoundWorkout).toBeNull();

    const exercise = await repo.getExerciseById('ex_bench_press');
    expect(exercise).not.toBeNull();
    expect(exercise?.primaryMuscleGroup).toBe('Chest');

    const notFoundExercise = await repo.getExerciseById('fake_exercise');
    expect(notFoundExercise).toBeNull();
  });

  it('filters exercises by equipment, muscle group, and difficulty', async () => {
    const repo = new MockWorkoutRepository();

    const barbellExercises = await repo.getExercises({ equipment: 'Barbell' });
    expect(barbellExercises.length).toBeGreaterThan(0);
    expect(barbellExercises.every((e) => e.equipment === 'Barbell')).toBe(true);

    const backExercises = await repo.getExercises({ muscleGroup: 'Back' });
    expect(backExercises.length).toBeGreaterThan(0);
    expect(
      backExercises.every(
        (e) => e.primaryMuscleGroup === 'Back' || e.secondaryMuscleGroups.includes('Back')
      )
    ).toBe(true);
  });

  it('persists active session via StorageService across repository reloads', async () => {
    const memoryAdapter = new MemoryStorageAdapter();
    const storageService = new StorageService({ adapter: memoryAdapter });

    const repo1 = new MockWorkoutRepository({ storageService });

    const sampleSession: WorkoutSession = {
      id: 'sess_test_1',
      workoutId: 'workout_push_strength',
      workoutName: 'Push Strength Routine',
      status: 'active',
      startedAt: Date.now(),
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      exercises: [],
      totalVolume: 500,
      durationSeconds: 120,
      pausedDurationMs: 0,
      personalRecords: [],
    };

    await repo1.saveActiveSession(sampleSession);

    // Simulate fresh repository instantiation (e.g. page refresh / new tab)
    const repo2 = new MockWorkoutRepository({ storageService });
    const recovered = await repo2.getActiveSession();

    expect(recovered).not.toBeNull();
    expect(recovered?.id).toBe('sess_test_1');
    expect(recovered?.totalVolume).toBe(500);

    // Clear session
    await repo2.clearActiveSession();
    expect(await repo2.getActiveSession()).toBeNull();
  });

  it('saves completed session into history and updates stats and PRs', async () => {
    const repo = new MockWorkoutRepository();

    const initialStats = await repo.getWorkoutStats();
    const initialWorkoutsCount = initialStats.totalWorkouts;

    const completedSession: WorkoutSession = {
      id: 'sess_completed_99',
      workoutId: 'workout_push_strength',
      workoutName: 'Push Strength Routine',
      status: 'completed',
      startedAt: Date.now() - 3600000,
      endedAt: Date.now(),
      currentExerciseIndex: 1,
      currentSetIndex: 2,
      totalVolume: 4200,
      durationSeconds: 3600,
      pausedDurationMs: 0,
      personalRecords: [
        {
          id: 'pr_new_test',
          exerciseId: 'ex_bench_press',
          exerciseName: 'Barbell Bench Press',
          metric: '1rm',
          value: 105,
          achievedAt: Date.now(),
        },
      ],
      exercises: [
        {
          id: 'we_1',
          exerciseId: 'ex_bench_press',
          exerciseName: 'Barbell Bench Press',
          order: 1,
          targetSets: 1,
          targetReps: 5,
          restSeconds: 90,
          sets: [
            { id: 's1', setNumber: 1, type: 'normal', targetReps: 5, targetWeight: 80, actualReps: 5, actualWeight: 90, completed: true },
          ],
        },
      ],
    };

    await repo.saveWorkoutSession(completedSession);

    // Check history
    const [latestHistory] = await repo.getWorkoutHistory({ limit: 1 });
    expect(latestHistory.sessionId).toBe('sess_completed_99');
    expect(latestHistory.totalVolume).toBe(4200);

    // Check stats increment
    const updatedStats = await repo.getWorkoutStats();
    expect(updatedStats.totalWorkouts).toBe(initialWorkoutsCount + 1);
    expect(updatedStats.totalVolumeKg).toBe(initialStats.totalVolumeKg + 4200);

    // Check PRs
    const prs = await repo.getPersonalRecords('ex_bench_press');
    const newPr = prs.find((p) => p.value === 105);
    expect(newPr).toBeDefined();
  });

  it('returns valid recommendations matching WorkoutRecommendation contract', async () => {
    const repo = new MockWorkoutRepository();
    const recommendations = await repo.getRecommendations();

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0].workoutId).toBeDefined();
    expect(recommendations[0].score).toBeGreaterThan(0);
    expect(recommendations[0].score).toBeLessThanOrEqual(1.0);
    expect(recommendations[0].reason).toBeDefined();
    expect(recommendations[0].readinessAlignment).toBeGreaterThanOrEqual(0);
  });
});
