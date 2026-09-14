/**
 * FitNova AI — Personal Record Domain Model
 * Tracks maximum achievements per exercise (1RM, max weight, reps, volume).
 */

import type { PRMetric } from '../types/enums.ts';

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  metric: PRMetric;
  value: number; // e.g., kg or reps
  previousValue?: number;
  achievedAt: number;
  workoutSessionId?: string;
  workoutName?: string;
}
