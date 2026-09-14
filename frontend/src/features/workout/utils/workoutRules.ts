/**
 * FitNova AI — Workout Domain Business Rules
 * Pure TypeScript calculation and domain validation logic.
 * ZERO React dependencies. ZERO side-effects.
 */

import type {
  WorkoutExercise,
  WorkoutSet,
  WorkoutSession,
  PersonalRecord,
  WorkoutHistoryEntry,
  WorkoutStats,
} from '../models/index.ts';
import type { MuscleGroup } from '../types/enums.ts';

/**
 * Calculates volume (kg) for an individual set.
 */
export function calculateSetVolume(reps: number, weight: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  return Math.round(reps * weight * 10) / 10;
}

/**
 * Calculates total volume for a list of sets in an exercise.
 */
export function calculateExerciseVolume(sets: WorkoutSet[]): number {
  return sets
    .filter((s) => s.completed && !s.skipped)
    .reduce((acc, s) => {
      const reps = s.actualReps ?? s.targetReps;
      const weight = s.actualWeight ?? s.targetWeight;
      return acc + calculateSetVolume(reps, weight);
    }, 0);
}

/**
 * Calculates total volume across all exercises in a workout routine or session.
 */
export function calculateTotalWorkoutVolume(exercises: WorkoutExercise[]): number {
  return exercises.reduce((sum, ex) => sum + calculateExerciseVolume(ex.sets), 0);
}

/**
 * Counts total completed sets across all exercises.
 */
export function calculateCompletedSets(exercises: WorkoutExercise[]): number {
  return exercises.reduce(
    (count, ex) => count + ex.sets.filter((s) => s.completed).length,
    0
  );
}

/**
 * Counts total target sets across all exercises.
 */
export function calculateTotalSets(exercises: WorkoutExercise[]): number {
  return exercises.reduce((count, ex) => count + ex.sets.length, 0);
}

/**
 * Calculates percentage of workout completion (0% - 100%).
 */
export function calculateWorkoutCompletionPercentage(exercises: WorkoutExercise[]): number {
  const total = calculateTotalSets(exercises);
  if (total === 0) return 0;
  const completed = calculateCompletedSets(exercises);
  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
}

/**
 * Calculates actual active session duration in seconds, excluding pauses.
 */
export function calculateSessionDuration(
  startedAt: number,
  endedAt?: number,
  pausedDurationMs: number = 0
): number {
  const finishTime = endedAt ?? Date.now();
  const rawMs = finishTime - startedAt - pausedDurationMs;
  return Math.max(0, Math.round(rawMs / 1000));
}

/**
 * Calculates estimated One-Rep Max (1RM) using the industry-standard Epley Formula:
 * 1RM = Weight * (1 + Reps / 30)
 * If reps == 1, returns the exact weight.
 */
export function calculateEstimated1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  const epley = weight * (1 + reps / 30);
  return Math.round(epley * 10) / 10;
}

/**
 * Validates set parameters before logging.
 */
export function isSetValid(set: Partial<WorkoutSet>): boolean {
  const reps = set.actualReps ?? set.targetReps;
  const weight = set.actualWeight ?? set.targetWeight;

  if (reps === undefined || weight === undefined) return false;
  if (reps <= 0 || reps > 150) return false;
  if (weight < 0 || weight > 700) return false;
  if (set.rpe !== undefined && (set.rpe < 1 || set.rpe > 10)) return false;

  return true;
}

/**
 * Checks whether all target sets in a workout have been completed or skipped.
 */
export function isWorkoutComplete(exercises: WorkoutExercise[]): boolean {
  if (exercises.length === 0) return false;
  const total = calculateTotalSets(exercises);
  const completedOrSkipped = exercises.reduce(
    (count, ex) => count + ex.sets.filter((s) => s.completed || s.skipped).length,
    0
  );
  return total > 0 && completedOrSkipped === total;
}

/**
 * Compares a completed set against a previous historical best set.
 */
