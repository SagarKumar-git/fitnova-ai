/**
 * FitNova AI — Recovery Decision Engine
 * Deterministic evaluation of central nervous system readiness, muscular recovery,
 * sleep trends, training-load accumulation (ACWR), recovery debt, and intensity recommendations.
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
      sleepTrend = [],
      muscleSorenessMap = {},
      acuteWorkload,
      chronicWorkload,
      recentHighRpeSessionsCount = 0,
    } = readiness;

    const primaryFactors: string[] = [];
    let readinessScore = 100;

    // 1. Sleep Evaluation & Trend Analysis
    if (sleepHours < 5.0) {
      readinessScore -= 28;
      primaryFactors.push(`Critical sleep deficit (${sleepHours}h sleep logged)`);
    } else if (sleepHours < READINESS_THRESHOLDS.LOW_SLEEP_HOURS) {
      readinessScore -= 18;
      primaryFactors.push(`Sub-optimal sleep (${sleepHours}h sleep logged)`);
    } else if (sleepHours < READINESS_THRESHOLDS.OPTIMAL_SLEEP_HOURS) {
      readinessScore -= 8;
    }

    if (sleepTrend.length >= 2) {
      const avgSleepTrend = sleepTrend.reduce((a, b) => a + b, 0) / sleepTrend.length;
      if (avgSleepTrend < 6.0) {
        readinessScore -= 10;
        primaryFactors.push(`Chronic sleep debt (multi-day average ${avgSleepTrend.toFixed(1)}h)`);
      }
    }

    // 2. Muscular Soreness & Muscle Group Distribution
    readinessScore -= Math.round(sorenessScore * 3.5);
    if (sorenessScore >= READINESS_THRESHOLDS.HIGH_SORENESS) {
      primaryFactors.push(`Severe muscle soreness reported (${sorenessScore}/10)`);
    }

    const highSorenessMuscles = Object.entries(muscleSorenessMap)
      .filter(([, score]) => score >= 7)
      .map(([m]) => m);
    if (highSorenessMuscles.length > 0) {
      readinessScore -= 6;
      primaryFactors.push(`High focal soreness in: ${highSorenessMuscles.join(', ')}`);
    }

    // 3. Systemic Fatigue
    readinessScore -= Math.round(fatigueScore * 4.0);
    if (fatigueScore >= READINESS_THRESHOLDS.HIGH_FATIGUE) {
      primaryFactors.push(`High systemic fatigue (${fatigueScore}/10)`);
    }

    // 4. Consecutive Training Days & Density
    if (consecutiveTrainingDays >= READINESS_THRESHOLDS.MAX_CONSECUTIVE_DAYS) {
      readinessScore -= 20;
      primaryFactors.push(
        `${consecutiveTrainingDays} consecutive days of training without recovery day`
      );
    } else if (consecutiveTrainingDays >= 3) {
      readinessScore -= 10;
      primaryFactors.push(`${consecutiveTrainingDays} consecutive training days logged`);
    }

    // 5. Training-Load Accumulation (ACWR)
    if (acuteWorkload !== undefined && chronicWorkload !== undefined && chronicWorkload > 0) {
      const acwr = acuteWorkload / chronicWorkload;
      if (acwr > 1.5) {
        readinessScore -= 15;
        primaryFactors.push(`Acute workload spike (ACWR: ${acwr.toFixed(2)} - high injury risk)`);
      } else if (acwr > 1.3) {
        readinessScore -= 8;
        primaryFactors.push(`Elevated acute workload ratio (${acwr.toFixed(2)})`);
      }
    }

    // 6. High-RPE Session Accumulation
    if (recentHighRpeSessionsCount >= 3) {
      readinessScore -= 14;
      primaryFactors.push(
        `${recentHighRpeSessionsCount} recent sessions performed at near-maximal exertion (RPE >= 8.5)`
      );
    } else if (recentHighRpeSessionsCount >= 2) {
      readinessScore -= 7;
    }

    // 7. Sprint 3.7 Wearable Signal Integration (Dual Mode)
    const dataSourcesUsed: Array<'workout_history' | 'hrv' | 'resting_hr' | 'sleep' | 'activity'> = [
      'workout_history',
    ];
    let wearableEnriched = false;

    if (readiness.wearableMetrics) {
      wearableEnriched = true;
      const {
        hrvRmssdMs,
        hrvBaselineMs,
        hrvStatus,
        restingHeartRateBpm,
        restingHeartRateBaselineBpm,
        deepSleepPct,
      } = readiness.wearableMetrics;

      // HRV Evaluation
      if (hrvRmssdMs !== undefined || hrvStatus !== undefined) {
        dataSourcesUsed.push('hrv');
        if (
          hrvStatus === 'suppressed' ||
          (hrvRmssdMs && hrvBaselineMs && hrvRmssdMs < hrvBaselineMs * 0.85)
        ) {
          readinessScore -= 12;
          primaryFactors.push('Autonomic HRV suppression detected (reduced parasympathetic recovery)');
        } else if (hrvStatus === 'elevated') {
          readinessScore += 5;
          primaryFactors.push('Elevated HRV detected (high parasympathetic recovery)');
        }
      }

      // Resting Heart Rate Evaluation
      if (restingHeartRateBpm !== undefined && restingHeartRateBaselineBpm !== undefined) {
        dataSourcesUsed.push('resting_hr');
        const rhrDelta = restingHeartRateBpm - restingHeartRateBaselineBpm;
        if (rhrDelta >= 5) {
          readinessScore -= 8;
          primaryFactors.push(`Resting heart rate elevated (+${rhrDelta} BPM vs baseline)`);
        } else if (rhrDelta <= -2) {
          readinessScore += 3;
        }
      }

      // Deep Sleep Architecture Evaluation
      if (deepSleepPct !== undefined) {
        dataSourcesUsed.push('sleep');
        if (deepSleepPct < 14) {
          readinessScore -= 6;
          primaryFactors.push(`Limited deep slow-wave sleep (${deepSleepPct}%)`);
        }
      }
    }

    // Clamp readiness score between 0 and 100
    readinessScore = Math.max(0, Math.min(100, Math.round(readinessScore)));
    const recoveryDebt = 100 - readinessScore;

    // Determine Action & Recommendation
    let action: RecoveryAction = 'train_normal';
    let recommendedIntensity: 'full' | 'moderate' | 'light' | 'active_recovery' | 'none' = 'full';
    let isRestDayRecommended = false;
    let intensityModifier = 1.0;
    let recommendedDurationMinutes = 60;
    let reason = '';
    const recoveryGuidance: string[] = [];
    let confidence = 0.95;

    // Condition 1: Severe Muscular Soreness / Extreme Fatigue / Low Sleep -> Complete Rest
    if (
      (fatigueScore >= READINESS_THRESHOLDS.HIGH_FATIGUE &&
        sorenessScore >= READINESS_THRESHOLDS.HIGH_SORENESS) ||
      sleepHours < 4.5
    ) {
      action = 'rest';
      recommendedIntensity = 'none';
      isRestDayRecommended = true;
      intensityModifier = 0.0;
      recommendedDurationMinutes = 0;
      reason = `Severe muscular soreness (${sorenessScore}/10) and systemic fatigue (${fatigueScore}/10) combined with insufficient sleep (${sleepHours}h). Training today would elevate injury risk and impair muscle protein synthesis.`;
      recoveryGuidance.push(
        'Prioritize 8+ hours of sleep tonight.',
        'Focus on high-protein nutrition (2g/kg bodyweight).',
        'Light 15-minute walking and gentle hydration only.'
      );
      confidence = 0.98;
      readinessScore = Math.min(readinessScore, 40);
    }
    // Condition 2: High Consecutive Days or Low Sleep -> Active Recovery Workout
    else if (
      consecutiveTrainingDays >= READINESS_THRESHOLDS.MAX_CONSECUTIVE_DAYS ||
      sleepHours < READINESS_THRESHOLDS.LOW_SLEEP_HOURS
    ) {
      action = 'recovery_workout';
      recommendedIntensity = 'active_recovery';
      isRestDayRecommended = false;
      intensityModifier = 0.55;
      recommendedDurationMinutes = 30;
      reason = `You have trained ${consecutiveTrainingDays} consecutive days with limited sleep (${sleepHours}h). Active recovery with light mobility will accelerate blood flow without taxing motor units.`;
      recoveryGuidance.push(
        'Replace heavy compound movements with dynamic mobility and foam rolling.',
        'Keep heart rate in Zone 1-2 (under 125 BPM).',
        'Take a warm shower or sauna to reduce tissue stiffness.'
      );
      confidence = 0.92;
      readinessScore = Math.min(Math.max(readinessScore, 45), 64);
    }
    // Condition 3: Moderate Fatigue, Soreness, or Autonomic Wearable Suppression -> Reduce Intensity
    else if (
      fatigueScore >= 6 ||
      sorenessScore >= 6 ||
      sleepHours < READINESS_THRESHOLDS.OPTIMAL_SLEEP_HOURS ||
      readinessScore < 75 ||
      readiness.wearableMetrics?.hrvStatus === 'suppressed'
    ) {
      action = 'reduce_intensity';
      recommendedIntensity = 'moderate';
      isRestDayRecommended = false;
      intensityModifier = 0.8;
      recommendedDurationMinutes = 45;
      reason =
        readiness.wearableMetrics?.hrvStatus === 'suppressed'
          ? `Autonomic HRV suppression or recovery deficit detected (${readinessScore}/100). Scaling back working volume by 20% to prevent overtraining.`
          : `Mild fatigue detected (fatigue: ${fatigueScore}/10, sleep: ${sleepHours}h). You can train effectively, but scale back working volume by 20% and avoid training to absolute failure.`;
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
      recommendedIntensity = 'full';
      isRestDayRecommended = false;
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

    if (primaryFactors.length === 0) {
      primaryFactors.push('Optimal sleep duration and sleep quality', 'Negligible muscular soreness');
    }

    const recommendationExplanation = reason;

    return {
      action,
      decision: action,
      intensityModifier,
      recommendedDurationMinutes,
      reason,
      recoveryGuidance,
      confidence,
      readinessScore,
      recommendedIntensity,
      isRestDayRecommended,
      recoveryDebt,
      primaryFactors,
      recommendationExplanation,
      dataSourcesUsed,
      wearableEnriched,
    };
  }
}
