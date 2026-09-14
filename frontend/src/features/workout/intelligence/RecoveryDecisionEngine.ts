/**
 * FitNova AI — Recovery Decision Engine
 * Deterministic evaluation of central nervous system readiness and muscular recovery.
 * Zero UI/React code.
 */

import type { WorkoutReadiness, RecoveryDecision, RecoveryAction } from './types.ts';
import { READINESS_THRESHOLDS } from './constants.ts';

export class RecoveryDecisionEngine {
  evaluateRecovery(readiness: WorkoutReadiness): RecoveryDecision {
    const {
      sleepHours,
      sorenessScore,
      fatigueScore,
      consecutiveTrainingDays = 0,
    } = readiness;

    let action: RecoveryAction = 'train_normal';
    let intensityModifier = 1.0;
    let recommendedDurationMinutes = 60;
    let reason = '';
    const recoveryGuidance: string[] = [];
    let confidence = 0.95;

    // Condition 1: Severe Systemic Fatigue / High Soreness -> Complete Rest
    if (
      (fatigueScore >= READINESS_THRESHOLDS.HIGH_FATIGUE &&
        sorenessScore >= READINESS_THRESHOLDS.HIGH_SORENESS) ||
      sleepHours < 4.5
    ) {
      action = 'rest';
      intensityModifier = 0.0;
      recommendedDurationMinutes = 0;
      reason = `Severe muscular soreness (${sorenessScore}/10) and systemic fatigue (${fatigueScore}/10) combined with insufficient sleep (${sleepHours}h). Training today would elevate injury risk and impair muscle protein synthesis.`;
      recoveryGuidance.push(
        'Prioritize 8+ hours of sleep tonight.',
        'Focus on high-protein nutrition (2g/kg bodyweight).',
        'Light 15-minute walking and gentle hydration only.'
      );
      confidence = 0.98;
    }
    // Condition 2: High Consecutive Days or Low Sleep -> Active Recovery Workout
    else if (
      consecutiveTrainingDays >= READINESS_THRESHOLDS.MAX_CONSECUTIVE_DAYS ||
      sleepHours < READINESS_THRESHOLDS.LOW_SLEEP_HOURS
    ) {
      action = 'recovery_workout';
      intensityModifier = 0.55;
      recommendedDurationMinutes = 30;
      reason = `You have trained ${consecutiveTrainingDays} consecutive days with limited sleep (${sleepHours}h). Active recovery with light mobility will accelerate blood flow without taxing motor units.`;
      recoveryGuidance.push(
        'Replace heavy compound movements with dynamic mobility and foam rolling.',
        'Keep heart rate in Zone 1-2 (under 125 BPM).',
        'Take a warm shower or sauna to reduce tissue stiffness.'
      );
      confidence = 0.92;
    }
    // Condition 3: Moderate Fatigue or Soreness -> Reduce Intensity
    else if (
      fatigueScore >= 6 ||
      sorenessScore >= 6 ||
      sleepHours < READINESS_THRESHOLDS.OPTIMAL_SLEEP_HOURS
    ) {
      action = 'reduce_intensity';
      intensityModifier = 0.8;
      recommendedDurationMinutes = 45;
      reason = `Mild fatigue detected (fatigue: ${fatigueScore}/10, sleep: ${sleepHours}h). You can train effectively, but scale back working volume by 20% and avoid training to absolute failure.`;
      recoveryGuidance.push(
        'Cap working sets at RPE 7.5 to 8.0.',
        'Extend rest intervals between heavy sets by 30 seconds.',
        'Ensure post-workout electrolyte and carbohydrate replenishment.'
      );
      confidence = 0.9;
    }
    // Condition 4: Optimal Readiness -> Full Intensity
    else {
      action = 'train_normal';
      intensityModifier = 1.0;
      recommendedDurationMinutes = 60;
      reason = `Readiness is primed! Sleep was restorative (${sleepHours}h) and soreness is negligible (${sorenessScore}/10). You are fully cleared to pursue progressive overload.`;
      recoveryGuidance.push(
        'Execute planned working sets with aggressive focus.',
        'Hydrate adequately with 500ml water prior to training.',
        'Warm up progressively with specific ramp-up sets.'
      );
      confidence = 0.96;
    }

    return {
      action,
      intensityModifier,
      recommendedDurationMinutes,
      reason,
      recoveryGuidance,
      confidence,
    };
  }
}
