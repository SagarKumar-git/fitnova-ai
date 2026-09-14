/**
 * FitNova AI — Live Workout Session Domain Model
 * Tracks real-time active session execution, state, volumes, and progress.
 */

import type { SessionStatus } from '../types/enums.ts';
import type { WorkoutExercise } from './WorkoutExercise.ts';
import type { PersonalRecord } from './PersonalRecord.ts';

export interface WorkoutSession {
  id: string;
  workoutId: string;
  workoutName: string;
  status: SessionStatus;
  startedAt: number;
  endedAt?: number;
  currentExerciseIndex: number;
  currentSetIndex: number;
  exercises: WorkoutExercise[];
  totalVolume: number; // in kg
  durationSeconds: number;
  pausedDurationMs: number;
  lastPausedAt?: number;
  personalRecords: PersonalRecord[];
  notes?: string;
  rating?: number; // 1-5 user rating
}
