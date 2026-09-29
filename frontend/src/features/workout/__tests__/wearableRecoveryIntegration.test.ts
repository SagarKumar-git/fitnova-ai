/**
 * FitNova AI — Sprint 3.7 Wearable Intelligence & Recovery Integration Test Suite
 * Tests Dual-Mode Recovery Decision Engine (Workout-Only vs Wearable-Enriched),
 * NovaRecoveryBrief synthesis with data source attribution, and TrainingLoadEngine
 * health-enriched strain and under-recovery warning calculations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RecoveryDecisionEngine } from '../intelligence/RecoveryDecisionEngine.ts';
import { NovaWorkoutService } from '../intelligence/NovaWorkoutService.ts';
import { TrainingLoadEngine } from '../analytics/TrainingLoadEngine.ts';
import type { WorkoutReadiness } from '../intelligence/types.ts';
import type { WorkoutHistoryEntry } from '../models/WorkoutHistory.ts';

describe('Sprint 3.7 — Wearable Intelligence & Recovery Integration Suite', () => {
  let recoveryEngine: RecoveryDecisionEngine;
  let novaService: NovaWorkoutService;
  let trainingLoadEngine: TrainingLoadEngine;

  beforeEach(() => {
    recoveryEngine = new RecoveryDecisionEngine();
    novaService = new NovaWorkoutService();
    trainingLoadEngine = new TrainingLoadEngine();
  });

  // ==========================================================================
  // 1. DUAL-MODE RECOVERY DECISION ENGINE
  // ==========================================================================
  describe('1. Dual-Mode Recovery Decision Engine', () => {
    it('operates in Mode 1 (Workout-Only) when no wearable biometrics are provided', () => {
      const workoutOnlyReadiness: WorkoutReadiness = {
        sleepHours: 8.0,
        sorenessScore: 2,
        fatigueScore: 2,
        consecutiveTrainingDays: 1,
        acuteWorkload: 8000,
        chronicWorkload: 7500,
      };

      const decision = recoveryEngine.evaluateRecovery(workoutOnlyReadiness);
      expect(decision.wearableEnriched).toBe(false);
      expect(decision.dataSourcesUsed).toEqual(['workout_history']);
      expect(decision.readinessScore).toBeGreaterThanOrEqual(80);
      expect(decision.action).toBe('train_normal');
    });

    it('operates in Mode 2 (Wearable-Enriched) incorporating HRV, Resting HR, and Deep Sleep', () => {
      const wearableReadiness: WorkoutReadiness = {
        sleepHours: 7.5,
        sorenessScore: 3,
        fatigueScore: 3,
        consecutiveTrainingDays: 1,
        wearableMetrics: {
          hrvRmssdMs: 42,
          hrvBaselineMs: 65,
          hrvStatus: 'suppressed',
          restingHeartRateBpm: 63,
          restingHeartRateBaselineBpm: 55, // +8 bpm elevated
          deepSleepPct: 9, // low deep sleep
          recoveryScore: 52,
        },
      };

      const decision = recoveryEngine.evaluateRecovery(wearableReadiness);
      expect(decision.wearableEnriched).toBe(true);
      expect(decision.dataSourcesUsed).toContain('workout_history');
      expect(decision.dataSourcesUsed).toContain('hrv');
      expect(decision.dataSourcesUsed).toContain('resting_hr');

      // Suppressed HRV and elevated HR should penalize readiness score significantly
      expect(decision.readinessScore).toBeLessThan(70);
      expect(decision.action).toBe('reduce_intensity');
      expect(decision.intensityModifier).toBeLessThan(1.0);
      expect(decision.primaryFactors.some(f => f.includes('HRV suppression'))).toBe(true);
      expect(decision.primaryFactors.some(f => f.includes('Resting heart rate elevated'))).toBe(true);
    });

    it('boosts readiness score when wearable signals indicate superior recovery (elevated HRV, low RHR)', () => {
      const primedReadiness: WorkoutReadiness = {
        sleepHours: 8.5,
        sorenessScore: 2,
        fatigueScore: 2,
        consecutiveTrainingDays: 0,
        wearableMetrics: {
          hrvRmssdMs: 82,
          hrvBaselineMs: 65,
          hrvStatus: 'elevated',
          restingHeartRateBpm: 50,
          restingHeartRateBaselineBpm: 54,
          deepSleepPct: 24,
          recoveryScore: 94,
        },
      };

      const decision = recoveryEngine.evaluateRecovery(primedReadiness);
      expect(decision.wearableEnriched).toBe(true);
      expect(decision.readinessScore).toBeGreaterThanOrEqual(90);
      expect(decision.recommendedIntensity).toBe('full');
      expect(decision.primaryFactors.some(f => f.includes('Elevated HRV detected'))).toBe(true);
    });
  });

  // ==========================================================================
  // 2. NOVA RECOVERY BRIEF SYNTHESIS
  // ==========================================================================
  describe('2. Nova Recovery Brief Synthesis', () => {
    it('synthesizes a comprehensive recovery brief with transparent signal attribution', async () => {
      const readiness: WorkoutReadiness = {
        sleepHours: 6.0,
        sorenessScore: 4,
        fatigueScore: 5,
        consecutiveTrainingDays: 2,
        wearableMetrics: {
          hrvRmssdMs: 48,
          hrvBaselineMs: 65,
          hrvStatus: 'suppressed',
          restingHeartRateBpm: 60,
          restingHeartRateBaselineBpm: 55,
          deepSleepPct: 14,
        },
      };

      const brief = await novaService.getRecoveryBrief(readiness);

      expect(brief).toBeDefined();
      expect(brief.readinessScore).toBeGreaterThan(0);
      expect(brief.readinessScore).toBeLessThan(80);
      expect(['moderate', 'low', 'rest_recommended']).toContain(brief.readinessState);
      expect(brief.headline).toBeDefined();
      expect(brief.explanation).toBeDefined();
      expect(brief.contributingSignals.length).toBeGreaterThan(0);
      expect(brief.contributingSignals.some(s => s.includes('HRV status: suppressed'))).toBe(true);
      expect(brief.contributingSignals.some(s => s.includes('Resting HR: 60 BPM'))).toBe(true);
      expect(brief.dataSources).toContain('workout_history');
      expect(brief.dataSources).toContain('hrv');
      expect(brief.dataSources).toContain('resting_hr');
      expect(brief.dataSources).toContain('sleep');
      expect(brief.recommendedProtocols.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // 3. TRAINING LOAD ENGINE ENRICHED STRAIN & RECOVERY WARNINGS
  // ==========================================================================
  describe('3. Training Load Engine Health Integration', () => {
    it('calculates acute/chronic workload, training strain, and incorporates health recovery context', () => {
      const now = Date.now();
      const oneDay = 86400000;

      // Simulate 4 sessions over the past 2 weeks
      const history: WorkoutHistoryEntry[] = [
        {
          id: 'w1',
          sessionId: 's1',
          workoutId: 'wk1',
          workoutName: 'Push A',
          date: new Date(now - oneDay * 2).toISOString().split('T')[0],
          completedAt: now - oneDay * 2,
          durationSeconds: 3600,
          totalVolume: 6000,
          totalSets: 15,
          completedSets: 15,
          exercisesCount: 4,
          personalRecordsCount: 0,
          exercises: [],
        },
        {
          id: 'w2',
          sessionId: 's2',
          workoutId: 'wk1',
          workoutName: 'Pull A',
          date: new Date(now - oneDay * 4).toISOString().split('T')[0],
          completedAt: now - oneDay * 4,
          durationSeconds: 3600,
          totalVolume: 6500,
          totalSets: 16,
          completedSets: 16,
          exercisesCount: 4,
          personalRecordsCount: 0,
          exercises: [],
        },
        {
          id: 'w3',
          sessionId: 's3',
          workoutId: 'wk1',
          workoutName: 'Legs A',
          date: new Date(now - oneDay * 10).toISOString().split('T')[0],
          completedAt: now - oneDay * 10,
          durationSeconds: 3600,
          totalVolume: 7000,
          totalSets: 18,
          completedSets: 18,
          exercisesCount: 4,
          personalRecordsCount: 0,
          exercises: [],
        },
        {
          id: 'w4',
          sessionId: 's4',
          workoutId: 'wk1',
          workoutName: 'Upper B',
          date: new Date(now - oneDay * 18).toISOString().split('T')[0],
          completedAt: now - oneDay * 18,
          durationSeconds: 3600,
          totalVolume: 6000,
          totalSets: 15,
          completedSets: 15,
          exercisesCount: 4,
          personalRecordsCount: 0,
          exercises: [],
        },
      ];

      // Test with optimal health context
      const optimalLoad = trainingLoadEngine.calculateTrainingLoad(history, now, {
        recoveryScore: 88,
        hrvTrend: 'stable',
        restingHeartRateDelta: 0,
        sleepDurationHours: 8,
      });

      expect(optimalLoad.acuteTrainingLoad).toBe(12500); // 6000 + 6500 in past 7 days
      expect(optimalLoad.trainingStrain).toBeGreaterThan(0);
      expect(optimalLoad.recoveryAdjustedTrainingLoad).toBe(Math.round(12500 * 0.88));
      expect(optimalLoad.isUnderRecoveryWarning).toBe(false);

      // Test with compromised health context (suppressed HRV / poor recovery)
      const compromisedLoad = trainingLoadEngine.calculateTrainingLoad(history, now, {
        recoveryScore: 45,
        hrvTrend: 'declining',
        restingHeartRateDelta: 6,
        sleepDurationHours: 5,
      });

      expect(compromisedLoad.isUnderRecoveryWarning).toBe(true);
      expect(compromisedLoad.recoveryAdjustedTrainingLoad).toBe(Math.round(12500 * 0.45));
    });
  });
});
