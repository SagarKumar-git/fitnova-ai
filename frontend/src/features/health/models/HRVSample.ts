/**
 * FitNova AI — Heart Rate Variability (HRV) Sample Domain Model
 * Tracks parasympathetic autonomous nervous system recovery.
 * Zero UI/React dependencies.
 */

import type { BiometricConfidence, HRVStatus } from '../types/healthEnums.ts';

export interface HRVSample {
  id: string;
  rmssdMs: number; // Root Mean Square of Successive Differences in ms (gold standard for fitness tracking)
  sdnnMs?: number; // Standard deviation of NN intervals
  timestamp: number;
  baselineDeviationPct?: number; // Percentage deviation from 30-day baseline (e.g., -12% or +5%)
  status?: HRVStatus; // 'optimal' | 'suppressed' | 'elevated'
  confidence: BiometricConfidence;
  source: string;
}
