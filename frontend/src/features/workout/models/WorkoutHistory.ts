/**
 * FitNova AI — Workout History Domain Model
 * Historical records of completed workouts for diaries, trends, and analytical evaluation.
 */

export interface ExerciseHistorySummary {
  exerciseId: string;
  exerciseName: string;
  setsCount: number;
  bestSet: {
    reps: number;
    weight: number;
  };
  volume: number;
}

export interface WorkoutHistoryEntry {
  id: string;
  sessionId: string;
  workoutId: string;
  workoutName: string;
  date: string; // YYYY-MM-DD
  completedAt: number;
  durationSeconds: number;
  totalVolume: number;
  totalSets: number;
  completedSets: number;
  exercisesCount: number;
  personalRecordsCount: number;
  exercises: ExerciseHistorySummary[];
  notes?: string;
  rating?: number;
}
