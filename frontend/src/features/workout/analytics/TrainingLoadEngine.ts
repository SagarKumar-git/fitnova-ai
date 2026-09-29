/**
 * FitNova AI — Training Load Engine
 * Calculates Acute:Chronic Workload Ratio (ACWR), rolling 7-day acute load,
 * rolling 28-day chronic load, training status, and conservative fitness guidance.
 * Pure TypeScript — Non-medical fitness guidance.
 * Zero UI/React code.
 */

import type { WorkoutHistoryEntry } from '../models/WorkoutHistory.ts';

export type TrainingLoadStatus =
  | 'optimal'
  | 'under_training'
  | 'overreaching'
  | 'excessive_spike';

export interface TrainingLoadAnalysis {
  status: TrainingLoadStatus;
  score: number; // 0 to 100
  acuteLoad: number; // Rolling 7-day load (kg-volume)
  chronicLoad: number; // Rolling 28-day load (kg-volume)
  weeklyChronicAverage: number; // chronicLoad / 4
  loadRatio: number; // ACWR = acuteLoad / Math.max(1, weeklyChronicAverage)
  weeklyTrainingLoad: number; // Current week volume
  recommendation: string;
  reasons: string[];
  isSuddenSpike: boolean;
  isUnderTraining: boolean;
  isConsistent: boolean;

  // Sprint 3.7 Enriched Metrics
  acuteTrainingLoad: number;
  chronicTrainingLoad: number;
  trainingStrain: number;
  recoveryAdjustedTrainingLoad: number;
  isUnderRecoveryWarning: boolean;
}

export interface HealthTrainingLoadContext {
  recoveryScore?: number;
  hrvTrend?: 'improving' | 'stable' | 'declining';
  restingHeartRateDelta?: number;
  sleepDurationHours?: number;
}

