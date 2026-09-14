/**
 * FitNova AI — Workout Recommendation Engine
 * Generates personalized routine recommendations balancing split rotation, goals, and recovery.
 * Zero UI/React code.
 */

import type { WorkoutRecommendationParams } from './types.ts';
import type { WorkoutRecommendation } from '../models/Recommendation.ts';
import { RecoveryDecisionEngine } from './RecoveryDecisionEngine.ts';

export class WorkoutRecommendationEngine {
  private readonly recoveryEngine: RecoveryDecisionEngine;

  constructor(recoveryEngine?: RecoveryDecisionEngine) {
    this.recoveryEngine = recoveryEngine ?? new RecoveryDecisionEngine();
  }

  recommendWorkouts(params: WorkoutRecommendationParams): WorkoutRecommendation[] {
    const {
      userGoal,
      availableWorkouts,
      pastSessions,
      readiness,
      preferredDurationMinutes = 60,
    } = params;

    if (availableWorkouts.length === 0) return [];

    const recoveryDecision = readiness
      ? this.recoveryEngine.evaluateRecovery(readiness)
      : undefined;

    // Inspect last completed workout
    const lastCompleted = pastSessions
      .filter((s) => s.status === 'completed')
      .sort((a, b) => (b.endedAt || b.startedAt) - (a.endedAt || a.startedAt))[0];

    const lastWorkoutName = lastCompleted?.workoutName.toLowerCase() || '';

    const recommendations: WorkoutRecommendation[] = availableWorkouts.map((workout) => {
      let score = 0.7; // Base score
      let goalAlignment = 0.8;
      let durationAlignment = 0.8;
      let recoveryAlignment = 0.85;
      let readinessAlignment = 0.85;

      const wName = workout.name.toLowerCase();
      const wGoal = workout.goal.toLowerCase();

      // 1. Goal alignment
      if (wGoal === userGoal.toLowerCase()) {
        score += 0.15;
        goalAlignment = 0.95;
      }

      // 2. Split Rotation: Avoid training same muscle split back-to-back
      let splitReason = 'Balances your weekly training frequency.';
      if (lastWorkoutName.includes('push')) {
        if (wName.includes('pull')) {
          score += 0.2;
          splitReason = 'Optimal antagonist rotation following your recent Push protocol.';
        } else if (wName.includes('leg')) {
          score += 0.15;
          splitReason = 'Lower body training allows upper pushing musculature to recover.';
        } else if (wName.includes('push')) {
          score -= 0.25;
        }
      } else if (lastWorkoutName.includes('pull')) {
        if (wName.includes('leg') || wName.includes('push')) {
          score += 0.2;
          splitReason = 'Allows latissimus dorsi and bicep motor units to resynthesize glycogen.';
        } else if (wName.includes('pull')) {
          score -= 0.25;
        }
      } else if (lastWorkoutName.includes('leg')) {
        if (wName.includes('push') || wName.includes('upper')) {
          score += 0.2;
          splitReason = 'Upper body focus following heavy quadricep and posterior chain loading.';
        }
      }

      // 3. Duration alignment
      const durationDelta = Math.abs(workout.estimatedDurationMinutes - preferredDurationMinutes);
      if (durationDelta <= 15) {
        durationAlignment = 0.95;
        score += 0.05;
      } else {
        durationAlignment = 0.7;
      }

      // 4. Recovery condition
      if (recoveryDecision) {
        if (recoveryDecision.action === 'reduce_intensity' && workout.difficulty === 'Beginner') {
          score += 0.15;
          recoveryAlignment = 0.95;
        } else if (recoveryDecision.action === 'rest') {
          score = Math.min(score, 0.4);
          recoveryAlignment = 0.3;
        }
      }

      const finalScore = Math.min(0.99, Math.max(0.3, Math.round(score * 100) / 100));

      return {
        workoutId: workout.id,
        workoutName: workout.name,
        score: finalScore,
        reason: `${splitReason} Aligned with your ${workout.goal} priorities.`,
        readinessAlignment,
        durationAlignment,
        goalAlignment,
        recoveryAlignment,
      };
    });

    return recommendations.sort((a, b) => b.score - a.score);
  }
}
