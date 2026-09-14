/**
 * FitNova AI — Workout Intelligence Layer Contracts
 * Strongly typed models for progressive overload, recovery evaluation, and exercise substitutions.
 */

import type { Exercise } from '../models/Exercise.ts';
import type { Workout } from '../models/Workout.ts';
import type { WorkoutSet } from '../models/WorkoutSet.ts';
import type { WorkoutSession } from '../models/WorkoutSession.ts';
import type { Equipment } from '../types/enums.ts';

// ==========================================
// PROGRESSIVE OVERLOAD
// ==========================================

export type ProgressionAction =
  | 'weight_increase'
  | 'rep_increase'
  | 'maintain'
  | 'weight_decrease'
  | 'deload';

export interface ProgressionParams {
  exerciseId: string;
  exerciseName: string;
  previousWeightKg: number;
  previousReps: number;
  targetReps: number;
  completedSets: WorkoutSet[];
  lastRpe?: number;
  isCompound?: boolean;
}

export interface ProgressionRecommendation {
  exerciseId: string;
  exerciseName: string;
  action: ProgressionAction;
  recommendedWeightKg: number;
  recommendedReps: number;
  weightDeltaKg: number;
  repsDelta: number;
  reason: string;
  confidence: number; // 0.0 to 1.0
}

// ==========================================
// RECOVERY DECISION
// ==========================================

export type RecoveryAction =
  | 'train_normal'
  | 'reduce_intensity'
  | 'recovery_workout'
  | 'rest';

export interface WorkoutReadiness {
  sleepHours: number; // e.g. 7.5
  sorenessScore: number; // 1 (none) to 10 (extreme)
  fatigueScore: number; // 1 (fresh) to 10 (exhausted)
  stressScore?: number; // 1 to 10
  restingHeartRate?: number;
  lastWorkoutDate?: string;
  consecutiveTrainingDays?: number;
}

export interface RecoveryDecision {
  action: RecoveryAction;
  intensityModifier: number; // 0.0 (rest) to 1.0 (full intensity), e.g. 0.8
  recommendedDurationMinutes?: number;
  reason: string;
  recoveryGuidance: string[];
  confidence: number;
}

// ==========================================
// EXERCISE SUBSTITUTION
// ==========================================

export interface SubstitutionConstraints {
  availableEquipment?: Equipment[];
  excludeInjuredMuscles?: string[];
  maxDifficulty?: string;
}

export interface ExerciseSubstitution {
  originalExerciseId: string;
  originalExerciseName: string;
  substituteExercise: Exercise;
  matchScore: number; // 0.0 to 1.0
  sharedMuscles: string[];
  reason: string;
}

// ==========================================
// WORKOUT RECOMMENDATION
// ==========================================

export interface WorkoutRecommendationParams {
  userGoal: string;
  availableWorkouts: Workout[];
  pastSessions: WorkoutSession[];
  readiness?: WorkoutReadiness;
  preferredDurationMinutes?: number;
}
