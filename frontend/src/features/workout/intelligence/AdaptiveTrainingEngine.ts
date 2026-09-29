/**
 * FitNova AI — Sprint 3.8 Adaptive Training Engine
 * Deterministic, multi-signal decision engine that combines wearable recovery,
 * training load, performance history, and form quality into explainable,
 * user-confirmed workout recommendations.
 * Pure TypeScript. Zero UI/React code.
 */

import type {
  AdaptiveTrainingInput,
  AdaptiveTrainingDecision,
  AdaptiveAction,
  AdaptiveIntensity,
  AdaptiveDataSource,
} from './types/adaptiveTraining.ts';
import { ADAPTIVE_SAFETY_LIMITS } from './types/adaptiveTraining.ts';

// ==========================================
// SIGNAL WEIGHTS
// ==========================================

const SIGNAL_WEIGHTS = {
  recovery: 0.20,
  hrv: 0.12,
  rhr: 0.08,
  sleep: 0.10,
  soreness: 0.08,
  fatigue: 0.08,
  acwr: 0.10,
  rpe: 0.08,
  form: 0.08,
  consistency: 0.08,
} as const;

// ==========================================
// ENGINE
// ==========================================

export class AdaptiveTrainingEngine {
  /**
   * Evaluates all available training signals and produces a deterministic,
   * explainable adaptive training decision.
   */
  evaluateTrainingDecision(input: AdaptiveTrainingInput): AdaptiveTrainingDecision {
    const reasons: string[] = [];
    const dataSources: AdaptiveDataSource[] = [];
    const warnings: string[] = [];

    // Track individual signal scores (0–100 scale, 100 = optimal)
    const signals: Record<string, number> = {};
    let positiveSignalCount = 0;
    let negativeSignalCount = 0;

    // --- 1. Recovery Score ---
    signals.recovery = Math.max(0, Math.min(100, input.recoveryScore));
    dataSources.push('user_reported_recovery');
    if (input.recoveryScore < 50) {
      reasons.push(`Recovery score is low at ${input.recoveryScore}/100`);
      negativeSignalCount++;
    } else if (input.recoveryScore >= 80) {
      positiveSignalCount++;
    }

    // --- 2. HRV Status ---
    if (input.wearableAvailable && input.hrvStatus !== 'unknown') {
      dataSources.push('wearable');
      if (input.hrvStatus === 'suppressed') {
        signals.hrv = 30;
        reasons.push('Autonomic HRV suppression detected (reduced parasympathetic recovery)');
        negativeSignalCount++;
        if (input.hrvTrendPct !== undefined && input.hrvTrendPct < -10) {
          reasons.push(`HRV is ${Math.abs(input.hrvTrendPct)}% below your baseline`);
        }
      } else if (input.hrvStatus === 'elevated') {
        signals.hrv = 90;
        positiveSignalCount++;
      } else {
        signals.hrv = 70;
      }
    } else {
      signals.hrv = 60; // neutral when unknown
    }

    // --- 3. Resting Heart Rate Delta ---
    if (input.restingHeartRateDelta !== undefined && input.wearableAvailable) {
      if (input.restingHeartRateDelta >= 5) {
        signals.rhr = 25;
        reasons.push(`Resting heart rate elevated by +${input.restingHeartRateDelta} BPM vs baseline`);
        negativeSignalCount++;
      } else if (input.restingHeartRateDelta <= -2) {
        signals.rhr = 85;
        positiveSignalCount++;
      } else {
        signals.rhr = 65;
      }
    } else {
      signals.rhr = 60;
    }

    // --- 4. Sleep Quality ---
    if (input.sleepQuality === 'poor') {
      signals.sleep = 25;
      reasons.push(`Poor sleep quality${input.sleepHours ? ` (${input.sleepHours}h)` : ''}`);
      negativeSignalCount++;
      if (input.deepSleepPct !== undefined && input.deepSleepPct < 14) {
        reasons.push(`Limited deep slow-wave sleep (${input.deepSleepPct}%)`);
      }
    } else if (input.sleepQuality === 'moderate') {
      signals.sleep = 55;
    } else {
      signals.sleep = 90;
      positiveSignalCount++;
    }

    // --- 5. Muscle Soreness ---
    signals.soreness = Math.max(0, 100 - input.muscleSoreness * 10);
    if (input.muscleSoreness >= 8) {
      reasons.push(`Severe muscle soreness reported (${input.muscleSoreness}/10)`);
      negativeSignalCount++;
    } else if (input.muscleSoreness >= 6) {
      reasons.push(`Moderate muscle soreness (${input.muscleSoreness}/10)`);
    }

    // --- 6. Systemic Fatigue ---
    signals.fatigue = Math.max(0, 100 - input.systemicFatigue * 10);
    if (input.systemicFatigue >= 8) {
      reasons.push(`High systemic fatigue (${input.systemicFatigue}/10)`);
      negativeSignalCount++;
    } else if (input.systemicFatigue >= 6) {
      reasons.push(`Moderate fatigue reported (${input.systemicFatigue}/10)`);
    }

    // --- 7. ACWR ---
    if (input.acwr !== undefined) {
      dataSources.push('training_load');
      if (input.acwr > 1.5) {
        signals.acwr = 15;
        reasons.push(`Acute workload spike (ACWR: ${input.acwr.toFixed(2)} — high injury risk zone)`);
        negativeSignalCount++;
        warnings.push('Training load ratio exceeds safe threshold. Volume reduction strongly recommended.');
      } else if (input.acwr > 1.3) {
        signals.acwr = 40;
        reasons.push(`Elevated training load ratio (ACWR: ${input.acwr.toFixed(2)})`);
        negativeSignalCount++;
      } else if (input.acwr < 0.8) {
        signals.acwr = 50;
        reasons.push('Training load may be insufficient for progressive adaptation');
      } else {
        signals.acwr = 80;
      }
    } else {
      signals.acwr = 60;
    }

    // --- 8. Recent RPE History ---
    dataSources.push('workout_history');
    dataSources.push('performance_history');
    const { performance } = input;
    if (performance.recentRpeHistory.length > 0) {
      const avgRpe = performance.recentRpeHistory.reduce((a, b) => a + b, 0) / performance.recentRpeHistory.length;
      if (avgRpe >= 9.0) {
        signals.rpe = 20;
        reasons.push(`Recent sessions averaged RPE ${avgRpe.toFixed(1)} — near-maximal exertion`);
        negativeSignalCount++;
      } else if (avgRpe >= 8.0) {
        signals.rpe = 50;
      } else if (avgRpe <= 6.5 && performance.missedRepsCount === 0) {
        signals.rpe = 90;
        positiveSignalCount++;
      } else {
        signals.rpe = 70;
      }
    } else {
      signals.rpe = 60;
    }

    // --- 9. Form Quality ---
    if (input.formQuality) {
      dataSources.push('form_analysis');
      if (input.formQuality.averageFormScore < 60) {
        signals.form = 25;
        reasons.push(`Form quality degraded (${input.formQuality.averageFormScore}/100)`);
        negativeSignalCount++;
        if (input.formQuality.repeatedIssues.length > 0) {
          reasons.push(`Repeated form issues: ${input.formQuality.repeatedIssues.slice(0, 2).join(', ')}`);
        }
      } else if (input.formQuality.averageFormScore < 70) {
        signals.form = 45;
        reasons.push(`Form quality below target (${input.formQuality.averageFormScore}/100)`);
      } else {
        signals.form = Math.min(100, input.formQuality.averageFormScore);
      }
    } else {
      signals.form = 70; // assume reasonable when unavailable
    }

    // --- 10. Training Consistency ---
    const consistencyRatio = performance.targetWeeklyWorkouts > 0
      ? performance.weeklyWorkoutCount / performance.targetWeeklyWorkouts
      : 1.0;
    if (consistencyRatio >= 0.8 && consistencyRatio <= 1.2) {
      signals.consistency = 85;
    } else if (consistencyRatio < 0.5) {
      signals.consistency = 40;
      reasons.push('Training consistency is below target');
    } else {
      signals.consistency = 60;
    }

    // ==========================================
    // WEIGHTED COMPOSITE SCORE
    // ==========================================

    let compositeScore = 0;
    compositeScore += signals.recovery * SIGNAL_WEIGHTS.recovery;
    compositeScore += signals.hrv * SIGNAL_WEIGHTS.hrv;
    compositeScore += signals.rhr * SIGNAL_WEIGHTS.rhr;
    compositeScore += signals.sleep * SIGNAL_WEIGHTS.sleep;
    compositeScore += signals.soreness * SIGNAL_WEIGHTS.soreness;
    compositeScore += signals.fatigue * SIGNAL_WEIGHTS.fatigue;
    compositeScore += signals.acwr * SIGNAL_WEIGHTS.acwr;
    compositeScore += signals.rpe * SIGNAL_WEIGHTS.rpe;
    compositeScore += signals.form * SIGNAL_WEIGHTS.form;
    compositeScore += signals.consistency * SIGNAL_WEIGHTS.consistency;
    compositeScore = Math.round(compositeScore);

    // ==========================================
    // CONFIDENCE CALCULATION
    // ==========================================

    let confidence = 0.85;

    // Boost confidence with more data sources
    if (dataSources.includes('wearable')) confidence += 0.05;
    if (dataSources.includes('form_analysis')) confidence += 0.03;
    if (dataSources.includes('training_load')) confidence += 0.03;

    // Degrade confidence for stale data
    if (input.recoveryDataFreshness.state === 'stale') {
      confidence -= 0.25;
      warnings.push('Recovery recommendation uses stale wearable data because your device has not synced recently.');
    } else if (input.recoveryDataFreshness.state === 'aging') {
      confidence -= 0.10;
      warnings.push('Wearable data is aging. Sync your device for more accurate recommendations.');
    } else if (input.recoveryDataFreshness.state === 'unavailable') {
      confidence -= 0.35;
      warnings.push('No wearable data available. Recommendations based on workout history and user-reported metrics only.');
    }

    if (!input.wearableAvailable) {
      confidence -= 0.10;
    }

    confidence = Math.max(ADAPTIVE_SAFETY_LIMITS.MIN_CONFIDENCE_SCORE, Math.min(0.98, confidence));

    // ==========================================
    // ACTION DETERMINATION
    // ==========================================

    let action: AdaptiveAction;
    let intensity: AdaptiveIntensity;
    let volumeAdj = 0;
    let weightAdj = 0;
    let repAdj = 0;
    let restAdj = 0;

    // Tier 1: Critical — Complete Rest
    if (compositeScore < 25 || (input.muscleSoreness >= 9 && input.systemicFatigue >= 9)) {
      action = 'rest';
      intensity = 'none';
      volumeAdj = -100;
      weightAdj = -100;
      repAdj = 0;
      restAdj = 0;
      if (reasons.length === 0) {
        reasons.push('Multiple recovery signals indicate training today would elevate injury risk.');
      }
    }
    // Tier 2: Recovery Workout
    else if (compositeScore < 40) {
      action = 'recovery_workout';
      intensity = 'active_recovery';
      volumeAdj = -ADAPTIVE_SAFETY_LIMITS.MAX_VOLUME_DECREASE_PCT;
      weightAdj = -ADAPTIVE_SAFETY_LIMITS.MAX_WEIGHT_DECREASE_PCT;
      repAdj = 0;
      restAdj = ADAPTIVE_SAFETY_LIMITS.MAX_REST_INCREASE_SECONDS;
    }
    // Tier 3: Reduce Intensity
    else if (compositeScore < 55) {
      action = 'reduce_intensity';
      intensity = 'light';
      volumeAdj = -25;
      weightAdj = -12;
      repAdj = -2;
      restAdj = 30;
    }
    // Tier 4: Reduce Volume (but keep intensity moderate)
    else if (compositeScore < 65) {
      action = 'reduce_volume';
      intensity = 'moderate';
      volumeAdj = -15;
      weightAdj = -5;
      repAdj = -1;
      restAdj = 15;
    }
    // Tier 5: Maintain
    else if (compositeScore < 78) {
      action = 'maintain_load';
      intensity = 'moderate';
      volumeAdj = 0;
      weightAdj = 0;
      repAdj = 0;
      restAdj = 0;
    }
    // Tier 6: Train as Planned
    else if (compositeScore < 88) {
      action = 'train_as_planned';
      intensity = 'full';
      volumeAdj = 0;
      weightAdj = 0;
      repAdj = 0;
      restAdj = 0;
    }
    // Tier 7: Increase Intensity (only with multiple positive signals)
    else {
      if (positiveSignalCount >= ADAPTIVE_SAFETY_LIMITS.MIN_SUPPORTING_SIGNALS && negativeSignalCount === 0) {
        action = 'increase_intensity';
        intensity = 'high';
        volumeAdj = 5;
        weightAdj = 3;
        repAdj = 0;
        restAdj = 0;
        reasons.push('Multiple recovery and performance signals indicate readiness for controlled progression.');
      } else {
        // High score but not enough positive signals to safely increase
        action = 'train_as_planned';
        intensity = 'full';
        volumeAdj = 0;
        weightAdj = 0;
        repAdj = 0;
        restAdj = 0;
      }
    }

    // ==========================================
    // FORM QUALITY OVERRIDE
    // ==========================================

    if (input.formQuality && input.formQuality.averageFormScore < 70 && input.formQuality.recentWarningCount >= 2) {
      if (action === 'train_as_planned' || action === 'increase_intensity') {
        action = 'reduce_intensity';
        intensity = 'moderate';
        weightAdj = Math.min(weightAdj, -8);
        reasons.push('Form quality has degraded under current load. Reducing to focus on controlled technique.');
      }
    }

    // ==========================================
    // SAFETY CLAMPING
    // ==========================================

    volumeAdj = this.clamp(volumeAdj, -ADAPTIVE_SAFETY_LIMITS.MAX_VOLUME_DECREASE_PCT, ADAPTIVE_SAFETY_LIMITS.MAX_VOLUME_INCREASE_PCT);
    weightAdj = this.clamp(weightAdj, -ADAPTIVE_SAFETY_LIMITS.MAX_WEIGHT_DECREASE_PCT, ADAPTIVE_SAFETY_LIMITS.MAX_WEIGHT_INCREASE_PCT);
    repAdj = this.clamp(repAdj, -ADAPTIVE_SAFETY_LIMITS.MAX_REP_ADJUSTMENT, ADAPTIVE_SAFETY_LIMITS.MAX_REP_ADJUSTMENT);
    restAdj = this.clamp(restAdj, 0, ADAPTIVE_SAFETY_LIMITS.MAX_REST_INCREASE_SECONDS);

    // Deduplicate data sources
    const uniqueDataSources = [...new Set(dataSources)];

    // Generate default reason if none
    if (reasons.length === 0) {
      reasons.push('Recovery and performance signals are within normal ranges.');
    }

    return {
      recommendedAction: action,
      recommendedIntensity: intensity,
      volumeAdjustmentPercent: volumeAdj,
      weightAdjustmentPercent: weightAdj,
      repAdjustment: repAdj,
      restAdjustmentSeconds: restAdj,
      confidenceScore: Math.round(confidence * 100) / 100,
      reasons,
      dataSources: uniqueDataSources,
      warnings,
      generatedAt: input.currentTimestamp,
      requiresUserConfirmation: action !== 'train_as_planned' && action !== 'maintain_load',
    };
  }

  /**
   * Clamps a numeric value to the specified range.
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