export function comparePreviousPerformance(
  currentSet: { reps: number; weight: number },
  previousBestSet?: { reps: number; weight: number }
): { weightDiff: number; repsDiff: number; volumeDiff: number } {
  if (!previousBestSet) {
    return {
      weightDiff: currentSet.weight,
      repsDiff: currentSet.reps,
      volumeDiff: calculateSetVolume(currentSet.reps, currentSet.weight),
    };
  }

  const currentVolume = calculateSetVolume(currentSet.reps, currentSet.weight);
  const previousVolume = calculateSetVolume(previousBestSet.reps, previousBestSet.weight);

  return {
    weightDiff: Math.round((currentSet.weight - previousBestSet.weight) * 10) / 10,
    repsDiff: currentSet.reps - previousBestSet.reps,
    volumeDiff: Math.round((currentVolume - previousVolume) * 10) / 10,
  };
}

/**
 * Evaluates session completed sets to detect new personal records.
 */
export function detectPersonalRecords(
  session: WorkoutSession,
  existingPRs: PersonalRecord[]
): PersonalRecord[] {
  const newPRs: PersonalRecord[] = [];

  // Group existing PRs by exerciseId and metric
  const prMap = new Map<string, number>();
  for (const pr of existingPRs) {
    prMap.set(`${pr.exerciseId}:${pr.metric}`, pr.value);
  }

  for (const exercise of session.exercises) {
    let maxWeight = 0;
    let maxReps = 0;
    let max1RM = 0;
    let totalExerciseVolume = 0;

    for (const set of exercise.sets) {
      if (!set.completed || set.skipped) continue;

      const reps = set.actualReps ?? set.targetReps;
      const weight = set.actualWeight ?? set.targetWeight;

      if (weight > maxWeight) maxWeight = weight;
      if (reps > maxReps) maxReps = reps;

      const estimated1RM = calculateEstimated1RM(weight, reps);
      if (estimated1RM > max1RM) max1RM = estimated1RM;

      totalExerciseVolume += calculateSetVolume(reps, weight);
    }

    // Evaluate 1RM
    const existing1RM = prMap.get(`${exercise.exerciseId}:1rm`) ?? 0;
    if (max1RM > existing1RM && max1RM > 0) {
      newPRs.push({
        id: `pr_${Date.now()}_${exercise.exerciseId}_1rm`,
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        metric: '1rm',
        value: max1RM,
        previousValue: existing1RM > 0 ? existing1RM : undefined,
        achievedAt: Date.now(),
        workoutSessionId: session.id,
        workoutName: session.workoutName,
      });
      prMap.set(`${exercise.exerciseId}:1rm`, max1RM);
    }

    // Evaluate Max Weight
    const existingWeight = prMap.get(`${exercise.exerciseId}:max_weight`) ?? 0;
    if (maxWeight > existingWeight && maxWeight > 0) {
      newPRs.push({
        id: `pr_${Date.now()}_${exercise.exerciseId}_weight`,
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        metric: 'max_weight',
        value: maxWeight,
        previousValue: existingWeight > 0 ? existingWeight : undefined,
        achievedAt: Date.now(),
        workoutSessionId: session.id,
        workoutName: session.workoutName,
      });
      prMap.set(`${exercise.exerciseId}:max_weight`, maxWeight);
    }
  }

  return newPRs;
}

/**
 * Aggregates workout history entries into high-level stats.
 */
export function calculateWorkoutStats(
  history: WorkoutHistoryEntry[],
  existingStats?: Partial<WorkoutStats>
): WorkoutStats {
  const totalWorkouts = history.length;
  const totalVolumeKg = history.reduce((sum, h) => sum + h.totalVolume, 0);
  const totalDurationMinutes = Math.round(
    history.reduce((sum, h) => sum + h.durationSeconds, 0) / 60
  );
  const totalPersonalRecords = history.reduce(
    (sum, h) => sum + h.personalRecordsCount,
    0
  );

  const muscleGroupDistribution: Record<MuscleGroup, number> = {
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

  return {
    totalWorkouts,
    totalVolumeKg: Math.round(totalVolumeKg),
    totalDurationMinutes,
    currentStreakWeeks: existingStats?.currentStreakWeeks ?? Math.min(totalWorkouts, 4),
    bestStreakWeeks: existingStats?.bestStreakWeeks ?? Math.max(existingStats?.currentStreakWeeks ?? 0, 6),
    muscleGroupDistribution: existingStats?.muscleGroupDistribution ?? muscleGroupDistribution,
    weeklyVolumeTrends: existingStats?.weeklyVolumeTrends ?? [],
    totalPersonalRecords,
  };
}
