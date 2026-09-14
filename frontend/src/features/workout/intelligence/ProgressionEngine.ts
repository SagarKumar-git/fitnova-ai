/**
 * FitNova AI — Progressive Overload Progression Engine
 * Pure TypeScript implementation of exercise progression, weight jumps, and rep targets.
 * Zero UI/React code.
 */

import type { ProgressionParams, ProgressionRecommendation, ProgressionAction } from './types.ts';
import { OVERLOAD_INCREMENTS, RPE_THRESHOLDS } from './constants.ts';

export class ProgressionEngine {
  calculateProgression(params: ProgressionParams): ProgressionRecommendation {
    const {
      exerciseId,
      exerciseName,
      previousWeightKg,
      previousReps,
      targetReps,
      completedSets,
      lastRpe,
      isCompound = true,
    } = params;

    const baseIncrement = isCompound
      ? OVERLOAD_INCREMENTS.UPPER_COMPOUND_KG
      : OVERLOAD_INCREMENTS.UPPER_ISOLATION_KG;

    const validSets = completedSets.filter((s) => s.completed && !s.skipped);

    // If no sets completed yet, recommend previous working weight and target reps
    if (validSets.length === 0) {
      return {
        exerciseId,
        exerciseName,
        action: 'maintain',
        recommendedWeightKg: previousWeightKg,
        recommendedReps: targetReps,
        weightDeltaKg: 0,
        repsDelta: 0,
        reason: 'Baseline established from previous training session.',
        confidence: 0.85,
      };
    }

    const allHitTarget = validSets.every(
      (s) => (s.actualReps ?? s.targetReps) >= targetReps
    );
    const avgReps =
      validSets.reduce((sum, s) => sum + (s.actualReps ?? s.targetReps), 0) / validSets.length;
    const effectiveRpe = lastRpe ?? (validSets[validSets.length - 1]?.rpe ?? 8.0);

    let action: ProgressionAction = 'maintain';
    let weightDelta = 0;
    let repsDelta = 0;
    let reason = '';
    let confidence = 0.9;

    // Case 1: All sets exceeded or hit target reps with comfortable RPE (Classic 2-for-2 rule)
    if (allHitTarget && effectiveRpe <= RPE_THRESHOLDS.TARGET_MAX) {
      if (effectiveRpe <= RPE_THRESHOLDS.EASY) {
        // High reserve -> larger jump
        weightDelta = baseIncrement * 1.5;
        action = 'weight_increase';
        reason = `Sets moved effortlessly with low exertion (RPE ${effectiveRpe}). Ready for a +${weightDelta} kg overload jump.`;
        confidence = 0.95;
      } else {
        weightDelta = baseIncrement;
        action = 'weight_increase';
        reason = `All ${validSets.length} sets completed cleanly at target ${targetReps} reps. Progressive overload dictates adding +${weightDelta} kg.`;
        confidence = 0.92;
      }
    }
    // Case 2: Hit target on first set, but dropped off on later sets (Accumulating capacity)
    else if (avgReps >= targetReps - 1 && effectiveRpe <= RPE_THRESHOLDS.LIMITING) {
      action = 'rep_increase';
      repsDelta = 1;
      reason = `Strength is solid at ${previousWeightKg} kg (averaged ${Math.round(avgReps)} reps). Keep weight steady and secure +1 rep on later sets.`;
      confidence = 0.88;
    }
    // Case 3: Extreme fatigue or failure hit (RPE >= 9.5 and missed reps)
    else if (effectiveRpe >= RPE_THRESHOLDS.EXHAUSTION && avgReps < targetReps - 2) {
      weightDelta = -baseIncrement;
      action = 'weight_decrease';
      reason = `Significant muscular fatigue detected (RPE ${effectiveRpe}, missed target by >2 reps). Reduce load by ${Math.abs(weightDelta)} kg to restore clean biomechanics.`;
      confidence = 0.85;
    }
    // Case 4: Near target, maintain working weight
    else {
      action = 'maintain';
      reason = `Solid effort logged. Consolidate your neuromuscular control with ${previousWeightKg} kg before progressing.`;
      confidence = 0.9;
    }

    const recommendedWeight = Math.max(0, Math.round((previousWeightKg + weightDelta) * 10) / 10);
    const recommendedReps = Math.max(1, previousReps + repsDelta);

    return {
      exerciseId,
      exerciseName,
      action,
      recommendedWeightKg: recommendedWeight,
      recommendedReps,
      weightDeltaKg: weightDelta,
      repsDelta,
      reason,
      confidence,
    };
  }
}
