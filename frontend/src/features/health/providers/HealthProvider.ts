/**
 * FitNova AI — Health Provider Interface
 * Abstraction layer decoupling health/wearable hardware from Workout OS.
 * Zero direct native SDK imports in consumer code.
 */

import type { HealthProviderType, HealthProviderStatus, HealthSyncStatus } from '../types/healthEnums.ts';
import type {
  HeartRateSample,
  HRVSample,
  SleepSession,
  DailyActivity,
  RecoveryMetrics,
} from '../models/index.ts';
import type { HealthTimeRange } from '../types/healthContracts.ts';

export interface HealthProvider {
  readonly type: HealthProviderType;

  /**
   * Checks whether the underlying health platform is available on this device.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Requests necessary user permissions for heart rate, HRV, sleep, and activity.
   */
  requestPermissions(): Promise<HealthProviderStatus>;

  /**
   * Gets current provider connection status.
   */
  getStatus(): Promise<HealthProviderStatus>;

  /**
   * Fetches heart rate samples within a time range.
   */
  getHeartRate(timeRange?: HealthTimeRange): Promise<HeartRateSample[]>;

  /**
   * Fetches HRV samples within a time range.
   */
  getHRV(timeRange?: HealthTimeRange): Promise<HRVSample[]>;

  /**
   * Fetches sleep sessions within a time range.
   */
  getSleep(timeRange?: HealthTimeRange): Promise<SleepSession[]>;

  /**
   * Fetches daily step and caloric activity.
   */
  getDailyActivity(timeRange?: HealthTimeRange): Promise<DailyActivity[]>;

  /**
   * Fetches pre-computed or current recovery metrics.
   */
  getRecoveryMetrics(): Promise<RecoveryMetrics | null>;

  // Sprint 3.8 — Production Sync Contracts

  /**
   * Returns the timestamp of the last successful data sync, or null if never synced.
   */
  getLastSyncTimestamp(): Promise<number | null>;

  /**
   * Returns the current sync lifecycle status.
   */
  getSyncStatus(): Promise<HealthSyncStatus>;
}

