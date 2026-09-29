import type { WorkoutSet } from '../models/WorkoutSet.ts';
import type { AdaptivePreferences } from './types/adaptivePreferences.ts';
import type { DataFreshnessState } from '../health/healthTypes.ts';

export type AdaptiveDecisionType =
  | 'INCREASE_LOAD'
  | 'DECREASE_LOAD'
  | 'INCREASE_REPS'
  | 'DECREASE_REPS'
  | 'MAINTAIN'
  | 'SUBSTITUTE_EXERCISE';

export interface AdaptiveSafetyContext {
  maxWeightIncreaseKg: number;
  maxRepIncrease: number;
  adaptiveConfidence: number;
  freshness: DataFreshnessState;
}

export interface FormWarningState {
  hasActiveWarning: boolean;
  warnings: string[];
}

export interface ClampedPlan {
  weight: number;
  reps: number;
}

export interface SafetyValidationResult {
  isSafe: boolean;
  reasons: string[];
  clampedPlan?: ClampedPlan;
}

export class AdaptiveSafetyGuard {
  
  static validateProgression(
    decisionType: AdaptiveDecisionType,
    originalSet: WorkoutSet,
    proposedWeight: number,
    proposedReps: number,
    context: AdaptiveSafetyContext,
    preferences: AdaptivePreferences,
    formWarnings: FormWarningState | null
  ): SafetyValidationResult {
    const reasons: string[] = [];
    let isSafe = true;
    let clampedWeight = proposedWeight;
    let clampedReps = proposedReps;

    // 1. Preference Checks
    if (!preferences.adaptiveTrainingEnabled) {
      return { isSafe: false, reasons: ['Adaptive training is disabled in preferences.'] };
    }

    if (decisionType === 'INCREASE_LOAD' && !preferences.progressiveOverloadRecommendationsEnabled) {
       return { isSafe: false, reasons: ['Progressive overload recommendations are disabled.'] };
    }

    if (decisionType === 'DECREASE_LOAD' && !preferences.automaticIntensityReductionAllowed) {
       return { isSafe: false, reasons: ['Automatic intensity reduction is disabled.'] };
    }
    
    // 2. Confidence & Freshness Checks
    if (context.adaptiveConfidence < 0.4 || context.freshness === 'stale') {
        isSafe = false;
        reasons.push('Confidence is too low or data is stale to apply progression.');
    }

    // 3. Form Restrictions
    if (formWarnings?.hasActiveWarning) {
        isSafe = false;
        reasons.push('Live form warnings detected. Progression halted.');
    }

    // 4. Maximum Weight Jumps (Hard physiological constraints)
    const origWeight = originalSet.actualWeight ?? originalSet.targetWeight;
    const weightIncrease = proposedWeight - origWeight;
    if (weightIncrease > context.maxWeightIncreaseKg) {
        clampedWeight = origWeight + context.maxWeightIncreaseKg;
        reasons.push(`Proposed weight increase clamped to max safety limit (${context.maxWeightIncreaseKg}kg).`);
    }

    // 5. Volume/Rep Jumps
    const origReps = originalSet.actualReps ?? originalSet.targetReps;
    const repIncrease = proposedReps - origReps;
    if (repIncrease > context.maxRepIncrease) {
        clampedReps = origReps + context.maxRepIncrease;
        reasons.push(`Proposed rep increase clamped to max safety limit (${context.maxRepIncrease} reps).`);
    }

    return {
      isSafe,
      reasons,
      clampedPlan: {
        weight: clampedWeight,
        reps: clampedReps
      }
    };
  }
}
