/**
 * FitNova AI — Workout Exercise Domain Model
 * Associates an exercise with ordered sets, target rest, and notes within a routine.
 */

import type { WorkoutSet } from './WorkoutSet.ts';

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  order: number;
  targetSets: number;
  targetReps: number;
  targetWeight?: number;
  restSeconds: number;
  notes?: string;
  sets: WorkoutSet[];
}
