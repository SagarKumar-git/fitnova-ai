/**
 * FitNova AI — Muscle Recovery Analytics
 * Pure TypeScript engine computing per-muscle recovery states, time since last trained,
 * rolling volume, frequency, and structured overload recommendations.
 * Integrates with RecoveryDecisionEngine.
 * Zero UI/React code.
 */

import type { WorkoutHistoryEntry } from '../models/WorkoutHistory.ts';
import type { Exercise } from '../models/Exercise.ts';
import { RecoveryDecisionEngine } from '../intelligence/RecoveryDecisionEngine.ts';
import type { WorkoutReadiness } from '../intelligence/types.ts';

export type MuscleRecoveryStatus = 'fresh' | 'recovered' | 'moderate' | 'fatigued';

export interface MuscleGroupRecoveryDetail {
  muscleGroup: string;
  lastTrainedTimestamp: number | null;
  hoursSinceLastTrained: number | null;
  sessionsCount7Days: number;
  sessionsCount14Days: number;
  recentVolumeKg: number; // Volume in past 7 days
  trainingFrequencyWeekly: number;
  estimatedRecoveryStatus: MuscleRecoveryStatus;
  recoveryPercentage: number; // 0% (exhausted) to 100% (fully recovered)
  consecutiveTrainingDays: number;
  recoveryRecommendation: string;
  isReadyToTrain: boolean;
}

export interface MuscleRecoveryReport {
  timestamp: number;
  muscles: Record<string, MuscleGroupRecoveryDetail>;
  overallRecoveryStatus: MuscleRecoveryStatus;
  overallRecoveryScore: number; // 0 to 100
  readyMuscles: string[];
  fatiguedMuscles: string[];
  recommendation: string;
}

export const MAJOR_MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Quadriceps',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Core',
  'Forearms',
] as const;

export class MuscleRecoveryAnalytics {
  private readonly recoveryEngine: RecoveryDecisionEngine;

  constructor(recoveryEngine?: RecoveryDecisionEngine) {
    this.recoveryEngine = recoveryEngine ?? new RecoveryDecisionEngine();
  }

