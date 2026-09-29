/**
 * FitNova AI — Health Repository Interface
 * Contract for caching, storing, and fetching normalized health and recovery data.
 * Zero UI/React dependencies.
 */

import type {
  HeartRateSample,
  HRVSample,
  SleepSession,
  DailyActivity,
  RecoveryMetrics,
} from '../models/index.ts';
import type { NormalizedHealthDataset } from '../types/healthContracts.ts';

export interface IHealthRepository {
  getLatestHeartRate(): Promise<HeartRateSample | null>;
  getHeartRateHistory(): Promise<HeartRateSample[]>;
  saveHeartRateSamples(samples: HeartRateSample[]): Promise<void>;

  getLatestHRV(): Promise<HRVSample | null>;
  getHRVHistory(): Promise<HRVSample[]>;
  saveHRVSamples(samples: HRVSample[]): Promise<void>;

  getLatestSleep(): Promise<SleepSession | null>;
  getSleepHistory(): Promise<SleepSession[]>;
  saveSleepSessions(sessions: SleepSession[]): Promise<void>;

  getLatestActivity(): Promise<DailyActivity | null>;
  getActivityHistory(): Promise<DailyActivity[]>;
  saveActivities(activities: DailyActivity[]): Promise<void>;

  getLatestRecoveryMetrics(): Promise<RecoveryMetrics | null>;
  saveRecoveryMetrics(metrics: RecoveryMetrics): Promise<void>;

  getCachedDataset(): Promise<NormalizedHealthDataset | null>;
  saveCachedDataset(dataset: NormalizedHealthDataset): Promise<void>;
  clearCache(): Promise<void>;
}
