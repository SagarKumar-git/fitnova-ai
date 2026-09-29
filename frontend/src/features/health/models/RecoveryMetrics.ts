/**
 * FitNova AI — Recovery Metrics Domain Model
 * Composite physiological readiness indicators derived from wearable biometrics.
 * Zero UI/React dependencies. Non-medical fitness guidance.
 */

import type { RecoveryReadinessState, HRVStatus } from '../types/healthEnums.ts';

export interface RecoveryMetrics {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  recoveryScore: number; // 0 to 100
  readinessState: RecoveryReadinessState; // 'optimal' | 'moderate' | 'low' | 'rest_recommended'
  recommendedIntensity: 'full' | 'moderate' | 'light' | 'active_recovery' | 'none';
  intensityModifier: number; // e.g. 1.0, 0.8, 0.6, 0.0

  // Biometric contributors
  restingHeartRateBpm: number;
  restingHeartRateBaselineBpm: number;
  rhrDeltaFromBaseline: number; // e.g. +4 bpm
  hrvRmssdMs: number;
  hrvBaselineMs: number;
  hrvStatus: HRVStatus;
  sleepHours: number;
  sleepEfficiencyPct: number;
  deepSleepPct: number;
  remSleepPct: number;

  contributingFactors: string[];
  recoveryWarnings: string[];
  confidenceLevel: number; // 0.0 to 1.0
  dataSourcesUsed: Array<'workout_history' | 'hrv' | 'resting_hr' | 'sleep' | 'activity'>;
}
