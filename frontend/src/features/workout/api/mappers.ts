/**
 * FitNova AI — Workout DTO to Domain Mappers
 * Pure mapping functions translating API DTOs into Domain Models.
 * Handles missing fields, date parsing, enums, and data structure differences.
 */

import type {
  ExerciseDto,
  WorkoutTemplateDto,
  WorkoutSessionDto,
  WorkoutSetDto,
  PersonalRecordDto,
  WorkoutAnalyticsDto,
} from './workoutDtos.ts';
import type {
  Exercise,
  Workout,
  WorkoutExercise,
  WorkoutSet,
  WorkoutSession,
  PersonalRecord,
  WorkoutStats,
  WorkoutHistoryEntry,
  ExerciseHistorySummary,
} from '../models/index.ts';
import type { MuscleGroup, Equipment, WorkoutGoal, WorkoutDifficulty } from '../types/enums.ts';

const VALID_MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Quadriceps',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Core',
  'Forearms',
  'Full Body',
];

export function sanitizeMuscleGroup(input?: string | null): MuscleGroup {
  if (!input) return 'Full Body';
  const match = VALID_MUSCLE_GROUPS.find(
    (m) => m.toLowerCase() === input.trim().toLowerCase()
  );
  return match ?? 'Full Body';
}

export function sanitizeEquipment(input?: string | null): Equipment {
  if (!input) return 'Bodyweight';
  const val = input.toLowerCase();
  if (val.includes('barbell')) return 'Barbell';
  if (val.includes('dumbbell')) return 'Dumbbell';
  if (val.includes('cable')) return 'Cable';
  if (val.includes('machine')) return 'Machine';
  if (val.includes('band')) return 'Bands';
  if (val.includes('kettlebell')) return 'Kettlebell';
  return 'Bodyweight';
}

/**
 * Maps Exercise API DTO to Exercise Domain Model.
 */
export function mapExerciseDtoToDomain(dto: ExerciseDto): Exercise {
  const primaryMuscle = sanitizeMuscleGroup(dto.primary_muscle_group_name);
  const secondaryMuscles: MuscleGroup[] = (dto.muscles || [])
    .filter((m) => !m.is_primary && m.muscle_group_name)
    .map((m) => sanitizeMuscleGroup(m.muscle_group_name));

  return {
    id: dto.id,
    name: dto.name,
    description: dto.description || 'Compound resistance exercise.',
    primaryMuscleGroup: primaryMuscle,
    secondaryMuscleGroups: secondaryMuscles,
    equipment: sanitizeEquipment(dto.equipment),
    difficulty: (dto.category === 'Advanced'
      ? 'Advanced'
      : dto.category === 'Intermediate'
      ? 'Intermediate'
      : 'Beginner') as WorkoutDifficulty,
    instructions: [
      'Maintain braced abdominal intra-abdominal pressure.',
      'Execute through a full, controlled range of motion.',
      'Control the eccentric lowering phase with intent.',
    ],
    tips: ['Keep shoulder blades retracted and stable.', 'Breathe out on exertion.'],
    defaultRestSeconds: 90,
    media: dto.media
      ? {
          videoUrl: dto.media.video_url ?? undefined,
          thumbnailUrl: dto.media.thumbnail_url ?? undefined,
        }
      : undefined,
    isCustom: dto.is_custom,
  };
}

/**
 * Maps Workout Set API DTO to WorkoutSet Domain Model.
 */
export function mapWorkoutSetDtoToDomain(dto: WorkoutSetDto): WorkoutSet {
  return {
    id: dto.id,
    setNumber: dto.set_number,
    type: 'normal',
    targetReps: dto.reps,
    targetWeight: dto.weight,
    actualReps: dto.reps,
    actualWeight: dto.weight,
    rpe: dto.rpe ?? undefined,
    completed: true,
    completedAt: dto.created_at ? new Date(dto.created_at).getTime() : Date.now(),
    skipped: false,
  };
}

/**
 * Maps Workout Template API DTO to Workout Domain Model.
 */
