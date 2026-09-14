/**
 * FitNova AI — Workout DTO Mappers Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeMuscleGroup,
  sanitizeEquipment,
  mapExerciseDtoToDomain,
  mapWorkoutSetDtoToDomain,
  mapWorkoutTemplateDtoToDomain,
  mapWorkoutSessionDtoToDomain,
  mapPersonalRecordDtoToDomain,
  mapWorkoutSessionDtoToHistoryEntry,
  mapWorkoutAnalyticsDtoToDomain,
} from '../api/mappers.ts';
import type {
  ExerciseDto,
  WorkoutTemplateDto,
  WorkoutSessionDto,
  WorkoutSetDto,
  PersonalRecordDto,
  WorkoutAnalyticsDto,
} from '../api/workoutDtos.ts';

describe('Workout OS — DTO Mappers', () => {
  describe('Sanitizers', () => {
    it('sanitizes muscle group strings with fallback to Full Body', () => {
      expect(sanitizeMuscleGroup('Chest')).toBe('Chest');
      expect(sanitizeMuscleGroup('chest')).toBe('Chest');
      expect(sanitizeMuscleGroup('  biceps ')).toBe('Biceps');
      expect(sanitizeMuscleGroup(null)).toBe('Full Body');
      expect(sanitizeMuscleGroup(undefined)).toBe('Full Body');
      expect(sanitizeMuscleGroup('UnknownMuscleGroup')).toBe('Full Body');
    });

    it('sanitizes equipment keywords with fallback to Bodyweight', () => {
      expect(sanitizeEquipment('Olympic Barbell')).toBe('Barbell');
      expect(sanitizeEquipment('Hex Dumbbell')).toBe('Dumbbell');
      expect(sanitizeEquipment('Cable Pulley')).toBe('Cable');
      expect(sanitizeEquipment('Leg Press Machine')).toBe('Machine');
      expect(sanitizeEquipment('Resistance Loop Band')).toBe('Bands');
      expect(sanitizeEquipment('Cast Iron Kettlebell')).toBe('Kettlebell');
      expect(sanitizeEquipment(null)).toBe('Bodyweight');
      expect(sanitizeEquipment('Floor Mat')).toBe('Bodyweight');
    });
  });

  describe('mapExerciseDtoToDomain', () => {
    it('maps an ExerciseDto to an Exercise domain model accurately', () => {
      const dto: ExerciseDto = {
        id: 'ex_bench_1',
        name: 'Barbell Bench Press',
        category: 'Strength',
        equipment: 'Barbell',
        description: 'Standard horizontal chest press on flat bench.',
        is_custom: false,
        created_by: null,
        created_at: '2026-09-01T10:00:00Z',
        primary_muscle_group_id: 'mg_chest',
        primary_muscle_group_name: 'Chest',
        muscles: [
          {
            id: 'm_1',
            exercise_id: 'ex_bench_1',
            muscle_group_id: 'mg_chest',
            is_primary: true,
            contribution_pct: 70,
            muscle_group_name: 'Chest',
          },
          {
            id: 'm_2',
            exercise_id: 'ex_bench_1',
            muscle_group_id: 'mg_triceps',
            is_primary: false,
            contribution_pct: 30,
            muscle_group_name: 'Triceps',
          },
        ],
        media: {
          id: 'media_1',
          exercise_id: 'ex_bench_1',
          video_url: 'https://example.com/bench.mp4',
          thumbnail_url: 'https://example.com/bench.jpg',
        },
      };

      const domain = mapExerciseDtoToDomain(dto);
      expect(domain.id).toBe('ex_bench_1');
      expect(domain.name).toBe('Barbell Bench Press');
      expect(domain.primaryMuscleGroup).toBe('Chest');
      expect(domain.secondaryMuscleGroups).toContain('Triceps');
      expect(domain.equipment).toBe('Barbell');
      expect(domain.isCustom).toBe(false);
      expect(domain.media?.videoUrl).toBe('https://example.com/bench.mp4');
      expect(domain.media?.thumbnailUrl).toBe('https://example.com/bench.jpg');
    });

    it('gracefully handles missing optional fields in ExerciseDto', () => {
      const minimalDto: ExerciseDto = {
        id: 'ex_custom_1',
        name: 'Custom Pushup',
        category: 'Bodyweight',
        equipment: 'Bodyweight',
        description: null,
        is_custom: true,
        created_by: 'user_123',
        created_at: '2026-09-01T10:00:00Z',
        primary_muscle_group_id: null,
        primary_muscle_group_name: null,
      };

      const domain = mapExerciseDtoToDomain(minimalDto);
      expect(domain.primaryMuscleGroup).toBe('Full Body');
      expect(domain.secondaryMuscleGroups).toEqual([]);
      expect(domain.description).toBe('Compound resistance exercise.');
      expect(domain.media).toBeUndefined();
    });
  });

  describe('mapWorkoutSetDtoToDomain', () => {
    it('maps WorkoutSetDto to WorkoutSet domain model', () => {
      const dto: WorkoutSetDto = {
        id: 'set_101',
        session_id: 'sess_1',
        exercise_id: 'ex_bench',
        set_number: 2,
        reps: 8,
        weight: 100,
        rpe: 8.5,
        rest_seconds: 120,
        is_pr: true,
        created_at: '2026-09-02T12:00:00Z',
        exercise_name: 'Bench Press',
      };

      const domain = mapWorkoutSetDtoToDomain(dto);
      expect(domain.id).toBe('set_101');
      expect(domain.setNumber).toBe(2);
      expect(domain.targetReps).toBe(8);
      expect(domain.targetWeight).toBe(100);
      expect(domain.actualReps).toBe(8);
      expect(domain.actualWeight).toBe(100);
      expect(domain.rpe).toBe(8.5);
      expect(domain.completed).toBe(true);
      expect(domain.skipped).toBe(false);
    });
  });

  describe('mapWorkoutTemplateDtoToDomain', () => {
    it('maps WorkoutTemplateDto with exercises and sets to Workout domain model', () => {
      const dto: WorkoutTemplateDto = {
        id: 'tmpl_upper_a',
        user_id: 'user_1',
        name: 'Upper Body Power A',
        description: 'Heavy pressing and rowing day',
        created_at: '2026-09-01T08:00:00Z',
        exercises: [
          {
            id: 'te_1',
            template_id: 'tmpl_upper_a',
            exercise_id: 'ex_bench',
            order: 1,
            target_sets: 4,
            target_reps: 6,
            target_weight: 90,
            rest_seconds: 180,
            exercise: {
              id: 'ex_bench',
              name: 'Barbell Bench Press',
              category: 'Strength',
              equipment: 'Barbell',
              description: 'Flat press',
              is_custom: false,
              created_by: null,
              created_at: '2026-09-01T08:00:00Z',
              primary_muscle_group_id: 'mg_chest',
              primary_muscle_group_name: 'Chest',
            },
          },
        ],
      };

      const domain = mapWorkoutTemplateDtoToDomain(dto);
      expect(domain.id).toBe('tmpl_upper_a');
      expect(domain.name).toBe('Upper Body Power A');
      expect(domain.exercises.length).toBe(1);
      expect(domain.exercises[0].exerciseName).toBe('Barbell Bench Press');
      expect(domain.exercises[0].targetSets).toBe(4);
      expect(domain.exercises[0].sets.length).toBe(4);
      expect(domain.targetMuscleGroups).toContain('Chest');
      expect(domain.isTemplate).toBe(true);
    });
  });

  describe('mapWorkoutSessionDtoToDomain', () => {
    it('maps an active WorkoutSessionDto to WorkoutSession domain model', () => {
      const dto: WorkoutSessionDto = {
        id: 'sess_1',
        user_id: 'user_1',
        template_id: 'tmpl_upper_a',
        name: 'Upper Body Power A',
        started_at: '2026-09-05T14:00:00Z',
        ended_at: null,
        duration_seconds: 0,
        notes: 'Feeling energized today',
        total_volume: 3200,
        total_sets: 4,
        created_at: '2026-09-05T14:00:00Z',
        sets: [
          {
            id: 'set_1',
            session_id: 'sess_1',
            exercise_id: 'ex_bench',
            set_number: 1,
            reps: 6,
            weight: 90,
            rpe: 8,
            rest_seconds: 180,
            is_pr: false,
            created_at: '2026-09-05T14:05:00Z',
            exercise_name: 'Barbell Bench Press',
          },
        ],
      };

      const domain = mapWorkoutSessionDtoToDomain(dto);
      expect(domain.id).toBe('sess_1');
      expect(domain.status).toBe('active');
      expect(domain.workoutName).toBe('Upper Body Power A');
      expect(domain.totalVolume).toBe(3200);
      expect(domain.exercises.length).toBe(1);
      expect(domain.exercises[0].sets.length).toBe(1);
    });

    it('maps a completed WorkoutSessionDto to status completed', () => {
      const dto: WorkoutSessionDto = {
        id: 'sess_done_1',
        user_id: 'user_1',
        template_id: 'tmpl_upper_a',
        name: 'Upper Body Power A',
        started_at: '2026-09-05T14:00:00Z',
        ended_at: '2026-09-05T14:55:00Z',
        duration_seconds: 3300,
        notes: 'Great workout',
        total_volume: 4500,
        total_sets: 6,
        created_at: '2026-09-05T14:00:00Z',
        sets: [],
      };

      const domain = mapWorkoutSessionDtoToDomain(dto);
      expect(domain.status).toBe('completed');
      expect(domain.durationSeconds).toBe(3300);
    });
  });

  describe('mapPersonalRecordDtoToDomain', () => {
    it('maps PersonalRecordDto to PersonalRecord domain model', () => {
      const dto: PersonalRecordDto = {
        id: 'pr_1',
        user_id: 'user_1',
        exercise_id: 'ex_bench',
        best_weight: 120,
        best_volume: 2400,
        best_estimated_1rm: 135,
        record_date: '2026-09-05',
        exercise_name: 'Bench Press',
      };

      const domain = mapPersonalRecordDtoToDomain(dto);
      expect(domain.id).toBe('pr_1');
      expect(domain.exerciseName).toBe('Bench Press');
      expect(domain.value).toBe(120);
      expect(domain.metric).toBe('max_weight');
    });
  });

  describe('mapWorkoutSessionDtoToHistoryEntry', () => {
    it('aggregates sets and volume into a WorkoutHistoryEntry', () => {
      const dto: WorkoutSessionDto = {
        id: 'sess_hist_1',
        user_id: 'user_1',
        template_id: null,
        name: 'Freestyle Chest',
        started_at: '2026-09-06T10:00:00Z',
        ended_at: '2026-09-06T10:45:00Z',
        duration_seconds: 2700,
        notes: 'Hit a PR on bench',
        total_volume: 2500,
        total_sets: 3,
        created_at: '2026-09-06T10:00:00Z',
        sets: [
          {
            id: 's_1',
            session_id: 'sess_hist_1',
            exercise_id: 'ex_bench',
            set_number: 1,
            reps: 10,
            weight: 80,
            rpe: 7,
            rest_seconds: 90,
            is_pr: false,
            created_at: '2026-09-06T10:10:00Z',
            exercise_name: 'Bench Press',
          },
          {
            id: 's_2',
            session_id: 'sess_hist_1',
            exercise_id: 'ex_bench',
            set_number: 2,
            reps: 8,
            weight: 90,
            rpe: 9,
            rest_seconds: 120,
            is_pr: true,
            created_at: '2026-09-06T10:20:00Z',
            exercise_name: 'Bench Press',
          },
        ],
      };

      const entry = mapWorkoutSessionDtoToHistoryEntry(dto);
      expect(entry.id).toBe('sess_hist_1');
      expect(entry.workoutName).toBe('Freestyle Chest');
      expect(entry.personalRecordsCount).toBe(1);
      expect(entry.exercises.length).toBe(1);
      expect(entry.exercises[0].bestSet.weight).toBe(90);
      expect(entry.exercises[0].setsCount).toBe(2);
    });
  });

  describe('mapWorkoutAnalyticsDtoToDomain', () => {
    it('maps WorkoutAnalyticsDto to WorkoutStats domain model', () => {
      const dto: WorkoutAnalyticsDto = {
        total_workouts: 14,
        total_volume: 42000,
        total_sets: 120,
        total_duration_minutes: 840,
        weekly_workout_frequency: 3.5,
        workout_streak: {
          id: 'streak_1',
          user_id: 'user_1',
          daily_streak: 2,
          weekly_streak: 4,
          longest_daily_streak: 3,
          longest_weekly_streak: 8,
          last_workout_date: '2026-09-06',
        },
        muscle_volume_breakdown: {
          Chest: 40,
          Back: 35,
          Shoulders: 25,
        },
        goals: null,
      };

      const stats = mapWorkoutAnalyticsDtoToDomain(dto);
      expect(stats.totalWorkouts).toBe(14);
      expect(stats.totalVolumeKg).toBe(42000);
      expect(stats.currentStreakWeeks).toBe(4);
      expect(stats.bestStreakWeeks).toBe(8);
      expect(stats.muscleGroupDistribution.Chest).toBe(40);
      expect(stats.muscleGroupDistribution.Back).toBe(35);
      expect(stats.muscleGroupDistribution.Shoulders).toBe(25);
      expect(stats.muscleGroupDistribution.Biceps).toBe(0);
    });
  });
});
