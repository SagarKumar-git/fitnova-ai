import type { AdaptiveDecisionRecord } from './repository/IAdaptiveDecisionRepository.ts';
import type { HistoricalStats } from './ConfidenceCalibrationEngine.ts';

export class AdaptiveLearningEngine {
  /**
   * Compares planned, adaptive, and actual workout outcomes to classify the adaptation's success.
   */
  public evaluateOutcome(
    decision: AdaptiveDecisionRecord,
    actualCompletedWeight: number,
    actualCompletedReps: number,
    actualRPE: number
  ): AdaptiveDecisionRecord['resultingWorkoutOutcome'] {
    if (decision.userAction !== 'accepted') {
      return 'neutral'; // If they didn't accept the recommendation, we can't reliably evaluate it as an AI success/failure.
    }

    const adaptivePlan = decision.adaptiveWorkoutPlan;
    const targetWeight = adaptivePlan?.weight ?? 0;
    const targetReps = adaptivePlan?.reps ?? 0;

    // If the user couldn't even complete the reduced adaptation, it was STILL too aggressive
    if ((targetWeight > 0 && actualCompletedWeight < targetWeight) || actualCompletedReps < targetReps || actualRPE >= 9.5) {
      return 'adaptation_too_aggressive';
    }

    // If the user blew past the target (e.g. they did way more reps than asked) or RPE was super low, 
    // we may have been too conservative.
    if (actualCompletedReps > targetReps + 2 || actualRPE <= 5.0) {
      return 'adaptation_too_conservative';
    }

    // If they completed exactly what was asked, and RPE was reasonable, it was successful
    if (actualCompletedReps >= targetReps && actualRPE > 5.0 && actualRPE < 9.5) {
      return 'adaptation_successful';
    }

    return 'insufficient_data';
  }

  /**
   * Extracts historical stats for a specific exercise given a list of past decisions.
   */
  public getHistoricalStats(decisions: AdaptiveDecisionRecord[]): HistoricalStats {
    if (decisions.length === 0) {
       return { successRate: 0, totalDecisions: 0, acceptanceRate: 0 };
    }

    let acceptedCount = 0;
    let successfulCount = 0;

    decisions.forEach(d => {
        if (d.userAction === 'accepted') {
            acceptedCount++;
            if (d.resultingWorkoutOutcome === 'adaptation_successful') {
                successfulCount++;
            }
        }
    });

    return {
        totalDecisions: decisions.length,
        successRate: acceptedCount > 0 ? (successfulCount / acceptedCount) : 0,
        acceptanceRate: decisions.length > 0 ? (acceptedCount / decisions.length) : 0
    };
  }
}
