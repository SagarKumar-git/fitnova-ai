/**
 * FitNova AI — Workout OS Data Contracts & Filter Interfaces
 */

import type {
  MuscleGroup,
  Equipment,
  WorkoutDifficulty,
  WorkoutGoal,
  SetType,
} from './enums.ts';

export interface ExerciseFilter {
  query?: string;
  muscleGroup?: MuscleGroup;
  equipment?: Equipment;
  difficulty?: WorkoutDifficulty;
}

export interface WorkoutFilter {
  query?: string;
  goal?: WorkoutGoal;
  difficulty?: WorkoutDifficulty;
  muscleGroup?: MuscleGroup;
  maxDurationMinutes?: number;
  tags?: string[];
}

export interface StartSessionParams {
  workoutId: string;
  templateId?: string;
  name?: string;
  notes?: string;
}

export interface LogSetParams {
  sessionId: string;
  exerciseId: string;
  setId: string;
  reps: number;
  weight: number;
  rpe?: number;
  type?: SetType;
}

export interface FinishSessionParams {
  sessionId: string;
  notes?: string;
  rating?: number; // 1-5 scale
}

export interface CancelSessionParams {
  sessionId: string;
  reason?: string;
}

export interface WorkoutHistoryQuery {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  workoutId?: string;
}
