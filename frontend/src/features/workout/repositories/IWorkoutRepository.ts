/**
 * FitNova AI — Workout Repository Interface
 * Clean architectural abstraction for workout data access.
 * Ready for future seamless swap to FastAPI backend client.
 */

import type {
  Workout,
  Exercise,
  WorkoutSession,
  WorkoutHistoryEntry,
  PersonalRecord,
  WorkoutStats,
  WorkoutRecommendation,
} from '../models/index.ts';
import type {
  ExerciseFilter,
  WorkoutFilter,
  WorkoutHistoryQuery,
} from '../types/contracts.ts';

export interface IWorkoutRepository {
  getWorkouts(filter?: WorkoutFilter): Promise<Workout[]>;
  getWorkoutById(id: string): Promise<Workout | null>;
  getExercises(filter?: ExerciseFilter): Promise<Exercise[]>;
  getExerciseById(id: string): Promise<Exercise | null>;
  getWorkoutHistory(query?: WorkoutHistoryQuery): Promise<WorkoutHistoryEntry[]>;
  getPersonalRecords(exerciseId?: string): Promise<PersonalRecord[]>;
  getWorkoutStats(): Promise<WorkoutStats>;
  getRecommendations(): Promise<WorkoutRecommendation[]>;

  // Session persistence
  saveWorkoutSession(session: WorkoutSession): Promise<void>;
  getWorkoutSession(sessionId: string): Promise<WorkoutSession | null>;
  updateWorkoutSession(session: WorkoutSession): Promise<void>;

  // Active session lifecycle
  getActiveSession(): Promise<WorkoutSession | null>;
  saveActiveSession(session: WorkoutSession): Promise<void>;
  clearActiveSession(): Promise<void>;
}
