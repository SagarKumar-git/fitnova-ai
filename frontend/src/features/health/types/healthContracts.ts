/**
 * FitNova AI — Health Contracts & DTOs
 * Strongly typed interface contracts for external health providers and normalization.
 * Zero UI/React dependencies.
 */

import type {
  HealthProviderType,
  HealthProviderStatus,
} from './healthEnums.ts';
import type {
  HeartRateSample,
  HRVSample,
  SleepSession,
  DailyActivity,
  RecoveryMetrics,
} from '../models/index.ts';

export interface HealthTimeRange {
  startDate: string | number; // ISO string or timestamp ms
  endDate: string | number;
}

export interface ExternalHeartRateDTO {
  bpm: number;
  timestamp: number | string;
  sourceName?: string;
  confidence?: string;
  context?: string;
}

export interface ExternalHRVDTO {
  rmssd?: number;
  sdnn?: number;
  timestamp: number | string;
  sourceName?: string;
}

export interface ExternalSleepDTO {
  startDate: string | number;
  endDate: string | number;
  durationSeconds: number;
  stages?: Array<{
    stage: string;
    startTime: string | number;
    endTime: string | number;
  }>;
  sourceName?: string;
}

export interface ExternalActivityDTO {
  date: string;
  steps: number;
  activeCalories: number;
  restingHeartRate?: number;
  sourceName?: string;
}

export interface NormalizedHealthDataset {
  heartRateSamples: HeartRateSample[];
  hrvSamples: HRVSample[];
  sleepSessions: SleepSession[];
  dailyActivity: DailyActivity[];
  latestRecovery?: RecoveryMetrics;
  lastSyncedAt: number;
  provider: HealthProviderType;
  providerStatus: HealthProviderStatus;
}

// Sprint 3.9 — Data Freshness & Confidence Validation

export type DataFreshnessState = 'fresh' | 'aging' | 'stale' | 'unavailable';

export interface DataFreshness {
  timestamp: number;
  ageMs: number;
  state: DataFreshnessState;
}

export interface NormalizedHealthSignal<T = number> {
  value: T;
  capturedAt: number;
  source: string;
  freshness: DataFreshnessState;
  confidence: number;
}

export interface ComprehensiveHealthDataset {
  hrv: NormalizedHealthSignal<number>;
  restingHeartRate: NormalizedHealthSignal<number>;
  sleepDuration: NormalizedHealthSignal<number>;
  sleepQuality: NormalizedHealthSignal<number>;
  recoveryScore: NormalizedHealthSignal<number>;
  soreness: NormalizedHealthSignal<number>;
  fatigue: NormalizedHealthSignal<number>;
  trainingLoad: NormalizedHealthSignal<number>;
  acuteChronicWorkload: NormalizedHealthSignal<number>;
  heartRate: NormalizedHealthSignal<number>;
  workoutRecoveryTime: NormalizedHealthSignal<number>;
}