export function mapWorkoutTemplateDtoToDomain(dto: WorkoutTemplateDto): Workout {
  const muscleSet = new Set<MuscleGroup>();
  const equipmentSet = new Set<Equipment>();

  const exercises: WorkoutExercise[] = (dto.exercises || []).map((te, index) => {
    const exerciseName = te.exercise?.name || `Exercise ${index + 1}`;
    if (te.exercise?.primary_muscle_group_name) {
      muscleSet.add(sanitizeMuscleGroup(te.exercise.primary_muscle_group_name));
    }
    if (te.exercise?.equipment) {
      equipmentSet.add(sanitizeEquipment(te.exercise.equipment));
    }

    const targetSetsCount = te.target_sets || 3;
    const targetRepsCount = te.target_reps || 10;
    const targetWeightVal = te.target_weight || 0;

    const initialSets: WorkoutSet[] = Array.from({ length: targetSetsCount }, (_, i) => ({
      id: `${dto.id}_${te.exercise_id}_s${i + 1}`,
      setNumber: i + 1,
      type: 'normal',
      targetReps: targetRepsCount,
      targetWeight: targetWeightVal,
      completed: false,
      skipped: false,
    }));

    return {
      id: te.id || `${dto.id}_ex_${index}`,
      exerciseId: te.exercise_id,
      exerciseName,
      order: te.order,
      targetSets: targetSetsCount,
      targetReps: targetRepsCount,
      targetWeight: targetWeightVal,
      restSeconds: te.rest_seconds || 90,
      sets: initialSets,
    };
  });

  const targetMuscles = muscleSet.size > 0 ? Array.from(muscleSet) : ['Full Body'];
  const targetEquipment = equipmentSet.size > 0 ? Array.from(equipmentSet) : ['Barbell'];

  return {
    id: dto.id,
    name: dto.name,
    description: dto.description || 'Structured strength and hypertrophy workout routine.',
    goal: 'Hypertrophy' as WorkoutGoal,
    difficulty: 'Intermediate' as WorkoutDifficulty,
    estimatedDurationMinutes: Math.max(30, exercises.length * 12),
    targetMuscleGroups: targetMuscles as MuscleGroup[],
    equipment: targetEquipment as Equipment[],
    tags: [dto.name.toLowerCase().includes('push') ? 'Push' : 'Hypertrophy'],
    exercises,
    isTemplate: true,
    createdBy: dto.user_id,
    createdAt: dto.created_at ? new Date(dto.created_at).getTime() : Date.now(),
  };
}

/**
 * Maps Workout Session API DTO to WorkoutSession Domain Model.
 */
export function mapWorkoutSessionDtoToDomain(dto: WorkoutSessionDto): WorkoutSession {
  const startedAt = dto.started_at ? new Date(dto.started_at).getTime() : Date.now();
  const endedAt = dto.ended_at ? new Date(dto.ended_at).getTime() : undefined;
  const isFinished = endedAt !== undefined;

  // Group flat sets by exercise_id
  const exerciseMap = new Map<string, { exerciseName: string; sets: WorkoutSet[] }>();

  for (const s of dto.sets || []) {
    if (!exerciseMap.has(s.exercise_id)) {
      exerciseMap.set(s.exercise_id, {
        exerciseName: s.exercise_name || 'Exercise',
        sets: [],
      });
    }
    exerciseMap.get(s.exercise_id)!.sets.push(mapWorkoutSetDtoToDomain(s));
  }

  let order = 0;
  const exercises: WorkoutExercise[] = [];
  for (const [exerciseId, data] of exerciseMap.entries()) {
    exercises.push({
      id: `sess_ex_${exerciseId}`,
      exerciseId,
      exerciseName: data.exerciseName,
      order: order++,
      targetSets: data.sets.length,
      targetReps: data.sets[0]?.targetReps || 10,
      targetWeight: data.sets[0]?.targetWeight || 0,
      restSeconds: 90,
      sets: data.sets,
    });
  }

  return {
    id: dto.id,
    workoutId: dto.template_id || dto.id,
    workoutName: dto.name,
    status: isFinished ? 'completed' : 'active',
    startedAt,
    endedAt,
    durationSeconds: dto.duration_seconds || 0,
    pausedDurationMs: 0,
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    exercises,
    totalVolume: dto.total_volume,
    personalRecords: [],
    notes: dto.notes ?? undefined,
  };
}