export class TrainingLoadEngine {
  /**
   * Computes Acute:Chronic Workload Ratio (ACWR) and structured training load analysis.
   *
   * @param history Chronological or unsorted workout history logs
   * @param referenceTimestamp Current time (defaults to Date.now())
   */
  calculateTrainingLoad(
    history: WorkoutHistoryEntry[],
    referenceTimestamp: number = Date.now(),
    healthContext?: HealthTrainingLoadContext
  ): TrainingLoadAnalysis {
    if (!history || history.length === 0) {
      return {
        status: 'under_training',
        score: 50,
        acuteLoad: 0,
        chronicLoad: 0,
        weeklyChronicAverage: 0,
        loadRatio: 0,
        weeklyTrainingLoad: 0,
        recommendation: 'Begin your training journey with light-to-moderate foundation workouts to establish a baseline chronic load.',
        reasons: ['No previous training history recorded.'],
        isSuddenSpike: false,
        isUnderTraining: true,
        isConsistent: false,
        acuteTrainingLoad: 0,
        chronicTrainingLoad: 0,
        trainingStrain: 0,
        recoveryAdjustedTrainingLoad: 0,
        isUnderRecoveryWarning: false,
      };
    }

    const DAY_MS = 86_400_000;
    const sevenDaysAgo = referenceTimestamp - 7 * DAY_MS;
    const twentyEightDaysAgo = referenceTimestamp - 28 * DAY_MS;

    let acuteLoad = 0;
    let chronicLoad = 0;
    let weeklyTrainingLoad = 0;

    // Filter valid completed workouts
    const validSessions = history.filter((h) => {
      const ts = h.completedAt || new Date(h.date).getTime();
      return !isNaN(ts) && ts <= referenceTimestamp;
    });

    for (const session of validSessions) {
      const ts = session.completedAt || new Date(session.date).getTime();
      const volume = session.totalVolume || 0;

      // 7-day Acute window
      if (ts >= sevenDaysAgo) {
        acuteLoad += volume;
        weeklyTrainingLoad += volume;
      }

      // 28-day Chronic window
      if (ts >= twentyEightDaysAgo) {
        chronicLoad += volume;
      }
    }

    acuteLoad = Math.round(acuteLoad);
    chronicLoad = Math.round(chronicLoad);
    weeklyTrainingLoad = Math.round(weeklyTrainingLoad);

    // Weekly normalized chronic average
    const weeklyChronicAverage = Math.round(chronicLoad / 4);

    // Calculate ACWR (Acute:Chronic Workload Ratio)
    let loadRatio = 1.0;
    if (weeklyChronicAverage > 0) {
      loadRatio = Math.round((acuteLoad / weeklyChronicAverage) * 100) / 100;
    } else if (acuteLoad > 0) {
      // First week with no prior baseline -> moderate initial ratio
      loadRatio = 1.5;
    } else {
      loadRatio = 0.0;
    }

    // Determine Status, Score, and Guidance
    let status: TrainingLoadStatus = 'optimal';
    let score = 85;
    const reasons: string[] = [];
    let isSuddenSpike = false;
    let isUnderTraining = false;
    let isConsistent = false;

    if (loadRatio === 0 || (acuteLoad === 0 && chronicLoad > 0)) {
      status = 'under_training';
      score = 45;
      isUnderTraining = true;
      reasons.push('Zero training volume recorded in the past 7 days.');
      reasons.push('Chronic conditioning may begin to decline without stimulus.');
    } else if (loadRatio < 0.8) {
      status = 'under_training';
      score = 65;
      isUnderTraining = true;
      reasons.push(`Acute load (${acuteLoad.toLocaleString()} kg) is significantly lower than your 4-week average (${weeklyChronicAverage.toLocaleString()} kg/wk).`);
      reasons.push('Training stimulus is currently below maintenance threshold.');
    } else if (loadRatio > 1.5) {
      status = 'excessive_spike';
      score = 55;
      isSuddenSpike = true;
      reasons.push(`Acute load (${acuteLoad.toLocaleString()} kg) is >150% of your established 4-week baseline (${weeklyChronicAverage.toLocaleString()} kg/wk).`);
      reasons.push('Sudden rapid volume spikes increase fatigue accumulation and risk of overuse.');
    } else if (loadRatio >= 1.3) {
      status = 'overreaching';
      score = 75;
      reasons.push(`Acute load is progressing aggressively (${Math.round(loadRatio * 100)}% of baseline).`);
      reasons.push('Productive functional overreaching if followed by planned recovery.');
    } else {
      status = 'optimal';
      score = 95;
      isConsistent = true;
      reasons.push(`Training workload ratio (${loadRatio.toFixed(2)}) sits in the sweet spot (0.80 – 1.30).`);
      reasons.push('Progressive overload is well-calibrated against recovery capacity.');
    }

    // Recommendation synthesis
    let recommendation = '';
    switch (status) {
      case 'optimal':
        recommendation = isConsistent
          ? 'Optimal training load maintained. Continue standard progressive overload with current training split.'
          : 'Your workload is balanced. Maintain steady progression across working sets.';
        break;
      case 'under_training':
        recommendation = acuteLoad === 0
          ? 'Schedule an introductory session this week to re-engage active muscular adaptations.'
          : 'Consider adding 1–2 working sets per muscle group to restore your established volume baseline.';
        break;
      case 'overreaching':
        recommendation = 'You are in a high-stimulus overload phase. Prioritize sleep, hydration, and consider a lighter session next.';
        break;
      case 'excessive_spike':
        recommendation = 'Training volume increased too abruptly. Cap session intensity and avoid adding extra sets until chronic baseline adapts.';
        break;
    }

    // Sprint 3.7 Health Enriched Load & Strain
    const acuteTrainingLoad = acuteLoad;
    const chronicTrainingLoad = chronicLoad;
    const trainingStrain = Math.round(acuteLoad * Math.max(0.5, loadRatio));

    let isUnderRecoveryWarning = false;
    let recoveryAdjustedTrainingLoad = acuteLoad;

    if (healthContext) {
      const recScore = healthContext.recoveryScore ?? 80;
      recoveryAdjustedTrainingLoad = Math.round(acuteLoad * (recScore / 100));

      if (recScore < 60 || healthContext.hrvTrend === 'declining') {
        isUnderRecoveryWarning = true;
        reasons.unshift(
          `Under-recovery alert: Physiological recovery is compromised (Recovery: ${recScore}/100, HRV: ${healthContext.hrvTrend || 'declining'}).`
        );
        recommendation += ' Wearable biometrics show elevated fatigue; scaling back training volume by 20% is advised.';
      }
    }

    return {
      status,
      score,
      acuteLoad,
      chronicLoad,
      weeklyChronicAverage,
      loadRatio,
      weeklyTrainingLoad,
      recommendation,
      reasons,
      isSuddenSpike,
      isUnderTraining,
      isConsistent,
      acuteTrainingLoad,
      chronicTrainingLoad,
      trainingStrain,
      recoveryAdjustedTrainingLoad,
      isUnderRecoveryWarning,
    };
  }
}
