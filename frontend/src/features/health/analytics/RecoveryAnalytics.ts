/**
 * FitNova AI — Recovery Analytics Engine
 * Synthesizes multi-biometric signals (HRV, Resting Heart Rate, Sleep Architecture, Activity)
 * into a deterministic 0–100 Recovery Score and actionable readiness state.
 * Pure TypeScript. Non-medical fitness guidance.
 */

import type { RecoveryMetrics } from '../models/RecoveryMetrics.ts';
import type { HRVSample } from '../models/HRVSample.ts';
import type { SleepSession } from '../models/SleepSession.ts';
import type { DailyActivity } from '../models/DailyActivity.ts';
import type { RecoveryReadinessState } from '../types/healthEnums.ts';
import { HRVAnalytics } from './HRVAnalytics.ts';
import { SleepAnalytics } from './SleepAnalytics.ts';

export interface RecoveryCalculationInput {
  hrvSamples: HRVSample[];
  sleepSessions: SleepSession[];
  activities: DailyActivity[];
  restingHeartRateBaseline?: number;
}

export class RecoveryAnalytics {
  private readonly hrvEngine = new HRVAnalytics();
  private readonly sleepEngine = new SleepAnalytics();

  /**
   * Computes comprehensive recovery metrics from wearable biometrics.
   */
  calculateRecovery(input: RecoveryCalculationInput): RecoveryMetrics {
    const {
      hrvSamples,
      sleepSessions,
      activities,
      restingHeartRateBaseline = 60,
    } = input;

    const dataSources: Array<'workout_history' | 'hrv' | 'resting_hr' | 'sleep' | 'activity'> = [];

    // 1. Analyze HRV (Weight: 35%)
    const hrvAnalysis = this.hrvEngine.analyzeHRV(hrvSamples);
    if (hrvSamples.length > 0) dataSources.push('hrv');

    let hrvScore = 80;
    if (hrvAnalysis.status === 'optimal') {
      hrvScore = 85 + Math.min(15, Math.max(0, hrvAnalysis.deviationPct * 1.5));
    } else if (hrvAnalysis.status === 'elevated') {
      hrvScore = 95;
    } else if (hrvAnalysis.status === 'suppressed') {
      hrvScore = Math.max(30, 70 + hrvAnalysis.deviationPct * 1.5);
    }

    // 2. Analyze Sleep (Weight: 35%)
    const sleepAnalysis = this.sleepEngine.analyzeSleep(sleepSessions);
    if (sleepSessions.length > 0) dataSources.push('sleep');

    let sleepScore = 75;
    if (sleepAnalysis.qualityRating === 'excellent') sleepScore = 95;
    else if (sleepAnalysis.qualityRating === 'good') sleepScore = 82;
    else if (sleepAnalysis.qualityRating === 'fair') sleepScore = 65;
    else sleepScore = 40;

    // 3. Analyze Resting Heart Rate (Weight: 20%)
    const latestActivity = activities.length > 0 ? activities[activities.length - 1] : null;
    const latestRhr = latestActivity?.restingHeartRateBpm || restingHeartRateBaseline;
    if (latestActivity) {
      dataSources.push('resting_hr', 'activity');
    }

    const rhrDelta = latestRhr - restingHeartRateBaseline;
    let rhrScore = 80;
    if (rhrDelta <= -2) {
      rhrScore = 95; // Lower resting HR is positive adaptation
    } else if (rhrDelta <= 1) {
      rhrScore = 85;
    } else if (rhrDelta <= 4) {
      rhrScore = 68;
    } else {
      rhrScore = Math.max(30, 80 - rhrDelta * 6);
    }

    // 4. Activity Strain Balance (Weight: 10%)
    let activityScore = 80;
    if (latestActivity) {
      if (latestActivity.activeMinutes > 90) {
        activityScore = 65; // High prior-day fatigue
      } else if (latestActivity.activeMinutes >= 30) {
        activityScore = 88;
      }
    }

    // Composite Weighted Recovery Score (0-100)
    let compositeScore = Math.round(
      hrvScore * 0.35 + sleepScore * 0.35 + rhrScore * 0.2 + activityScore * 0.1
    );
    compositeScore = Math.max(0, Math.min(100, compositeScore));

    // Determine Readiness State & Intensity Guidance
    let readinessState: RecoveryReadinessState = 'optimal';
    let recommendedIntensity: 'full' | 'moderate' | 'light' | 'active_recovery' | 'none' = 'full';
    let intensityModifier = 1.0;
    const contributingFactors: string[] = [];
    const recoveryWarnings: string[] = [];

    if (compositeScore >= 80) {
      readinessState = 'optimal';
      recommendedIntensity = 'full';
      intensityModifier = 1.0;
      contributingFactors.push(
        `HRV is ${hrvAnalysis.status} (${hrvAnalysis.deviationPct >= 0 ? '+' : ''}${hrvAnalysis.deviationPct}% vs baseline)`,
        `Restorative sleep: ${sleepAnalysis.latestSleepHours}h (${sleepAnalysis.deepSleepMinutes}m deep sleep)`,
        `Resting HR is steady at ${latestRhr} BPM (${rhrDelta >= 0 ? '+' : ''}${rhrDelta} BPM)`
      );
    } else if (compositeScore >= 65) {
      readinessState = 'moderate';
      recommendedIntensity = 'moderate';
      intensityModifier = 0.85;
      contributingFactors.push(
        `Moderate physiological readiness detected (${compositeScore}/100)`,
        sleepAnalysis.recommendations[0] || 'Sleep duration was moderate',
        hrvAnalysis.explanation
      );
      recoveryWarnings.push('Consider capping working sets at RPE 8.0 to maintain progressive adaptation.');
    } else if (compositeScore >= 45) {
      readinessState = 'low';
      recommendedIntensity = 'light';
      intensityModifier = 0.65;
      contributingFactors.push(
        'Elevated autonomic strain or sleep debt',
        hrvAnalysis.explanation,
        `Recent sleep: ${sleepAnalysis.latestSleepHours}h logged`
      );
      recoveryWarnings.push(
        'High systemic fatigue. Scale back training load or substitute heavy compounds with machine variations.'
      );
    } else {
      readinessState = 'rest_recommended';
      recommendedIntensity = 'active_recovery';
      intensityModifier = 0.0;
      contributingFactors.push(
        'Critical recovery deficit across HRV and sleep architecture',
        `Sleep: ${sleepAnalysis.latestSleepHours}h with ${sleepAnalysis.sleepDebtMinutes}m debt`,
        `Resting heart rate elevated (+${rhrDelta} BPM)`
      );
      recoveryWarnings.push(
        'Rest is strongly recommended today. Prioritize hydration, mobility, and early sleep.'
      );
    }

    const now = Date.now();
    return {
      id: `rec_${now}`,
      date: new Date(now).toISOString().split('T')[0],
      timestamp: now,
      recoveryScore: compositeScore,
      readinessState,
      recommendedIntensity,
      intensityModifier,
      restingHeartRateBpm: latestRhr,
      restingHeartRateBaselineBpm: restingHeartRateBaseline,
      rhrDeltaFromBaseline: rhrDelta,
      hrvRmssdMs: hrvAnalysis.latestRmssdMs,
      hrvBaselineMs: hrvAnalysis.baselineRmssdMs,
      hrvStatus: hrvAnalysis.status,
      sleepHours: sleepAnalysis.latestSleepHours,
      sleepEfficiencyPct: sleepAnalysis.efficiencyPct,
      deepSleepPct: sleepAnalysis.deepSleepPct,
      remSleepPct: sleepAnalysis.remSleepPct,
      contributingFactors,
      recoveryWarnings,
      confidenceLevel: dataSources.length >= 3 ? 0.95 : 0.8,
      dataSourcesUsed: dataSources.length > 0 ? dataSources : ['workout_history'],
    };
  }
}
