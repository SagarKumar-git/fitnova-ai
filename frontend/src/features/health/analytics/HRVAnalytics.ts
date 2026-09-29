/**
 * FitNova AI — HRV Analytics Engine
 * Analyzes heart rate variability (RMSSD) trends, baseline deviations,
 * and autonomic nervous system status.
 * Pure TypeScript. Non-medical fitness guidance.
 */

import type { HRVSample } from '../models/HRVSample.ts';
import type { HRVStatus } from '../types/healthEnums.ts';

export interface HRVAnalysisResult {
  latestRmssdMs: number;
  baselineRmssdMs: number;
  deviationPct: number;
  status: HRVStatus;
  trend: 'improving' | 'stable' | 'declining';
  sevenDayAverageMs: number;
  explanation: string;
}

export class HRVAnalytics {
  /**
   * Evaluates autonomic recovery status from HRV samples.
   *
   * @param samples Chronological or unsorted HRV records
   * @param defaultBaseline Fallback baseline if insufficient history (defaults to 55ms)
   */
  analyzeHRV(samples: HRVSample[], defaultBaseline: number = 55): HRVAnalysisResult {
    if (!samples || samples.length === 0) {
      return {
        latestRmssdMs: defaultBaseline,
        baselineRmssdMs: defaultBaseline,
        deviationPct: 0,
        status: 'optimal',
        trend: 'stable',
        sevenDayAverageMs: defaultBaseline,
        explanation: 'Baseline HRV calibrated. Autonomic balance appears steady.',
      };
    }

    const sorted = [...samples].sort((a, b) => a.timestamp - b.timestamp);
    const latest = sorted[sorted.length - 1];

    // Compute 7-day rolling window
    const now = latest.timestamp;
    const sevenDaysAgo = now - 7 * 86_400_000;
    const recentSamples = sorted.filter((s) => s.timestamp >= sevenDaysAgo);

    const sevenDayAverageMs =
      recentSamples.length > 0
        ? Math.round(
            (recentSamples.reduce((sum, s) => sum + s.rmssdMs, 0) / recentSamples.length) * 10
          ) / 10
        : latest.rmssdMs;

    // Baseline: 30-day average or default
    const thirtyDaysAgo = now - 30 * 86_400_000;
    const baselineSamples = sorted.filter((s) => s.timestamp >= thirtyDaysAgo);
    const baselineRmssdMs =
      baselineSamples.length >= 3
        ? Math.round(
            (baselineSamples.reduce((sum, s) => sum + s.rmssdMs, 0) / baselineSamples.length) * 10
          ) / 10
        : defaultBaseline;

    const deviationPct =
      baselineRmssdMs > 0
        ? Math.round(((latest.rmssdMs - baselineRmssdMs) / baselineRmssdMs) * 1000) / 10
        : 0;

    let status: HRVStatus = 'optimal';
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    let explanation = 'HRV is within normal autonomic baseline variance.';

    if (deviationPct < -12) {
      status = 'suppressed';
      trend = 'declining';
      explanation = `HRV is suppressed (${deviationPct}% below baseline). Parasympathetic tone is reduced, indicating systemic fatigue or stress.`;
    } else if (deviationPct > 15) {
      status = 'elevated';
      trend = 'improving';
      explanation = `HRV is elevated (+${deviationPct}% above baseline). High parasympathetic activity detected; system is primed for training.`;
    } else {
      status = 'optimal';
      trend = deviationPct >= 0 ? 'improving' : 'stable';
      explanation = `HRV is balanced (${deviationPct >= 0 ? '+' : ''}${deviationPct}% vs baseline). Normal neuro-cardiac homeostasis.`;
    }

    return {
      latestRmssdMs: latest.rmssdMs,
      baselineRmssdMs,
      deviationPct,
      status,
      trend,
      sevenDayAverageMs,
      explanation,
    };
  }
}
