import { describe, it, expect, beforeEach } from 'vitest';
import { AdaptiveTrainingEngine } from '../intelligence/AdaptiveTrainingEngine.ts';
import { AdaptiveWorkoutModifier } from '../intelligence/AdaptiveWorkoutModifier.ts';
import type { AdaptiveTrainingInput } from '../intelligence/types/adaptiveTraining.ts';
import type { WorkoutExercise } from '../models/WorkoutExercise.ts';

describe('Sprint 3.8 — Adaptive Training System', () => {
  let engine: AdaptiveTrainingEngine;
  let modifier: AdaptiveWorkoutModifier;

  beforeEach(() => {
    engine = new AdaptiveTrainingEngine();
    modifier = new AdaptiveWorkoutModifier();
  });

  describe('AdaptiveTrainingEngine', () => {
    const defaultPerformance = {
      missedRepsCount: 0,
      personalRecordsLast7Days: 1,
      averageCompletionRate: 0.95,
      consecutiveWorkoutDays: 2,
      weeklyWorkoutCount: 4, // 100% consistency
      targetWeeklyWorkouts: 4,
    };

    const defaultHealth = {
      hrvStatus: 'optimal' as const,
      sleepQuality: 'optimal' as const,
      muscleSoreness: 1,
      systemicFatigue: 1,
      wearableAvailable: true,
      recoveryDataFreshness: { timestamp: Date.now(), ageMs: 0, state: 'fresh' as const },
      currentTimestamp: Date.now(),
    };

    it('should recommend full progression when recovery is optimal and load is acute', () => {
      const input: AdaptiveTrainingInput = {
        ...defaultHealth,
        recoveryScore: 100,
        restingHeartRateDelta: -5,
        hrvStatus: 'elevated',
        acwr: 1.0,
        formQuality: { averageFormScore: 95, recentWarningCount: 0, repeatedIssues: [] },
        performance: { ...defaultPerformance, recentRpeHistory: [6, 6, 6] },
      };

      const decision = engine.evaluateTrainingDecision(input);

      expect(decision.recommendedAction).toBe('increase_intensity');
      expect(decision.recommendedIntensity).toBe('high');
      expect(decision.volumeAdjustmentPercent).toBeGreaterThanOrEqual(0);
      expect(decision.weightAdjustmentPercent).toBeGreaterThanOrEqual(0);
      expect(decision.warnings).toHaveLength(0);
    });

    it('should reduce volume and weight when recovery is severely compromised', () => {
      const input: AdaptiveTrainingInput = {
        ...defaultHealth,
        recoveryScore: 30, // Severely compromised
        restingHeartRateDelta: 10,
        hrvStatus: 'suppressed',
        hrvTrendPct: -15,
        sleepQuality: 'poor',
        muscleSoreness: 8,
        systemicFatigue: 9,
        acwr: 1.8, 
        performance: { ...defaultPerformance, recentRpeHistory: [9, 9.5, 10] },
      };

      const decision = engine.evaluateTrainingDecision(input);

      expect(['recovery_workout', 'reduce_intensity', 'reduce_volume', 'rest']).toContain(decision.recommendedAction);
      expect(decision.volumeAdjustmentPercent).toBeLessThan(0); 
      expect(decision.weightAdjustmentPercent).toBeLessThan(0); 
      expect(decision.requiresUserConfirmation).toBe(true);
    });

    it('should apply safety clamps to modifiers to prevent extreme adjustments', () => {
      const input: AdaptiveTrainingInput = {
        ...defaultHealth,
        recoveryScore: 10, 
        restingHeartRateDelta: 20,
        hrvStatus: 'suppressed',
        sleepQuality: 'poor',
        muscleSoreness: 10,
        systemicFatigue: 10,
        acwr: 2.0,
        performance: { ...defaultPerformance, recentRpeHistory: [10, 10] },
      };

      const decision = engine.evaluateTrainingDecision(input);

      // Even with extreme inputs, modifiers shouldn't drop below the safety limits
      expect(decision.volumeAdjustmentPercent).toBeGreaterThanOrEqual(-40);
      expect(decision.weightAdjustmentPercent).toBeGreaterThanOrEqual(-20);
    });

    it('should adjust focus to form_correction if form history is poor despite good recovery', () => {
      const input: AdaptiveTrainingInput = {
        ...defaultHealth,
        recoveryScore: 100,
        restingHeartRateDelta: -2,
        hrvStatus: 'optimal',
        sleepQuality: 'optimal',
        muscleSoreness: 1,
        systemicFatigue: 1,
        acwr: 1.0,
        formQuality: { averageFormScore: 60, recentWarningCount: 3, repeatedIssues: ['depth'] },
        performance: { ...defaultPerformance, recentRpeHistory: [6, 6, 6] },
      };

      const decision = engine.evaluateTrainingDecision(input);

      expect(decision.recommendedAction).toBe('reduce_intensity');
      expect(decision.weightAdjustmentPercent).toBeLessThan(0); // Slight deload to fix form
    });
  });

  describe('AdaptiveWorkoutModifier', () => {
    const defaultPerformance = {
      missedRepsCount: 0,
      personalRecordsLast7Days: 1,
      averageCompletionRate: 0.95,
      consecutiveWorkoutDays: 2,
      weeklyWorkoutCount: 4, // 100% consistency
      targetWeeklyWorkouts: 4,
    };

    const defaultHealth = {
      hrvStatus: 'optimal' as const,
      sleepQuality: 'optimal' as const,
      muscleSoreness: 1,
      systemicFatigue: 1,
      wearableAvailable: true,
      recoveryDataFreshness: { timestamp: Date.now(), ageMs: 0, state: 'fresh' as const },
      currentTimestamp: Date.now(),
    };

    const mockExercises: WorkoutExercise[] = [
      {
        id: 'we1',
        exerciseId: 'e1',
        exerciseName: 'Barbell Squat',
        order: 1,
        targetSets: 3,
        targetReps: 10,
        targetWeight: 100,
        restSeconds: 90,
        sets: []
      },
      {
        id: 'we2',
        exerciseId: 'e2',
        exerciseName: 'Leg Extension',
        order: 2,
        targetSets: 3,
        targetReps: 12,
        targetWeight: 50,
        restSeconds: 60,
        sets: []
      }
    ];

    it('should not mutate original workout array or objects', () => {
      const decision = engine.evaluateTrainingDecision({
        ...defaultHealth,
        recoveryScore: 50,
        restingHeartRateDelta: 2,
        hrvStatus: 'unknown',
        sleepQuality: 'moderate',
        muscleSoreness: 4,
        systemicFatigue: 4,
        acwr: 1.0,
        performance: { ...defaultPerformance, recentRpeHistory: [8] },
      });

      const plan = modifier.generateModifiedPlan(mockExercises, decision);

      // Ensure original data is untouched
      expect(mockExercises[0].targetWeight).toBe(100);
      expect(mockExercises[0].targetSets).toBe(3);
      
      // Ensure references are broken
      expect(plan.modifiedExercises).not.toBe(mockExercises);
      expect(plan.modifiedExercises[0]).not.toBe(mockExercises[0]);
    });

    it('should apply volume reductions (set dropping) for recovery focus', () => {
      // Force a decision that requires volume reduction
      const decision = engine.evaluateTrainingDecision({
        ...defaultHealth,
        recoveryScore: 30, // Low recovery
        restingHeartRateDelta: 10,
        hrvStatus: 'suppressed',
        sleepQuality: 'poor',
        muscleSoreness: 7,
        systemicFatigue: 8,
        acwr: 1.5,
        performance: { ...defaultPerformance, recentRpeHistory: [9, 10] },
      });

      // Volume adjustment should be negative
      const plan = modifier.generateModifiedPlan(mockExercises, decision);

      const totalOriginalSets = mockExercises.reduce((acc, ex) => acc + ex.targetSets, 0);
      const totalModifiedSets = plan.modifiedExercises.reduce((acc, ex) => acc + ex.targetSets, 0);

      expect(totalModifiedSets).toBeLessThan(totalOriginalSets);
    });

    it('should apply weight reductions and preserve sets if weightAdjustmentPercent is low', () => {
       const decision = engine.evaluateTrainingDecision({
        ...defaultHealth,
        recoveryScore: 100, 
        restingHeartRateDelta: -2,
        hrvStatus: 'optimal',
        sleepQuality: 'optimal',
        muscleSoreness: 1,
        systemicFatigue: 1,
        acwr: 1.0,
        formQuality: { averageFormScore: 60, recentWarningCount: 3, repeatedIssues: ['depth'] },
        performance: { ...defaultPerformance, recentRpeHistory: [6, 6] },
      });

      const plan = modifier.generateModifiedPlan(mockExercises, decision);

      // Weight for squat should be reduced from 100
      expect(plan.modifiedExercises[0].targetWeight).toBeLessThan(100);
      // Leg extension weight reduced from 50
      expect(plan.modifiedExercises[1].targetWeight).toBeLessThan(50);
      // Sets shouldn't be dropped since we mainly reduce intensity here
      expect(plan.modifiedExercises[0].targetSets).toBe(3);
    });

    it('should calculate adaptive vs planned volume correctly', () => {
      const decision = engine.evaluateTrainingDecision({
        ...defaultHealth,
        recoveryScore: 50,
        restingHeartRateDelta: 0,
        hrvStatus: 'unknown',
        sleepQuality: 'moderate',
        muscleSoreness: 4,
        systemicFatigue: 4,
        acwr: 1.0,
        performance: { ...defaultPerformance, recentRpeHistory: [8] },
      });

      // Override decision manually to guarantee reduction
      decision.volumeAdjustmentPercent = -20;
      decision.weightAdjustmentPercent = -10;

      const plan = modifier.generateModifiedPlan(mockExercises, decision);

      // Planned volume: (100*10)*3 + (50*12)*3 = 3000 + 1800 = 4800
      expect(plan.plannedVolumeKg).toBe(4800);
      expect(plan.adaptiveVolumeKg).toBeLessThan(4800);
    });
  });
});
