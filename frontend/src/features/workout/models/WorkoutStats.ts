/**
 * FitNova AI — Workout Aggregated Statistics Domain Model
 * High-level volume, frequency, and streak metrics for charts and analytics.
 */

import type { MuscleGroup } from '../types/enums.ts';

export interface WeeklyVolumeTrend {
  week: string; // e.g. '2026-W37'
  volumeKg: number;
  workoutsCount: number;
}

export interface WorkoutStats {
  totalWorkouts: number;
  totalVolumeKg: number;
  totalDurationMinutes: number;
  currentStreakWeeks: number;
  bestStreakWeeks: number;
  muscleGroupDistribution: Record<MuscleGroup, number>;
  weeklyVolumeTrends: WeeklyVolumeTrend[];
  totalPersonalRecords: number;
}
