/**
 * FitNova AI — Volume Progression Analytics
 * Aggregates weekly volume trends and muscle group tonnage distributions.
 * Pure TypeScript.
 */

import type { WorkoutHistoryEntry } from '../models/WorkoutHistory.ts';
import type { WeeklyVolumeTrend } from '../models/WorkoutStats.ts';

/**
 * Groups workout history by ISO week (e.g. 2026-W37) and calculates total tonnage.
 */
export function calculateWeeklyVolumeProgression(
  history: WorkoutHistoryEntry[]
): WeeklyVolumeTrend[] {
  const weekMap = new Map<string, { volumeKg: number; workoutsCount: number }>();

  // Sort chronological
  const sorted = [...history].sort((a, b) => a.completedAt - b.completedAt);

  for (const entry of sorted) {
    const d = new Date(entry.completedAt);
    const year = d.getUTCFullYear();
    // Compute simple week number
    const firstDayOfYear = new Date(Date.UTC(year, 0, 1));
    const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getUTCDay() + 1) / 7);
    const weekKey = `${year}-W${String(weekNum).padStart(2, '0')}`;

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { volumeKg: 0, workoutsCount: 0 });
    }

    const current = weekMap.get(weekKey)!;
    current.volumeKg += entry.totalVolume;
    current.workoutsCount += 1;
  }

  return Array.from(weekMap.entries()).map(([week, data]) => ({
    week,
    volumeKg: Math.round(data.volumeKg),
    workoutsCount: data.workoutsCount,
  }));
}

/**
 * Calculates volume tonnage breakdown per exercise.
 */
export function calculateVolumeByExercise(
  history: WorkoutHistoryEntry[]
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const entry of history) {
    for (const ex of entry.exercises) {
      result[ex.exerciseName] = (result[ex.exerciseName] || 0) + Math.round(ex.volume);
    }
  }

  return result;
}
