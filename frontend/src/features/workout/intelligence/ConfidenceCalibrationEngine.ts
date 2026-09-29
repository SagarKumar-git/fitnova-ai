import type {
  NormalizedHealthSignal,
  DataFreshnessState,
} from '../../health/types/healthContracts.ts';

export interface ConfidenceResult {
  confidence: number;
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  reasons: string[];
}

export interface HistoricalStats {
  successRate: number;
  totalDecisions: number;
  acceptanceRate: number;
}

export class ConfidenceCalibrationEngine {
  /**
   * Calculates freshness state based on the age in milliseconds.
   */
  public calculateFreshness(ageMs: number): DataFreshnessState {
    if (ageMs < 2 * 60 * 60 * 1000) return 'fresh';
    if (ageMs < 8 * 60 * 60 * 1000) return 'aging';
    if (ageMs < 24 * 60 * 60 * 1000) return 'stale';
    return 'unavailable';
  }

  /**
   * Calculates a base confidence score (0.0 to 1.0) based on data freshness.
   */
  public getFreshnessConfidencePenalty(freshness: DataFreshnessState): number {
    switch (freshness) {
      case 'fresh':
        return 1.0;
      case 'aging':
        return 0.7;
      case 'stale':
        return 0.3;
      case 'unavailable':
        return 0.0;
    }
  }

  /**
   * Calculates confidence based on multiple supporting signals.
   */
  public calculateAggregatedConfidence(
    supportingSignals: NormalizedHealthSignal<any>[],
    conflictingSignals: NormalizedHealthSignal<any>[],
    history?: HistoricalStats,
    formQualityScore?: number // 0 to 1
  ): ConfidenceResult {
    const reasons: string[] = [];

    if (supportingSignals.length === 0) {
      return { confidence: 0.0, level: 'LOW', reasons: ['No supporting signals available.'] };
    }

    // Base confidence is the average freshness confidence of supporting signals
    const baseConfidence =
      supportingSignals.reduce(
        (sum, sig) => sum + this.getFreshnessConfidencePenalty(sig.freshness) * sig.confidence,
        0
      ) / supportingSignals.length;

    reasons.push(`Base confidence from ${supportingSignals.length} supporting signals is ${(baseConfidence * 100).toFixed(1)}%.`);

    // Bonus for having multiple supporting signals
    let supportBonus = 0;
    if (supportingSignals.length > 1) {
       supportBonus = Math.min(0.2, (supportingSignals.length - 1) * 0.1);
       reasons.push(`+${(supportBonus * 100).toFixed(1)}% bonus for multiple supporting signals.`);
    }

    // Penalty for conflicting signals
    let conflictPenalty = 0;
    if (conflictingSignals.length > 0) {
        conflictPenalty = conflictingSignals.length * 0.15;
        reasons.push(`-${(conflictPenalty * 100).toFixed(1)}% penalty for ${conflictingSignals.length} conflicting signals.`);
    }

    // Historical modifiers
    let historyModifier = 0;
    if (history && history.totalDecisions >= 3) {
       if (history.successRate > 0.8) {
           historyModifier += 0.1;
           reasons.push(`+10.0% bonus for high historical success rate (${(history.successRate * 100).toFixed(0)}%).`);
       } else if (history.successRate < 0.5) {
           historyModifier -= 0.15;
           reasons.push(`-15.0% penalty for low historical success rate (${(history.successRate * 100).toFixed(0)}%).`);
       }

       if (history.acceptanceRate > 0.8) {
           historyModifier += 0.05;
           reasons.push(`+5.0% bonus for high user acceptance rate.`);
       } else if (history.acceptanceRate < 0.5) {
           historyModifier -= 0.1;
           reasons.push(`-10.0% penalty for low user acceptance rate.`);
       }
    }

    // Form Quality
    let formModifier = 0;
    if (formQualityScore !== undefined) {
        if (formQualityScore < 0.6) {
             formModifier -= 0.2;
             reasons.push(`-20.0% penalty for poor recent form quality.`);
        }
    }

    const finalConfidence = Math.max(0.0, Math.min(1.0, baseConfidence + supportBonus - conflictPenalty + historyModifier + formModifier));
    const level = this.getConfidenceBand(finalConfidence);
    
    return {
      confidence: finalConfidence,
      level,
      reasons
    };
  }

  /**
   * Maps a raw value to a NormalizedHealthSignal, applying freshness and confidence.
   */
  public normalizeSignal<T>(
    value: T,
    capturedAt: number,
    source: string,
    baseConfidence: number = 1.0
  ): NormalizedHealthSignal<T> {
    const ageMs = Date.now() - capturedAt;
    const freshness = this.calculateFreshness(ageMs);
    const freshnessPenalty = this.getFreshnessConfidencePenalty(freshness);
    
    return {
      value,
      capturedAt,
      source,
      freshness,
      confidence: baseConfidence * freshnessPenalty,
    };
  }

  /**
   * Provides descriptive confidence bands.
   */
  public getConfidenceBand(confidence: number): 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' {
    if (confidence < 0.4) return 'LOW';
    if (confidence < 0.7) return 'MODERATE';
    if (confidence < 0.9) return 'HIGH';
    return 'VERY_HIGH';
  }
}
