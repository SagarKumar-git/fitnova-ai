import { describe, it, expect } from 'vitest';
import { AdaptiveSafetyGuard } from '../AdaptiveSafetyGuard.ts';
import type { AdaptiveSafetyContext, FormWarningState } from '../AdaptiveSafetyGuard.ts';
import type { WorkoutSet } from '../../models/WorkoutSet.ts';
import type { AdaptivePreferences } from '../types/adaptivePreferences.ts';

describe('AdaptiveSafetyGuard', () => {
  const mockContext: AdaptiveSafetyContext = {
    maxWeightIncreaseKg: 5,
    maxRepIncrease: 2,
    adaptiveConfidence: 0.8,
    freshness: 'fresh'
  };

  const mockOriginalSet: WorkoutSet = {
    id: 'set-1',
    setNumber: 1,
    type: 'normal',
    targetReps: 8,
    targetWeight: 100,
    rpe: 8,
    completed: false
  };

  const mockPreferences: AdaptivePreferences = {
    userId: 'user-1',
    adaptiveTrainingEnabled: true,
    automaticIntensityReductionAllowed: true,
    automaticExerciseSubstitutionAllowed: true,
    progressiveOverloadRecommendationsEnabled: true,
    minimumConfidenceRequired: 'MODERATE',
    notificationPreferences: {
      notifyOnWorkoutChanged: true,
      notifyOnIntensityReduced: true,
      notifyOnHighConfidenceProgression: true,
      notifyOnStaleHealthData: true
    }
  };

  const mockFormWarnings: FormWarningState = {
    hasActiveWarning: false,
    warnings: []
  };

  it('should allow safe progression', () => {
    const result = AdaptiveSafetyGuard.validateProgression(
      'INCREASE_LOAD',
      mockOriginalSet,
      102.5,
      8,
      mockContext,
      mockPreferences,
      mockFormWarnings
    );

    expect(result.isSafe).toBe(true);
    expect(result.clampedPlan?.weight).toBe(102.5);
  });

  it('should clamp weight increase to max allowed limit', () => {
    const result = AdaptiveSafetyGuard.validateProgression(
      'INCREASE_LOAD',
      mockOriginalSet,
      110, // Attempting to increase by 10kg
      8,
      mockContext,
      mockPreferences,
      mockFormWarnings
    );

    expect(result.isSafe).toBe(true);
    expect(result.reasons).toContain('Proposed weight increase clamped to max safety limit (5kg).');
    expect(result.clampedPlan?.weight).toBe(105); // Clamped to 100 + 5
  });

  it('should clamp rep increase to max allowed limit', () => {
    const result = AdaptiveSafetyGuard.validateProgression(
      'INCREASE_LOAD',
      mockOriginalSet,
      100,
      12, // Attempting to increase by 4 reps
      mockContext,
      mockPreferences,
      mockFormWarnings
    );

    expect(result.isSafe).toBe(true);
    expect(result.reasons).toContain('Proposed rep increase clamped to max safety limit (2 reps).');
    expect(result.clampedPlan?.reps).toBe(10); // Clamped to 8 + 2
  });

  it('should reject progression if confidence is low', () => {
    const lowConfidenceContext = { ...mockContext, adaptiveConfidence: 0.3 };
    const result = AdaptiveSafetyGuard.validateProgression(
      'INCREASE_LOAD',
      mockOriginalSet,
      102.5,
      8,
      lowConfidenceContext,
      mockPreferences,
      mockFormWarnings
    );

    expect(result.isSafe).toBe(false);
    expect(result.reasons).toContain('Confidence is too low or data is stale to apply progression.');
  });

  it('should reject progression if form warnings exist', () => {
    const activeFormWarnings = { hasActiveWarning: true, warnings: ['Knee valgus'] };
    const result = AdaptiveSafetyGuard.validateProgression(
      'INCREASE_LOAD',
      mockOriginalSet,
      102.5,
      8,
      mockContext,
      mockPreferences,
      activeFormWarnings
    );

    expect(result.isSafe).toBe(false);
    expect(result.reasons).toContain('Live form warnings detected. Progression halted.');
  });
  
  it('should reject if adaptive training is disabled', () => {
    const disabledPrefs = { ...mockPreferences, adaptiveTrainingEnabled: false };
    const result = AdaptiveSafetyGuard.validateProgression(
      'INCREASE_LOAD',
      mockOriginalSet,
      102.5,
      8,
      mockContext,
      disabledPrefs,
      mockFormWarnings
    );

    expect(result.isSafe).toBe(false);
    expect(result.reasons).toContain('Adaptive training is disabled in preferences.');
  });
});
