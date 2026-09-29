/**
 * FitNova AI — Recovery Data Service
 * Bridges health recovery biometrics with Workout OS Readiness and Nova AI.
 * Zero UI/React code.
 */

import type { HealthDataService } from './HealthDataService.ts';
import type { RecoveryMetrics } from '../models/RecoveryMetrics.ts';
import type { WorkoutReadiness, RecoveryDecision } from '../../workout/intelligence/types.ts';
import { RecoveryDecisionEngine } from '../../workout/intelligence/RecoveryDecisionEngine.ts';

export class RecoveryDataService {
  private readonly healthService: HealthDataService;
  private readonly recoveryEngine: RecoveryDecisionEngine;

  constructor(healthService: HealthDataService, recoveryEngine?: RecoveryDecisionEngine) {
    this.healthService = healthService;
    this.recoveryEngine = recoveryEngine ?? new RecoveryDecisionEngine();
  }

  /**
   * Retrieves physiological recovery metrics and maps them into an enriched WorkoutReadiness object.
   */
  async getEnrichedReadiness(baseReadiness?: Partial<WorkoutReadiness>): Promise<{
    readiness: WorkoutReadiness;
    metrics: RecoveryMetrics;
    decision: RecoveryDecision;
  }> {
    const metrics = await this.healthService.getLatestRecoveryMetrics();

    const readiness: WorkoutReadiness = {
      sleepHours: metrics.sleepHours,
      sorenessScore: baseReadiness?.sorenessScore ?? 2,
      fatigueScore: metrics.recoveryScore < 60 ? 6 : metrics.recoveryScore < 75 ? 4 : 2,
      consecutiveTrainingDays: baseReadiness?.consecutiveTrainingDays ?? 0,
      sleepTrend: baseReadiness?.sleepTrend ?? [metrics.sleepHours],
      muscleSorenessMap: baseReadiness?.muscleSorenessMap ?? {},
      acuteWorkload: baseReadiness?.acuteWorkload,
      chronicWorkload: baseReadiness?.chronicWorkload,
      recentHighRpeSessionsCount: baseReadiness?.recentHighRpeSessionsCount ?? 0,
      // Wearable Biometric Enrichment (Sprint 3.7)
      wearableMetrics: {
        hrvRmssdMs: metrics.hrvRmssdMs,
        hrvBaselineMs: metrics.hrvBaselineMs,
        hrvStatus: metrics.hrvStatus,
        restingHeartRateBpm: metrics.restingHeartRateBpm,
        restingHeartRateBaselineBpm: metrics.restingHeartRateBaselineBpm,
        sleepEfficiencyPct: metrics.sleepEfficiencyPct,
        deepSleepPct: metrics.deepSleepPct,
        remSleepPct: metrics.remSleepPct,
        recoveryScore: metrics.recoveryScore,
      },
    };

    const decision = this.recoveryEngine.evaluateRecovery(readiness);

    return {
      readiness,
      metrics,
      decision,
    };
  }
}