  /**
   * Computes comprehensive per-muscle recovery analytics from training history.
   *
   * @param history User workout history logs
   * @param exercisesCatalog Exercise database mapping exercises to primary muscle groups
   * @param readiness Optional daily readiness input from recovery questionnaire
   * @param referenceTimestamp Reference time (defaults to Date.now())
   */
  calculateMuscleRecovery(
    history: WorkoutHistoryEntry[],
    exercisesCatalog: Exercise[] = [],
    readiness?: WorkoutReadiness,
    referenceTimestamp: number = Date.now()
  ): MuscleRecoveryReport {
    const DAY_MS = 86_400_000;
    const HOUR_MS = 3_600_000;
    const sevenDaysAgo = referenceTimestamp - 7 * DAY_MS;
    const fourteenDaysAgo = referenceTimestamp - 14 * DAY_MS;

    // Create exercise ID to primary muscle group lookup map
    const catalogMap = new Map<string, string>();
    for (const ex of exercisesCatalog) {
      if (ex.id && ex.primaryMuscleGroup) {
        catalogMap.set(ex.id, ex.primaryMuscleGroup);
      }
    }

    // Initialize per-muscle metrics tracking
    interface MuscleDataAccumulator {
      sessionsTimestamps: number[];
      recentVolume7d: number;
      volume14d: number;
      lastTrained: number | null;
    }

    const muscleMap = new Map<string, MuscleDataAccumulator>();
    for (const group of MAJOR_MUSCLE_GROUPS) {
      muscleMap.set(group, {
        sessionsTimestamps: [],
        recentVolume7d: 0,
        volume14d: 0,
        lastTrained: null,
      });
    }

    // Sort history chronologically ascending
    const validHistory = [...history]
      .filter((h) => {
        const ts = h.completedAt || new Date(h.date).getTime();
        return !isNaN(ts) && ts <= referenceTimestamp;
      })
      .sort((a, b) => {
        const aTs = a.completedAt || new Date(a.date).getTime();
        const bTs = b.completedAt || new Date(b.date).getTime();
        return aTs - bTs;
      });

    // Process all sessions and attribute sets/volume to muscle groups
    for (const entry of validHistory) {
      const entryTs = entry.completedAt || new Date(entry.date).getTime();

      const touchedInThisSession = new Set<string>();

      for (const ex of entry.exercises) {
        let muscle = catalogMap.get(ex.exerciseId);

        // Fallback: match name heuristics if not in catalog
        if (!muscle) {
          const lower = ex.exerciseName.toLowerCase();
          if (lower.includes('bench') || lower.includes('chest') || lower.includes('push-up') || lower.includes('fly')) {
            muscle = 'Chest';
          } else if (lower.includes('row') || lower.includes('pull-up') || lower.includes('lat') || lower.includes('deadlift')) {
            muscle = 'Back';
          } else if (lower.includes('press') || lower.includes('shoulder') || lower.includes('lateral')) {
            muscle = 'Shoulders';
          } else if (lower.includes('curl') || lower.includes('bicep')) {
            muscle = 'Biceps';
          } else if (lower.includes('tricep') || lower.includes('dip') || lower.includes('pushdown')) {
            muscle = 'Triceps';
          } else if (lower.includes('squat') || lower.includes('leg press') || lower.includes('quad') || lower.includes('lunge')) {
            muscle = 'Quadriceps';
          } else if (lower.includes('hamstring') || lower.includes('rdl') || lower.includes('leg curl')) {
            muscle = 'Hamstrings';
          } else if (lower.includes('hip thrust') || lower.includes('glute')) {
            muscle = 'Glutes';
          } else if (lower.includes('calf') || lower.includes('calves')) {
            muscle = 'Calves';
          } else if (lower.includes('crunch') || lower.includes('plank') || lower.includes('ab')) {
            muscle = 'Core';
          } else {
            muscle = 'Back'; // default fallback
          }
        }

        if (!muscleMap.has(muscle)) {
          muscleMap.set(muscle, {
            sessionsTimestamps: [],
            recentVolume7d: 0,
            volume14d: 0,
            lastTrained: null,
          });
        }

        const data = muscleMap.get(muscle)!;
        if (!data.lastTrained || entryTs > data.lastTrained) {
          data.lastTrained = entryTs;
        }

        if (entryTs >= sevenDaysAgo) {
          data.recentVolume7d += ex.volume || 0;
        }
        if (entryTs >= fourteenDaysAgo) {
          data.volume14d += ex.volume || 0;
        }

        touchedInThisSession.add(muscle);
      }

      for (const m of touchedInThisSession) {
        muscleMap.get(m)?.sessionsTimestamps.push(entryTs);
      }
    }

    // Evaluate readiness adjustment if present
    const readinessDecision = readiness ? this.recoveryEngine.evaluateRecovery(readiness) : undefined;
    const readinessScore = readinessDecision?.readinessScore ?? 85;

    const details: Record<string, MuscleGroupRecoveryDetail> = {};
    const readyMuscles: string[] = [];
    const fatiguedMuscles: string[] = [];
    let totalScore = 0;

    for (const [group, data] of muscleMap.entries()) {
      const lastTs = data.lastTrained;
      const hoursSinceLastTrained = lastTs ? Math.round((referenceTimestamp - lastTs) / HOUR_MS) : null;

      const sessions7d = data.sessionsTimestamps.filter((ts) => ts >= sevenDaysAgo).length;
      const sessions14d = data.sessionsTimestamps.filter((ts) => ts >= fourteenDaysAgo).length;
      const weeklyFrequency = Math.round((sessions14d / 2) * 10) / 10;
      const recentVolume = Math.round(data.recentVolume7d);

      // Calculate consecutive days trained for this muscle
      let consecutiveDays = 0;
      if (lastTs) {
        const uniqueDayOffsets = new Set<number>();
        for (const ts of data.sessionsTimestamps) {
          const dayOffset = Math.floor((referenceTimestamp - ts) / DAY_MS);
          if (dayOffset <= 7) {
            uniqueDayOffsets.add(dayOffset);
          }
        }
        let checkDay = 0;
        while (uniqueDayOffsets.has(checkDay)) {
          consecutiveDays++;
          checkDay++;
        }
      }

      // Determine Recovery Status & Recovery Percentage
      let status: MuscleRecoveryStatus = 'fresh';
      let recoveryPct = 100;
      let recommendation = 'Fully recovered and primed for progressive overload.';
      let isReady = true;

      if (hoursSinceLastTrained === null || hoursSinceLastTrained > 96) {
        // More than 4 days ago -> Fresh
        status = 'fresh';
        recoveryPct = 100;
        recommendation = 'Fully rested (>96h). High capacity for intense working sets.';
        isReady = true;
      } else if (hoursSinceLastTrained >= 48) {
        // 48h to 96h -> Fully Recovered
        status = 'recovered';
        recoveryPct = Math.min(100, Math.round(75 + (hoursSinceLastTrained - 48) * 0.5));
        recommendation = 'Optimal recovery window achieved (48h–96h). Cleared for full intensity.';
        isReady = true;
      } else if (hoursSinceLastTrained >= 24) {
        // 24h to 48h -> Moderate
        status = 'moderate';
        recoveryPct = Math.round(50 + (hoursSinceLastTrained - 24) * 1.0);
        if (recentVolume > 7000 || consecutiveDays > 1) {
          recommendation = 'Moderate recovery. Consider reducing working volume or targeting antagonist muscles.';
          isReady = false;
        } else {
          recommendation = 'Moderate recovery. Can perform secondary accessory sets or maintain current weight.';
          isReady = true;
        }
      } else {
        // Under 24h -> Fatigued
        status = 'fatigued';
        recoveryPct = Math.max(15, Math.round((hoursSinceLastTrained / 24) * 45));
        recommendation = `Recently trained (${hoursSinceLastTrained} hours ago). Rest recommended to allow myofibrillar repair and glycogen resynthesis.`;
        isReady = false;
      }

      // Factor systemic readiness penalty if readiness is low
      if (readinessScore < 60) {
        recoveryPct = Math.min(recoveryPct, Math.round(recoveryPct * (readinessScore / 100)));
        if (recoveryPct < 70) {
          status = recoveryPct < 45 ? 'fatigued' : 'moderate';
          isReady = false;
          recommendation = 'Systemic fatigue elevated. Delay intense loading on this muscle group.';
        }
      }

      if (isReady) {
        readyMuscles.push(group);
      } else {
        fatiguedMuscles.push(group);
      }

      totalScore += recoveryPct;

      details[group] = {
        muscleGroup: group,
        lastTrainedTimestamp: lastTs,
        hoursSinceLastTrained,
        sessionsCount7Days: sessions7d,
        sessionsCount14Days: sessions14d,
        recentVolumeKg: recentVolume,
        trainingFrequencyWeekly: weeklyFrequency,
        estimatedRecoveryStatus: status,
        recoveryPercentage: recoveryPct,
        consecutiveTrainingDays: consecutiveDays,
        recoveryRecommendation: recommendation,
        isReadyToTrain: isReady,
      };
    }

    const groupCount = MAJOR_MUSCLE_GROUPS.length;
    const avgScore = Math.round(totalScore / groupCount);

    let overallStatus: MuscleRecoveryStatus = 'recovered';
    if (avgScore >= 85) {
      overallStatus = 'fresh';
    } else if (avgScore >= 70) {
      overallStatus = 'recovered';
    } else if (avgScore >= 50) {
      overallStatus = 'moderate';
    } else {
      overallStatus = 'fatigued';
    }

    let reportRecommendation = '';
    if (overallStatus === 'fresh' || overallStatus === 'recovered') {
      reportRecommendation = `${readyMuscles.slice(0, 3).join(', ')} are fully recovered and ready for progressive overload training.`;
    } else if (overallStatus === 'moderate') {
      reportRecommendation = `Focus session on ${readyMuscles.slice(0, 2).join(' or ')} while giving ${fatiguedMuscles.slice(0, 2).join(' & ')} more recovery time.`;
    } else {
      reportRecommendation = 'High muscular fatigue detected across multiple muscle groups. Active recovery or rest is advised.';
    }

    return {
      timestamp: referenceTimestamp,
      muscles: details,
      overallRecoveryStatus: overallStatus,
      overallRecoveryScore: avgScore,
      readyMuscles,
      fatiguedMuscles,
      recommendation: reportRecommendation,
    };
  }
}
