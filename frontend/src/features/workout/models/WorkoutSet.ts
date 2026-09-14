/**
 * FitNova AI — Workout Set Domain Model
 * Strongly typed representation of an individual exercise set.
 */

import type { SetType } from '../types/enums.ts';

export interface WorkoutSet {
  id: string;
  setNumber: number;
  type: SetType;
  targetReps: number;
  targetWeight: number; // in kg
  actualReps?: number;
  actualWeight?: number; // in kg
  rpe?: number; // Rate of Perceived Exertion (1-10)
  completed: boolean;
  completedAt?: number;
  skipped?: boolean;
}
