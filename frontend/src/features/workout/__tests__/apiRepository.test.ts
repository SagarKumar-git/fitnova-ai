/**
 * FitNova AI — ApiWorkoutRepository Unit & Fallback Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiWorkoutRepository } from '../repositories/ApiWorkoutRepository.ts';
import { StorageService } from '../../../platform/storage/StorageService.ts';
import { MemoryStorageAdapter } from '../../../platform/storage/MemoryStorageAdapter.ts';
import type { ApiClient } from '../../../platform/network/ApiClient.ts';
import type { ExerciseDto, WorkoutTemplateDto, WorkoutSessionDto, WorkoutAnalyticsDto } from '../api/workoutDtos.ts';

describe('Workout OS — ApiWorkoutRepository', () => {
  let mockApiClient: ApiClient;
  let storage: StorageService;
  let repository: ApiWorkoutRepository;

  beforeEach(() => {
    storage = new StorageService({ adapter: new MemoryStorageAdapter() });

    mockApiClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
      request: vi.fn(),
      getStats: vi.fn(),
      clearTelemetry: vi.fn(),
    } as unknown as ApiClient;

    repository = new ApiWorkoutRepository({
      apiClient: mockApiClient,
      storageService: storage,
    });
  });

  describe('getWorkouts', () => {
    it('fetches templates from API and maps to domain workouts', async () => {
      const mockTemplates: WorkoutTemplateDto[] = [
        {
          id: 'tmpl_1',
          user_id: 'u1',
          name: 'Power Chest Day',
          description: 'Heavy bench and accessories',
          created_at: '2026-09-01T10:00:00Z',
          exercises: [
            {
              id: 'te_1',
              template_id: 'tmpl_1',
              exercise_id: 'ex_bench',
              order: 1,
              target_sets: 3,
              target_reps: 8,
              target_weight: 80,
              rest_seconds: 120,
              exercise: {
                id: 'ex_bench',
                name: 'Bench Press',
                category: 'Strength',
                equipment: 'Barbell',
                description: 'Flat press',
                is_custom: false,
                created_by: null,
                created_at: '2026-09-01T10:00:00Z',
                primary_muscle_group_id: 'mg_chest',
                primary_muscle_group_name: 'Chest',
              },
            },
          ],
        },
      ];

      vi.mocked(mockApiClient.request).mockResolvedValueOnce(mockTemplates);

      const workouts = await repository.getWorkouts();
      expect(workouts.length).toBe(1);
      expect(workouts[0].id).toBe('tmpl_1');
      expect(workouts[0].name).toBe('Power Chest Day');
      expect(workouts[0].targetMuscleGroups).toContain('Chest');
    });

    it('falls back to local storage cache when API request fails', async () => {
      const cachedWorkouts = [
        {
          id: 'cached_w1',
          name: 'Cached Offline Workout',
          description: 'Offline routine',
          goal: 'Hypertrophy' as const,
          difficulty: 'Intermediate' as const,
          estimatedDurationMinutes: 45,
          targetMuscleGroups: ['Back' as const],
          equipment: ['Dumbbell' as const],
          tags: ['Back'],
          exercises: [],
          isTemplate: true,
          createdAt: Date.now(),
        },
      ];

      storage.setJSON('fitnova:cache:workouts', cachedWorkouts);

      vi.mocked(mockApiClient.request).mockRejectedValueOnce(new Error('Network error'));

      const workouts = await repository.getWorkouts();
      expect(workouts.length).toBe(1);
      expect(workouts[0].id).toBe('cached_w1');
      expect(workouts[0].name).toBe('Cached Offline Workout');
    });

    it('falls back to mock workouts if both API and cache are empty/fail', async () => {
      vi.mocked(mockApiClient.request).mockRejectedValueOnce(new Error('Network error'));

      const workouts = await repository.getWorkouts();
      expect(workouts.length).toBeGreaterThan(0);
      expect(workouts.some((w) => w.name.includes('Push'))).toBe(true);
    });
  });

  describe('getExercises', () => {
    it('fetches exercises from API and filters by muscle group', async () => {
      const mockExercisesDto: ExerciseDto[] = [
        {
          id: 'ex_chest_1',
          name: 'Incline Dumbbell Press',
          category: 'Hypertrophy',
          equipment: 'Dumbbell',
          description: 'Incline bench press',
          is_custom: false,
          created_by: null,
          created_at: '2026-09-01T10:00:00Z',
          primary_muscle_group_id: 'mg_chest',
          primary_muscle_group_name: 'Chest',
        },
        {
          id: 'ex_back_1',
          name: 'Pull Up',
          category: 'Strength',
          equipment: 'Bodyweight',
          description: 'Overhand pull-up',
          is_custom: false,
          created_by: null,
          created_at: '2026-09-01T10:00:00Z',
          primary_muscle_group_id: 'mg_back',
          primary_muscle_group_name: 'Back',
        },
      ];

      vi.mocked(mockApiClient.request).mockResolvedValueOnce(mockExercisesDto);

      const chestExercises = await repository.getExercises({ muscleGroup: 'Chest' });
      expect(chestExercises.length).toBe(1);
      expect(chestExercises[0].name).toBe('Incline Dumbbell Press');
      expect(chestExercises[0].primaryMuscleGroup).toBe('Chest');
    });
  });

  describe('getActiveSession', () => {
    it('returns local active session if remote has fewer completed sets (optimistic local preference)', async () => {
      const localSession = {
        id: 'sess_1',
        workoutId: 'w_1',
        workoutName: 'Live Push Routine',
        status: 'active' as const,
        startedAt: Date.now() - 60000,
        durationSeconds: 60,
        pausedDurationMs: 0,
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        exercises: [
          {
            id: 'e1',
            exerciseId: 'ex_1',
            exerciseName: 'Bench',
            order: 1,
            targetSets: 3,
            targetReps: 8,
            targetWeight: 80,
            restSeconds: 90,
            sets: [
              {
                id: 's1',
                setNumber: 1,
                type: 'normal' as const,
                targetReps: 8,
                actualReps: 8,
                targetWeight: 80,
                actualWeight: 80,
                completed: true,
                skipped: false,
              },
              {
                id: 's2',
                setNumber: 2,
                type: 'normal' as const,
                targetReps: 8,
                actualReps: 8,
                targetWeight: 80,
                actualWeight: 80,
                completed: true,
                skipped: false,
              },
            ],
          },
        ],
        totalVolume: 1280,
        personalRecords: [],
      };

      await repository.saveActiveSession(localSession);

      // Remote has only 1 set logged so far
      const remoteDto: WorkoutSessionDto = {
        id: 'sess_1',
        user_id: 'u1',
        template_id: 'w_1',
        name: 'Live Push Routine',
        started_at: new Date(Date.now() - 60000).toISOString(),
        ended_at: null,
        duration_seconds: 60,
        notes: null,
        total_volume: 640,
        total_sets: 1,
        created_at: new Date(Date.now() - 60000).toISOString(),
        sets: [
          {
            id: 's1',
            session_id: 'sess_1',
            exercise_id: 'ex_1',
            set_number: 1,
            reps: 8,
            weight: 80,
            rpe: 8,
            rest_seconds: 90,
            is_pr: false,
            created_at: new Date().toISOString(),
            exercise_name: 'Bench',
          },
        ],
      };

      vi.mocked(mockApiClient.request).mockResolvedValueOnce(remoteDto);

      const session = await repository.getActiveSession();
      expect(session).not.toBeNull();
      expect(session?.exercises[0].sets.length).toBe(2);
    });

    it('returns null and clears active session when clearActiveSession is called', async () => {
      await repository.saveActiveSession({
        id: 'temp_sess',
        workoutId: 'w1',
        workoutName: 'Push',
        status: 'active',
        startedAt: Date.now(),
        durationSeconds: 0,
        pausedDurationMs: 0,
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        exercises: [],
        totalVolume: 0,
        personalRecords: [],
      });

      await repository.clearActiveSession();

      vi.mocked(mockApiClient.request).mockResolvedValueOnce(null);

      const session = await repository.getActiveSession();
      expect(session).toBeNull();
    });
  });

  describe('getWorkoutStats', () => {
    it('fetches analytics and transforms into WorkoutStats domain model', async () => {
      const mockAnalyticsDto: WorkoutAnalyticsDto = {
        total_workouts: 10,
        total_volume: 25000,
        total_sets: 80,
        total_duration_minutes: 500,
        weekly_workout_frequency: 3,
        workout_streak: {
          id: 'strk_1',
          user_id: 'u1',
          daily_streak: 1,
          weekly_streak: 3,
          longest_daily_streak: 2,
          longest_weekly_streak: 5,
          last_workout_date: '2026-09-10',
        },
        muscle_volume_breakdown: {
          Chest: 50,
          Triceps: 30,
          Shoulders: 20,
        },
        goals: null,
      };

      vi.mocked(mockApiClient.request).mockResolvedValueOnce(mockAnalyticsDto);

      const stats = await repository.getWorkoutStats();
      expect(stats.totalWorkouts).toBe(10);
      expect(stats.totalVolumeKg).toBe(25000);
      expect(stats.currentStreakWeeks).toBe(3);
      expect(stats.muscleGroupDistribution.Chest).toBe(50);
    });
  });
});
