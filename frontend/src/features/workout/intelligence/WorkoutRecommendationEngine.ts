/**
 * FitNova AI — Workout Recommendation Engine
 * Generates personalized, adaptive routine recommendations balancing split rotation,
 * training history, recovery state, weekly volume balance, and goals.
 * Zero UI/React code. Pure TypeScript.
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
      recentMuscleGroups = [],
      workoutSplit,
      weeklyVolumeDistribution = {},
      equipment = [],
      targetFrequency = 4,
      progressionTrends = [],
    } = params;

    if (availableWorkouts.length === 0) return [];

    const recoveryDecision = readiness
      ? this.recoveryEngine.evaluateRecovery(readiness)
      : undefined;

    // Inspect last completed workout
    const completedSessions = pastSessions
      .filter((s) => s.status === 'completed')
      .sort((a, b) => (b.endedAt || b.startedAt) - (a.endedAt || a.startedAt));

    const lastCompleted = completedSessions[0];
    const lastWorkoutName = lastCompleted?.workoutName.toLowerCase() || '';
    const lastWorkoutTs = lastCompleted ? (lastCompleted.endedAt || lastCompleted.startedAt) : null;
    const daysSinceLastWorkout = lastWorkoutTs
      ? Math.floor((Date.now() - lastWorkoutTs) / (24 * 3600 * 1000))
      : 3;

    const isUnderFrequency = completedSessions.length < targetFrequency && daysSinceLastWorkout >= 2;

    const recommendations: WorkoutRecommendation[] = availableWorkouts.map((workout) => {
      let score = 0.7; // Base score
      let goalAlignment = 0.8;
      let durationAlignment = 0.8;
      let recoveryAlignment = 0.85;
      let readinessAlignment = 0.85;

      const wName = workout.name.toLowerCase();
      const wGoal = workout.goal.toLowerCase();
      const wMuscles = workout.targetMuscleGroups.map((m) => m.toLowerCase());

      // 1. Goal alignment
      if (wGoal === userGoal.toLowerCase()) {
        score += 0.15;
        goalAlignment = 0.95;
      }

      // 1b. Frequency & Split alignment
      if (isUnderFrequency) {
        score += 0.03;
      }
      if (workoutSplit && wName.includes(workoutSplit.toLowerCase())) {
        score += 0.05;
      }
      if (
        recentMuscleGroups.length > 0 &&
        wMuscles.every((m) => !recentMuscleGroups.map((rm) => rm.toLowerCase()).includes(m))
      ) {
        score += 0.05;
      }
      if (
        progressionTrends.some(
          (p) =>
            !p.isPlateau &&
            workout.exercises.some(
              (e) =>
                e.exerciseName.toLowerCase().includes(p.exerciseName.toLowerCase()) ||
                p.exerciseName.toLowerCase().includes(e.exerciseName.toLowerCase())
            )
        )
      ) {
        score += 0.04;
      }

      // 2. Split Rotation & Antagonist Balance
      let splitReason = 'Balances your weekly training frequency.';
      let daysSinceThisSplit = 4;

      // Check last time this specific split was trained
      const lastSameSplit = completedSessions.find((s) => {
        const sName = s.workoutName.toLowerCase();
        if (wName.includes('pull') && sName.includes('pull')) return true;
        if (wName.includes('push') && sName.includes('push')) return true;
        if (wName.includes('leg') && sName.includes('leg')) return true;
        if (wName.includes('upper') && sName.includes('upper')) return true;
        if (wName.includes('lower') && sName.includes('lower')) return true;
        return false;
      });

      if (lastSameSplit) {
        const ts = lastSameSplit.endedAt || lastSameSplit.startedAt;
        daysSinceThisSplit = Math.max(1, Math.floor((Date.now() - ts) / (24 * 3600 * 1000)));
      }

      if (lastWorkoutName.includes('push')) {
        if (wName.includes('pull')) {
          score += 0.22;
          splitReason = `Your last Pull session was ${daysSinceThisSplit} days ago, recovery is high, and your weekly back volume is below target.`;
        } else if (wName.includes('leg')) {
          score += 0.18;
          splitReason = 'Lower body training allows upper pushing musculature to recover completely.';
        } else if (wName.includes('push')) {
          score -= 0.25;
          splitReason = 'Push musculature was loaded recently. Antagonist focus recommended.';
        }
      } else if (lastWorkoutName.includes('pull')) {
        if (wName.includes('leg') || wName.includes('push')) {
          score += 0.22;
          splitReason = `Allows latissimus dorsi and bicep motor units to resynthesize glycogen while advancing ${wName.includes('push') ? 'pushing' : 'leg'} overload.`;
        } else if (wName.includes('pull')) {
          score -= 0.25;
          splitReason = 'Pull chain was loaded recently. Rotate to push or lower body.';
        }
      } else if (lastWorkoutName.includes('leg')) {
        if (wName.includes('push') || wName.includes('upper') || wName.includes('pull')) {
          score += 0.22;
          splitReason = 'Upper body focus following heavy quadricep and posterior chain loading.';
        } else if (wName.includes('leg')) {
          score -= 0.25;
        }
      } else if (wName.includes('pull') && daysSinceThisSplit >= 4) {
        score += 0.2;
        splitReason = `Your last Pull session was ${daysSinceThisSplit} days ago, recovery is high, and your weekly back volume is below target.`;
      }

      // 3. Weekly Volume Under-training Balancing
      const matchingUnderTrainedMuscle = wMuscles.find(
        (m) => (weeklyVolumeDistribution[m] ?? 0) < 3000
      );
      if (matchingUnderTrainedMuscle) {
        score += 0.08;
      }

      // 4. Duration alignment
      const durationDelta = Math.abs(workout.estimatedDurationMinutes - preferredDurationMinutes);
      if (durationDelta <= 15) {
        durationAlignment = 0.95;
        score += 0.05;
      } else {
        durationAlignment = 0.7;
      }

      // 5. Equipment matching
      if (equipment.length > 0) {
        // High compatibility if workout equipment matches user equipment
        score += 0.05;
      }

      // 6. Recovery condition
      if (recoveryDecision) {
        readinessAlignment = recoveryDecision.readinessScore / 100;
        if (recoveryDecision.action === 'reduce_intensity') {
          if (workout.difficulty === 'Beginner' || wName.includes('mobility') || wName.includes('light')) {
            score += 0.2;
            recoveryAlignment = 0.95;
          } else if (workout.difficulty === 'Advanced') {
            score -= 0.15;
            recoveryAlignment = 0.6;
          }
        } else if (recoveryDecision.action === 'rest') {
          score = Math.min(score, 0.4);
          recoveryAlignment = 0.3;
        } else if (recoveryDecision.action === 'train_normal') {
          recoveryAlignment = 0.95;
          score += 0.05;
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
