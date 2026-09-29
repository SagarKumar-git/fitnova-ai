/**
 * FitNova AI — Heart Rate Sample Domain Model
 * Strongly typed biometric pulse representation.
 * Zero UI/React dependencies.
 */

import type { BiometricConfidence, HeartRateContext } from '../types/healthEnums.ts';

export interface HeartRateSample {
  id: string;
  bpm: number;
  timestamp: number;
  source: string; // e.g., 'Apple Watch Series 9', 'Pixel Watch 2', 'Mock'
  confidence: BiometricConfidence;
  context?: HeartRateContext;
}
