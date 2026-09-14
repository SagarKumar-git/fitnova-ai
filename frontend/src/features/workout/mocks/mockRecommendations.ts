/**
 * FitNova AI — Mock Workout Recommendations Dataset
 * Deterministic AI recommendations matching the WorkoutRecommendation contract.
 */

import type { WorkoutRecommendation } from '../models/Recommendation.ts';

export const MOCK_RECOMMENDATIONS: WorkoutRecommendation[] = [
  {
    workoutId: 'workout_push_strength',
    workoutName: 'Push Strength Routine',
    score: 0.94,
    reason: 'High nervous system readiness and fresh chest/deltoid recovery score (92%).',
    readinessAlignment: 0.95,
    durationAlignment: 0.92,
    goalAlignment: 0.96,
    recoveryAlignment: 0.93,
  },
  {
    workoutId: 'workout_pull_hypertrophy',
    workoutName: 'Pull Hypertrophy Session',
    score: 0.88,
    reason: 'Optimal timing for back frequency based on 48h posterior chain recovery.',
    readinessAlignment: 0.89,
    durationAlignment: 0.86,
    goalAlignment: 0.91,
    recoveryAlignment: 0.88,
  },
  {
    workoutId: 'workout_lower_power',
    workoutName: 'Lower Body Power Routine',
    score: 0.82,
    reason: 'Quad recovery index is high; progressive overload target set for squats.',
    readinessAlignment: 0.84,
    durationAlignment: 0.80,
    goalAlignment: 0.85,
    recoveryAlignment: 0.81,
  },
];
