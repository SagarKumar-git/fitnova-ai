/**
 * FitNova AI — Mock Health Provider
 * Deterministic, realistic physiological data simulation for local development,
 * offline operations, and graceful fallback when hardware is disconnected.
 */

import type { HealthProvider } from './HealthProvider.ts';
import type { HealthProviderType, HealthProviderStatus, HealthSyncStatus } from '../types/healthEnums.ts';
import type {
  HeartRateSample,
  HRVSample,
  SleepSession,
  DailyActivity,
  RecoveryMetrics,
} from '../models/index.ts';
import type { HealthTimeRange } from '../types/healthContracts.ts';

export class MockHealthProvider implements HealthProvider {
  readonly type: HealthProviderType = 'mock';
  private status: HealthProviderStatus = 'connected';
  private syncStatus: HealthSyncStatus = 'connected';
  private lastSyncTimestamp: number | null = Date.now();

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async requestPermissions(): Promise<HealthProviderStatus> {
    this.status = 'connected';
    this.syncStatus = 'connected';
    return this.status;
  }

  async getStatus(): Promise<HealthProviderStatus> {
    return this.status;
  }

  setStatus(status: HealthProviderStatus): void {
    this.status = status;
  }

  async getHeartRate(_timeRange?: HealthTimeRange): Promise<HeartRateSample[]> {
    const now = Date.now();
    const samples: HeartRateSample[] = [];

    // Generate 6 sample intervals across today
    const restingBpm = [58, 60, 62, 59, 61, 58];
    for (let i = 0; i < restingBpm.length; i++) {
      samples.push({
        id: `mock_hr_${i}`,
        bpm: restingBpm[i],
        timestamp: now - (5 - i) * 3600000,
        source: 'FitNova Simulated Health Sensor',
        confidence: 'high',
        context: 'resting',
      });
    }

    this.lastSyncTimestamp = Date.now();
    return samples;
  }

  async getHRV(_timeRange?: HealthTimeRange): Promise<HRVSample[]> {
    const now = Date.now();
    this.lastSyncTimestamp = Date.now();
    return [
      {
        id: 'mock_hrv_1',
        rmssdMs: 62,
        sdnnMs: 58,
        timestamp: now - 3600000 * 8, // Morning reading
        baselineDeviationPct: 6.5,
        status: 'optimal',
        confidence: 'high',
        source: 'FitNova Simulated Health Sensor',
      },
    ];
  }

  async getSleep(_timeRange?: HealthTimeRange): Promise<SleepSession[]> {
    const now = Date.now();
    const startTime = now - 3600000 * 8.5;
    const endTime = now - 3600000 * 1;
    const totalMinutes = 450; // 7.5 hours

    this.lastSyncTimestamp = Date.now();
    return [
      {
        id: 'mock_sleep_1',
        date: new Date(startTime).toISOString().split('T')[0],
        startTime,
        endTime,
        totalDurationMinutes: totalMinutes,
        timeAsleepMinutes: 415,
        timeAwakeMinutes: 35,
        deepMinutes: 95, // ~23%
        remMinutes: 105, // ~25%
        lightMinutes: 215, // ~52%
        efficiencyPct: 92,
        latencyMinutes: 14,
        sleepScore: 88,
        stages: [
          { stage: 'light', startTime, endTime: startTime + 3600000 * 1.5, durationMinutes: 90 },
          { stage: 'deep', startTime: startTime + 3600000 * 1.5, endTime: startTime + 3600000 * 3, durationMinutes: 90 },
          { stage: 'rem', startTime: startTime + 3600000 * 3, endTime: startTime + 3600000 * 4.5, durationMinutes: 90 },
          { stage: 'light', startTime: startTime + 3600000 * 4.5, endTime: startTime + 3600000 * 7, durationMinutes: 150 },
          { stage: 'awake', startTime: startTime + 3600000 * 7, endTime, durationMinutes: 30 },
        ],
        source: 'FitNova Simulated Sleep Engine',
      },
    ];
  }

  async getDailyActivity(_timeRange?: HealthTimeRange): Promise<DailyActivity[]> {
    const now = Date.now();
    this.lastSyncTimestamp = Date.now();
    return [
      {
        id: 'mock_act_today',
        date: new Date(now).toISOString().split('T')[0],
        steps: 8450,
        activeEnergyBurnedKcal: 480,
        basalEnergyBurnedKcal: 1750,
        distanceMeters: 6200,
        activeMinutes: 52,
        restingHeartRateBpm: 59,
        timestamp: now,
        source: 'FitNova Simulated Activity Tracker',
      },
    ];
  }

  async getRecoveryMetrics(): Promise<RecoveryMetrics | null> {
    const now = Date.now();
    return {
      id: 'mock_rec_today',
      date: new Date(now).toISOString().split('T')[0],
      timestamp: now,
      recoveryScore: 86,
      readinessState: 'optimal',
      recommendedIntensity: 'full',
      intensityModifier: 1.0,
      restingHeartRateBpm: 59,
      restingHeartRateBaselineBpm: 60,
      rhrDeltaFromBaseline: -1,
      hrvRmssdMs: 62,
      hrvBaselineMs: 58,
      hrvStatus: 'optimal',
      sleepHours: 7.5,
      sleepEfficiencyPct: 92,
      deepSleepPct: 23,
      remSleepPct: 25,
      contributingFactors: [
        'HRV is +6.5% above your 30-day baseline (parasympathetic recovery primed)',
        'Resting heart rate is stable at 59 BPM (-1 BPM vs baseline)',
        'Optimal sleep duration of 7.5 hours with 95 minutes of deep slow-wave sleep',
      ],
      recoveryWarnings: [],
      confidenceLevel: 0.95,
      dataSourcesUsed: ['hrv', 'resting_hr', 'sleep', 'activity'],
    };
  }

  // Sprint 3.8 — Production Sync Contracts

  async getLastSyncTimestamp(): Promise<number | null> {
    return this.lastSyncTimestamp;
  }

  async getSyncStatus(): Promise<HealthSyncStatus> {
    return this.syncStatus;
  }

  /** Test helper: override sync status */
  setSyncStatus(status: HealthSyncStatus): void {
    this.syncStatus = status;
  }

  /** Test helper: override last sync timestamp */
  setLastSyncTimestamp(ts: number | null): void {
    this.lastSyncTimestamp = ts;
  }
}

