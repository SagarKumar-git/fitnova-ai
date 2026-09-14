/**
 * FitNova AI — Workout Recommendation Contract
 * Deterministic, strongly typed structure for future AI workout recommendations.
 */

export interface WorkoutRecommendation {
  workoutId: string;
  workoutName: string;
  score: number; // 0.0 to 1.0 match score
  reason: string;
  readinessAlignment: number; // 0.0 to 1.0
  durationAlignment: number; // 0.0 to 1.0
  goalAlignment: number; // 0.0 to 1.0
  recoveryAlignment: number; // 0.0 to 1.0
}