/**
 * Maps Personal Record API DTO to PersonalRecord Domain Model.
 */
export function mapPersonalRecordDtoToDomain(dto: PersonalRecordDto): PersonalRecord {
  const timestamp = dto.record_date ? new Date(dto.record_date).getTime() : Date.now();
  return {
    id: dto.id,
    exerciseId: dto.exercise_id,
    exerciseName: dto.exercise_name || 'Exercise',
    metric: 'max_weight',
    value: dto.best_weight,
    achievedAt: timestamp,
  };
}

/**
 * Maps Workout Session DTO into WorkoutHistoryEntry Domain Model.
 */
export function mapWorkoutSessionDtoToHistoryEntry(dto: WorkoutSessionDto): WorkoutHistoryEntry {
  const completedAt = dto.ended_at
    ? new Date(dto.ended_at).getTime()
    : dto.created_at
    ? new Date(dto.created_at).getTime()
    : Date.now();

  const dateStr = new Date(completedAt).toISOString().split('T')[0];

  // Group exercise summaries
  const exerciseMap = new Map<string, ExerciseHistorySummary>();
  let prsCount = 0;

  for (const s of dto.sets || []) {
    if (s.is_pr) prsCount++;

    if (!exerciseMap.has(s.exercise_id)) {
      exerciseMap.set(s.exercise_id, {
        exerciseId: s.exercise_id,
        exerciseName: s.exercise_name || 'Exercise',
        setsCount: 0,
        bestSet: { reps: s.reps, weight: s.weight },
        volume: 0,
      });
    }

    const current = exerciseMap.get(s.exercise_id)!;
    current.setsCount += 1;
    current.volume += s.weight * s.reps;
    if (s.weight > current.bestSet.weight) {
      current.bestSet = { reps: s.reps, weight: s.weight };
    }
  }

  return {
    id: dto.id,
    sessionId: dto.id,
    workoutId: dto.template_id || dto.id,
    workoutName: dto.name,
    date: dateStr,
    completedAt,
    durationSeconds: dto.duration_seconds || 0,
    totalVolume: dto.total_volume,
    totalSets: dto.total_sets || dto.sets?.length || 0,
    completedSets: dto.sets?.length || 0,
    exercisesCount: exerciseMap.size,
    personalRecordsCount: prsCount,
    exercises: Array.from(exerciseMap.values()),
    notes: dto.notes ?? undefined,
  };
}

/**
 * Maps Workout Analytics API DTO to WorkoutStats Domain Model.
 */
export function mapWorkoutAnalyticsDtoToDomain(dto: WorkoutAnalyticsDto): WorkoutStats {
  const muscleDistribution: Record<MuscleGroup, number> = {
    Chest: 0,
    Back: 0,
    Shoulders: 0,
    Biceps: 0,
    Triceps: 0,
    Quadriceps: 0,
    Hamstrings: 0,
    Glutes: 0,
    Calves: 0,
    Core: 0,
    Forearms: 0,
    'Full Body': 0,
  };

  if (dto.muscle_volume_breakdown) {
    for (const [key, value] of Object.entries(dto.muscle_volume_breakdown)) {
      const sanitized = sanitizeMuscleGroup(key);
      muscleDistribution[sanitized] = value;
    }
  }

  return {
    totalWorkouts: dto.total_workouts,
    totalVolumeKg: dto.total_volume,
    totalDurationMinutes: dto.total_duration_minutes,
    currentStreakWeeks: dto.workout_streak?.weekly_streak || 0,
    bestStreakWeeks: dto.workout_streak?.longest_weekly_streak || 0,
    muscleGroupDistribution: muscleDistribution,
    weeklyVolumeTrends: [],
    totalPersonalRecords: 0,
  };
}
