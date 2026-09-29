/**
 * FitNova AI — Progressive Overload Progression Engine
 * Pure TypeScript implementation of exercise progression, weight jumps, rep targets,
 * upper/lower body splits, compound/isolation adjustments, experience level behaviors,
 * RPE trend analysis, plateau detection, and deload rules.
 * Zero UI/React code.
 */

import type {
  ProgressionParams,
  ProgressionRecommendation,
  ProgressionAction,
  ProgressionType,
} from './types.ts';
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
      bodyRegion = 'upper',
      experienceLevel = 'intermediate',
      repRangeMin,
      repRangeMax,
      historicalRpeTrend = [],
      historicalWeights = [],
      historicalReps = [],
      consecutiveMissedRepsCount = 0,
      accumulatedFatigueScore = 0,
    } = params;

    // 1. Regional & Movement Increment Rules
    const isLower = bodyRegion === 'lower';
    const baseIncrement = isLower
      ? isCompound
        ? OVERLOAD_INCREMENTS.LOWER_COMPOUND_KG
        : OVERLOAD_INCREMENTS.LOWER_ISOLATION_KG
      : isCompound
      ? OVERLOAD_INCREMENTS.UPPER_COMPOUND_KG
      : OVERLOAD_INCREMENTS.UPPER_ISOLATION_KG;

    // Scale increment by experience level (Advanced trainees make smaller micro-adjustments)
    const experienceScale =
      experienceLevel === 'beginner' ? 1.0 : experienceLevel === 'intermediate' ? 1.0 : 0.6;
    const adjustedIncrement =
      experienceScale === 1.0 ? baseIncrement : Math.round(baseIncrement * experienceScale * 100) / 100;

    const validSets = completedSets.filter((s) => s.completed && !s.skipped);

    // Baseline fallback if no sets completed in current session
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
        recommendation: `Maintain ${previousWeightKg}kg × ${targetReps} reps to establish active working baseline.`,
        currentWeight: previousWeightKg,
        recommendedWeight: previousWeightKg,
        currentReps: previousReps,
        targetRPE: 8.0,
        progressionType: 'hold',
      };
    }

    const allHitTarget = validSets.every(
      (s) => (s.actualReps ?? s.targetReps) >= targetReps
    );
    const avgReps =
      validSets.reduce((sum, s) => sum + (s.actualReps ?? s.targetReps), 0) / validSets.length;
    const effectiveRpe = lastRpe ?? (validSets[validSets.length - 1]?.rpe ?? 8.0);

    // 2. RPE Trend Analysis
    // If consecutive historical sessions show rising RPE with same load, fatigue is accumulating
    const isRisingRpe =
      historicalRpeTrend.length >= 2 &&
      historicalRpeTrend[historicalRpeTrend.length - 1] > historicalRpeTrend[historicalRpeTrend.length - 2] &&
      effectiveRpe >= RPE_THRESHOLDS.LIMITING;

    // 3. Plateau Detection
    // 3+ sessions with identical weight and stagnant reps despite high RPE
    const isWeightStagnant =
      historicalWeights.length >= 3 &&
      historicalWeights.slice(-3).every((w) => w === previousWeightKg);
    const isRepsStagnant =
      historicalReps.length >= 3 &&
      historicalReps.slice(-3).every((r) => r <= previousReps);
    const isPlateau =
      isWeightStagnant && isRepsStagnant && effectiveRpe >= RPE_THRESHOLDS.TARGET_MAX;

    // 4. Deload Detection
    const isDeload =
      accumulatedFatigueScore >= 8 ||
      (effectiveRpe >= RPE_THRESHOLDS.EXHAUSTION && consecutiveMissedRepsCount >= 3);

    let action: ProgressionAction = 'maintain';
    let progressionType: ProgressionType = 'hold';
    let weightDelta = 0;
    let repsDelta = 0;
    let reason = '';
    let confidence = 0.9;
    let targetRpeVal = 8.0;

    // Priority 0: Safety Guardrails (Sprint 3.9)
    if (params.formWarningActive) {
      action = 'maintain';
      progressionType = 'hold';
      weightDelta = 0;
      targetRpeVal = 8.0;
      reason = 'Live form degradation detected. Progression is halted to prevent injury.';
      confidence = 1.0;
    }
    // Priority 1: Systemic Fatigue / Deload Triggered
    else if (isDeload) {
      action = 'deload';
      progressionType = 'deload';
      weightDelta = -Math.round(previousWeightKg * 0.4);
      targetRpeVal = 6.0;
      reason = `Accumulated CNS and muscular fatigue detected (Fatigue score: ${accumulatedFatigueScore}/10, RPE ${effectiveRpe}). Implement a deload week at 60% load to resensitize motor unit recruitment.`;
      confidence = 0.96;
    }
    // Priority 2: Prolonged Plateau -> Suggest Movement Variation / Substitution
    else if (isPlateau && (params.repeatedPerformanceSessions ?? 0) >= 4) {
      action = 'change_exercise';
      progressionType = 'exercise_swap';
      targetRpeVal = 8.0;
      reason = `Repeated stagnation across ${params.repeatedPerformanceSessions} sessions at ${previousWeightKg}kg with elevated RPE ${effectiveRpe}. Nova recommends substituting this movement to introduce a fresh stimulus.`;
      confidence = 0.94;
    }
    // Priority 3: Standard Plateau Triggered
    else if (isPlateau) {
      action = 'maintain';
      progressionType = 'wave_progression';
      repsDelta = 0;
      targetRpeVal = 8.0;
      reason = `Stagnation detected across 3 sessions at ${previousWeightKg}kg with elevated exertion (RPE ${effectiveRpe}). Switch rep targets or substitute movement to break through plateau.`;
      confidence = 0.92;
    }
    // Priority 4: Severe Missed Reps (Failed sets)
    else if (
      (effectiveRpe >= RPE_THRESHOLDS.EXHAUSTION && avgReps < targetReps - 2) ||
      consecutiveMissedRepsCount >= 2
    ) {
      action = 'weight_decrease';
      progressionType = 'scale_back';
      weightDelta = -adjustedIncrement;
      targetRpeVal = 7.5;
      reason = `Significant muscular fatigue detected (RPE ${effectiveRpe}, missed target by >2 reps). Reduce load by ${Math.abs(weightDelta)} kg to restore clean biomechanics.`;
      confidence = 0.88;
    }
    // Priority 5: Rep-Range / Double Progression (Intermediate mode)
    else if (repRangeMax !== undefined && repRangeMin !== undefined) {
      const allHitMaxReps = validSets.every(
        (s) => (s.actualReps ?? s.targetReps) >= repRangeMax
      );
      if (allHitMaxReps && effectiveRpe <= RPE_THRESHOLDS.TARGET_MAX) {
        action = 'weight_increase';
        progressionType = 'double_progression';
        weightDelta = adjustedIncrement;
        repsDelta = repRangeMin - previousReps; // Reset reps to bottom of bracket
        targetRpeVal = 8.0;
        reason = `Completed all sets at the ceiling of your rep range (${repRangeMax} reps). Overload by adding +${weightDelta} kg and working from ${repRangeMin} reps.`;
        confidence = 0.94;
      } else {
        action = 'rep_increase';
        progressionType = 'double_progression';
        repsDelta = 1;
        targetRpeVal = 8.5;
        reason = `Within target rep bracket (${repRangeMin}-${repRangeMax} reps). Keep load at ${previousWeightKg}kg and advance +1 rep.`;
        confidence = 0.9;
      }
    }
    // Priority 6: Classic Clean Target Hit with Comfortable RPE (Linear progression)
    else if (allHitTarget && effectiveRpe <= RPE_THRESHOLDS.TARGET_MAX && !isRisingRpe) {
      if (effectiveRpe <= RPE_THRESHOLDS.EASY) {
        // High reserve -> larger jump
        weightDelta = adjustedIncrement * 1.5;
        action = 'weight_increase';
        progressionType = 'weight_jump';
        targetRpeVal = 8.0;
        reason = `Sets moved effortlessly with low exertion (RPE ${effectiveRpe}). Ready for a +${weightDelta} kg overload jump.`;
        confidence = 0.95;
      } else {
        weightDelta = adjustedIncrement;
        action = 'weight_increase';
        progressionType = 'weight_jump';
        targetRpeVal = 8.5;
        const regionLabel = isLower ? 'lower body' : 'upper body';

        if (effectiveRpe <= RPE_THRESHOLDS.TARGET_MIN) {
          reason = `Previous target was completed below the RPE threshold, so Nova recommends a ${weightDelta}kg increase.`;
        } else {
          reason = `All ${validSets.length} sets completed cleanly at target ${targetReps} reps. Progressive overload dictates adding +${weightDelta} kg for this ${regionLabel} ${isCompound ? 'compound' : 'isolation'} movement.`;
        }
        confidence = 0.92;
      }
    }
    // Priority 7: Capacity Building (Near target, increment reps)
    else if (avgReps >= targetReps - 1 && effectiveRpe <= RPE_THRESHOLDS.LIMITING) {
      action = 'rep_increase';
      progressionType = 'rep_advance';
      repsDelta = 1;
      targetRpeVal = 8.5;
      reason = `Strength is solid at ${previousWeightKg} kg (averaged ${Math.round(avgReps)} reps). Keep weight steady and secure +1 rep on later sets.`;
      confidence = 0.88;
    }
    // Priority 8: Consolidation
    else {
      action = 'maintain';
      progressionType = 'hold';
      targetRpeVal = 8.0;
      reason = `Solid effort logged. Consolidate your neuromuscular control with ${previousWeightKg} kg before progressing.`;
      confidence = 0.9;
    }

    // ====================================================================
    // PHYSIOLOGICAL PROGRESSION SAFEGUARDS (Sprint 3.6)
    // Prevent unrealistic weight jumps that exceed safe physiological limits.
    // Max single-step delta: capped at 5% of previous weight or category max.
    // ====================================================================
    if (weightDelta > 0) {
      const categoryMaxDelta = isLower
        ? isCompound
          ? OVERLOAD_INCREMENTS.LOWER_COMPOUND_KG   // 5.0 kg
          : OVERLOAD_INCREMENTS.LOWER_ISOLATION_KG   // 2.5 kg
        : isCompound
        ? OVERLOAD_INCREMENTS.UPPER_COMPOUND_KG      // 2.5 kg
        : OVERLOAD_INCREMENTS.UPPER_ISOLATION_KG;    // 1.25 kg

      const maxPercentageDelta = previousWeightKg * 0.05; // 5% of previous weight
      let maxAllowedDelta = Math.max(categoryMaxDelta, maxPercentageDelta);

      // Sprint 3.9: Adaptive limits
      if (params.maxWeightIncreaseKg !== undefined) {
        maxAllowedDelta = Math.min(maxAllowedDelta, params.maxWeightIncreaseKg);
      }

      if (weightDelta > maxAllowedDelta) {
        const clampedDelta = Math.round(maxAllowedDelta * 100) / 100;
        reason += ` [Safeguard: clamped from +${weightDelta}kg to +${clampedDelta}kg — max safe increment]`;
        weightDelta = clampedDelta;
      }
      
      // Sprint 3.9: Stale Data Confidence Restrictions
      if (params.adaptiveConfidence !== undefined && params.adaptiveConfidence < 0.4 && weightDelta > 0) {
        weightDelta = 0;
        action = 'maintain';
        reason += ' [Safeguard: progression blocked due to stale or unavailable health data]';
      }
    }

    const recommendedWeight = Math.max(0, Math.round((previousWeightKg + weightDelta) * 10) / 10);
    const recommendedReps = Math.max(1, previousReps + repsDelta);

    const recommendation =
      action === 'weight_increase'
        ? `Increase weight by +${weightDelta}kg to ${recommendedWeight}kg`
        : action === 'rep_increase'
        ? `Increase repetitions to ${recommendedReps} reps at ${recommendedWeight}kg`
        : action === 'change_exercise'
        ? `Substitute ${exerciseName} with an alternative movement to breakthrough stagnation`
        : action === 'deload'
        ? `Deload to ${recommendedWeight}kg (-${Math.abs(weightDelta)}kg) for active recovery`
        : action === 'weight_decrease'
        ? `Scale back weight to ${recommendedWeight}kg (-${Math.abs(weightDelta)}kg) to restore form`
        : `Maintain ${recommendedWeight}kg × ${recommendedReps} reps`;

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
      recommendation,
      currentWeight: previousWeightKg,
      recommendedWeight,
      currentReps: previousReps,
      targetRPE: targetRpeVal,
      progressionType,
      isPlateauDetected: isPlateau,
      isDeloadRecommended: isDeload,
    };
  }
}
