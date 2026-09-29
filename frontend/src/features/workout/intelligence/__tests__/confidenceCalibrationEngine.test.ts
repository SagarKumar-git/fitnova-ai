import { describe, it, expect } from 'vitest';
import { ConfidenceCalibrationEngine } from '../ConfidenceCalibrationEngine';
import type { NormalizedHealthSignal } from '../../../health/types/healthContracts';

describe('ConfidenceCalibrationEngine', () => {
  const engine = new ConfidenceCalibrationEngine();

  it('should penalize confidence for stale data', () => {
    const ageMs = 12 * 60 * 60 * 1000; // 12 hours (stale)
    const freshness = engine.calculateFreshness(ageMs);
    expect(freshness).toBe('stale');

    const penalty = engine.getFreshnessConfidencePenalty(freshness);
    expect(penalty).toBe(0.3);
  });

  it('should calculate aggregated confidence with supporting signals and history', () => {
    const supporting: NormalizedHealthSignal<any>[] = [
      { value: 100, capturedAt: Date.now(), source: 'mock', freshness: 'fresh', confidence: 1.0 },
      { value: 50, capturedAt: Date.now(), source: 'mock', freshness: 'fresh', confidence: 1.0 }
    ];
    
    const conflicting: NormalizedHealthSignal<any>[] = [];
    
    const history = {
      successRate: 0.9, // 90%
      totalDecisions: 10,
      acceptanceRate: 0.9
    };

    const result = engine.calculateAggregatedConfidence(supporting, conflicting, history, 1.0);
    
    // Base: 1.0
    // Bonus for multiple: 0.1
    // Conflict: 0
    // History success bonus: +0.1
    // History acceptance bonus: +0.05
    // Final expected > 1.0 but clamped to 1.0
    expect(result.confidence).toBe(1.0);
    expect(result.level).toBe('VERY_HIGH');
    expect(result.reasons).toContain('+10.0% bonus for high historical success rate (90%).');
  });

  it('should apply penalty for poor form quality', () => {
    const supporting: NormalizedHealthSignal<any>[] = [
      { value: 100, capturedAt: Date.now(), source: 'mock', freshness: 'fresh', confidence: 1.0 }
    ];
    
    const result = engine.calculateAggregatedConfidence(supporting, [], undefined, 0.4);
    
    // Base: 1.0
    // Form penalty: -0.2
    // Final: 0.8
    expect(result.confidence).toBe(0.8);
    expect(result.level).toBe('HIGH');
    expect(result.reasons).toContain('-20.0% penalty for poor recent form quality.');
  });
});
