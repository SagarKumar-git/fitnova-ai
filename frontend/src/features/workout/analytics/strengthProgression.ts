/**
 * FitNova AI — Strength Progression Analytics
 * Epley 1RM trajectory calculations, historical peaks, and percentage strength delta over time.
 * Pure TypeScript. Zero UI code.
 */

import { calculateEstimated1RM } from '../utils/workoutRules.ts';
import type { WorkoutHistoryEntry } from '../models/WorkoutHistory.ts';

export interface StrengthCurvePoint {
  date: string;
  weight: number;
  reps: number;
  estimated1RM: number;
}

export interface ExerciseStrengthSummary {
  exerciseId: string;
  exerciseName: string;
  initial1RM: number;
  current1RM: number;
  allTimeBest1RM: number;
  percentageGain: number;
  curve: StrengthCurvePoint[];
}

/**
 * Computes 1RM progression curve over time for a given exercise from history entries.
 */
export function calculateExerciseProgressionCurve(
  exerciseId: string,
  history: WorkoutHistoryEntry[]
): ExerciseStrengthSummary {
  const curve: StrengthCurvePoint[] = [];
  let exerciseName = 'Exercise';

  // Sort chronological
  const sorted = [...history].sort((a, b) => a.completedAt - b.completedAt);

  for (const entry of sorted) {
    const matchingEx = entry.exercises.find((e) => e.exerciseId === exerciseId);
    if (!matchingEx || !matchingEx.bestSet) continue;

    exerciseName = matchingEx.exerciseName;
    const est1RM = calculateEstimated1RM(matchingEx.bestSet.weight, matchingEx.bestSet.reps);

    curve.push({
      date: entry.date,
      weight: matchingEx.bestSet.weight,
      reps: matchingEx.bestSet.reps,
      estimated1RM: est1RM,
    });
  }

  if (curve.length === 0) {
    return {
      exerciseId,
      exerciseName,
      initial1RM: 0,
      current1RM: 0,
      allTimeBest1RM: 0,
      percentageGain: 0,
      curve: [],
    };
  }

  const initial1RM = curve[0].estimated1RM;
  const current1RM = curve[curve.length - 1].estimated1RM;
  const allTimeBest1RM = Math.max(...curve.map((p) => p.estimated1RM));
  const percentageGain =
    initial1RM > 0 ? Math.round(((current1RM - initial1RM) / initial1RM) * 1000) / 10 : 0;

  return {
    exerciseId,
    exerciseName,
    initial1RM,
    current1RM,
    allTimeBest1RM,
    percentageGain,
    curve,
  };
}
