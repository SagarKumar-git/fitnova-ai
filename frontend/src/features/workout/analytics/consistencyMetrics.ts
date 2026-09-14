/**
 * FitNova AI — Workout Consistency Analytics
 * Computes workout frequency, streaks, and target weekly adherence rates.
 * Pure TypeScript.
 */

import type { WorkoutHistoryEntry } from '../models/WorkoutHistory.ts';

export interface ConsistencyReport {
  totalWorkouts: number;
  workoutsPast30Days: number;
  weeklyAverage: number;
  adherencePercentage: number;
  currentStreakWeeks: number;
}

export function calculateConsistencyMetrics(
  history: WorkoutHistoryEntry[],
  targetDaysPerWeek: number = 4
): ConsistencyReport {
  const totalWorkouts = history.length;
  if (totalWorkouts === 0) {
    return {
      totalWorkouts: 0,
      workoutsPast30Days: 0,
      weeklyAverage: 0,
      adherencePercentage: 0,
      currentStreakWeeks: 0,
    };
  }

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 86400000;
  const workoutsPast30Days = history.filter((h) => h.completedAt >= thirtyDaysAgo).length;

  const weeklyAverage = Math.round((workoutsPast30Days / 4.28) * 10) / 10;
  const adherencePercentage = Math.min(
    100,
    Math.round((weeklyAverage / targetDaysPerWeek) * 100)
  );

  // Group unique dates into weeks
  const weekSet = new Set<string>();
  for (const entry of history) {
    const d = new Date(entry.completedAt);
    const year = d.getUTCFullYear();
    const firstDayOfYear = new Date(Date.UTC(year, 0, 1));
    const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getUTCDay() + 1) / 7);
    weekSet.add(`${year}-W${weekNum}`);
  }

  const currentStreakWeeks = Math.min(weekSet.size, 6);

  return {
    totalWorkouts,
    workoutsPast30Days,
    weeklyAverage,
    adherencePercentage,
    currentStreakWeeks,
  };
}
