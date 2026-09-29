/**
 * FitNova AI — Health Data Service
 * Central service orchestrating health data fetching, normalization,
 * hardware provider abstraction, and EventBus synchronization.
 * Zero UI/React code.
 */

import type { HealthProvider } from '../providers/HealthProvider.ts';
import { MockHealthProvider } from '../providers/MockHealthProvider.ts';
import type { IHealthRepository } from '../repositories/IHealthRepository.ts';
import type { EventBus } from '../../../platform/events/EventBus.ts';
import type { AnalyticsService } from '../../../platform/analytics/AnalyticsService.ts';
import type {
  HeartRateSample,
  HRVSample,
  SleepSession,
  DailyActivity,
  RecoveryMetrics,
} from '../models/index.ts';
import type {
  NormalizedHealthDataset,
  HealthTimeRange,
  DataFreshness,
  DataFreshnessState,
} from '../types/healthContracts.ts';
import type { HealthProviderType, HealthProviderStatus } from '../types/healthEnums.ts';
import { RecoveryAnalytics } from '../analytics/RecoveryAnalytics.ts';

export interface HealthDataServiceConfig {
  provider?: HealthProvider;
  repository: IHealthRepository;
  eventBus?: EventBus;
  analytics?: AnalyticsService;
  restingHeartRateBaseline?: number;
}

export class HealthDataService {
  private provider: HealthProvider;
  private readonly fallbackProvider: MockHealthProvider;
  private readonly repository: IHealthRepository;
  private readonly eventBus?: EventBus;
  private readonly analytics?: AnalyticsService;
  private readonly recoveryAnalytics: RecoveryAnalytics;
  private readonly restingHeartRateBaseline: number;
  private lastSyncedAt: number = 0;

  constructor(config: HealthDataServiceConfig) {
    this.fallbackProvider = new MockHealthProvider();
    this.provider = config.provider ?? this.fallbackProvider;
    this.repository = config.repository;
    this.eventBus = config.eventBus;
    this.analytics = config.analytics;
    this.recoveryAnalytics = new RecoveryAnalytics();
    this.restingHeartRateBaseline = config.restingHeartRateBaseline ?? 60;
  }

  setProvider(provider: HealthProvider): void {
    this.provider = provider;
  }

  getProviderType(): HealthProviderType {
    return this.provider.type;
  }

  async getProviderStatus(): Promise<HealthProviderStatus> {
    try {
      return await this.provider.getStatus();
    } catch {
      return 'unavailable';
    }
  }

  /**
   * Syncs latest health data from active provider, normalizes values,
   * caches locally, calculates recovery metrics, and emits event.
   */
  async syncHealthData(timeRange?: HealthTimeRange): Promise<NormalizedHealthDataset> {
    let activeProvider = this.provider;

    // Verify availability; fallback to Mock if unavailable
    try {
      const isAvailable = await activeProvider.isAvailable();
      if (!isAvailable) {
        activeProvider = this.fallbackProvider;
      }
    } catch {
      activeProvider = this.fallbackProvider;
    }

    const providerStatus = await activeProvider.getStatus();

    let rawHR: HeartRateSample[] = [];
    let rawHRV: HRVSample[] = [];
    let rawSleep: SleepSession[] = [];
    let rawActivity: DailyActivity[] = [];

    try {
      const [hr, hrv, sleep, act] = await Promise.all([
        activeProvider.getHeartRate(timeRange),
        activeProvider.getHRV(timeRange),
        activeProvider.getSleep(timeRange),
        activeProvider.getDailyActivity(timeRange),
      ]);

      rawHR = hr;
      rawHRV = hrv;
      rawSleep = sleep;
      rawActivity = act;
    } catch {
      // If hardware read fails, fallback to mock data
      rawHR = await this.fallbackProvider.getHeartRate(timeRange);
      rawHRV = await this.fallbackProvider.getHRV(timeRange);
      rawSleep = await this.fallbackProvider.getSleep(timeRange);
      rawActivity = await this.fallbackProvider.getDailyActivity(timeRange);
    }

    // Normalization Layer: filter malformed / invalid outliers
    const heartRateSamples = this.normalizeHeartRate(rawHR);
    const hrvSamples = this.normalizeHRV(rawHRV);
    const sleepSessions = this.normalizeSleep(rawSleep);
    const dailyActivity = this.normalizeActivity(rawActivity);

    // Save to repository cache
    await Promise.all([
      this.repository.saveHeartRateSamples(heartRateSamples),
      this.repository.saveHRVSamples(hrvSamples),
      this.repository.saveSleepSessions(sleepSessions),
      this.repository.saveActivities(dailyActivity),
    ]);

    // Compute composite recovery
    const latestRecovery = this.recoveryAnalytics.calculateRecovery({
      hrvSamples,
      sleepSessions,
      activities: dailyActivity,
      restingHeartRateBaseline: this.restingHeartRateBaseline,
    });

    await this.repository.saveRecoveryMetrics(latestRecovery);

    const dataset: NormalizedHealthDataset = {
      heartRateSamples,
      hrvSamples,
      sleepSessions,
      dailyActivity,
      latestRecovery,
      lastSyncedAt: Date.now(),
      provider: activeProvider.type,
      providerStatus,
    };

    this.lastSyncedAt = dataset.lastSyncedAt;

    await this.repository.saveCachedDataset(dataset);

    // Emit typed events
    if (this.eventBus) {
      this.eventBus.emit('HEALTH_DATA_UPDATED', {
        provider: activeProvider.type,
        source: 'health_data_service',
        timestamp: Date.now(),
        hasHeartRate: heartRateSamples.length > 0,
        hasHRV: hrvSamples.length > 0,
        hasSleep: sleepSessions.length > 0,
        hasActivity: dailyActivity.length > 0,
      });

      this.eventBus.emit('RECOVERY_SCORE_UPDATED', {
        recoveryScore: latestRecovery.recoveryScore,
        readinessState: latestRecovery.readinessState,
        recommendedIntensity: latestRecovery.recommendedIntensity,
        dataSources: latestRecovery.dataSourcesUsed,
        timestamp: Date.now(),
      });
    }

    if (this.analytics) {
      this.analytics.track('HEALTH_SYNC_COMPLETED', {
        provider: activeProvider.type,
        recoveryScore: latestRecovery.recoveryScore,
        samplesCount: heartRateSamples.length + hrvSamples.length + sleepSessions.length,
      });
    }

    return dataset;
  }

  /**
   * Retrieves cached normalized dataset or triggers sync if empty.
   */
  async getHealthDataset(): Promise<NormalizedHealthDataset> {
    const cached = await this.repository.getCachedDataset();
    if (cached) return cached;
    return this.syncHealthData();
  }

  async getLatestRecoveryMetrics(): Promise<RecoveryMetrics> {
    const cached = await this.repository.getLatestRecoveryMetrics();
    if (cached) return cached;
    const dataset = await this.syncHealthData();
    return dataset.latestRecovery!;
  }

  // Sprint 3.8 — Data Freshness & Sync Status

  /**
   * Computes the freshness of the most recent health data sync.
   * Returns fresh/aging/stale/unavailable based on time since last sync.
   */
  getDataFreshness(): DataFreshness {
    const now = Date.now();
    const lastSync = this.lastSyncedAt;

    if (lastSync === 0) {
      return { timestamp: 0, ageMs: Infinity, state: 'unavailable' };
    }

    const ageMs = now - lastSync;

    let state: DataFreshnessState;
    if (ageMs < 2 * 60 * 60 * 1000) {
      state = 'fresh';
    } else if (ageMs < 8 * 60 * 60 * 1000) {
      state = 'aging';
    } else if (ageMs < 24 * 60 * 60 * 1000) {
      state = 'stale';
    } else {
      state = 'unavailable';
    }

    return { timestamp: lastSync, ageMs, state };
  }

  /**
   * Delegates to the active provider's sync status.
   */
  async getSyncStatus(): Promise<import('../types/healthEnums.ts').HealthSyncStatus> {
    try {
      return await this.provider.getSyncStatus();
    } catch {
      return 'error';
    }
  }

  /**
   * Checks for stale data and emits HEALTH_DATA_STALE if applicable.
   */
  checkAndEmitStaleness(): void {
    const freshness = this.getDataFreshness();
    if ((freshness.state === 'stale' || freshness.state === 'unavailable') && this.eventBus) {
      this.eventBus.emit('HEALTH_DATA_STALE', {
        provider: this.provider.type,
        lastSyncedAt: freshness.timestamp,
        ageMs: freshness.ageMs === Infinity ? -1 : freshness.ageMs,
        freshnessState: freshness.state,
        timestamp: Date.now(),
      });
    }
  }

  // --- Normalization Methods ---

  public normalizeHeartRate(samples: HeartRateSample[]): HeartRateSample[] {
    if (!samples) return [];
    return samples
      .filter((s) => s.timestamp > 0)
      .map((s) => ({
        ...s,
        bpm: Math.round(Math.max(30, Math.min(240, s.bpm))),
        source: s.source || 'Wearable Sensor',
        confidence: s.confidence || 'high',
      }));
  }

  public normalizeHRV(samples: HRVSample[]): HRVSample[] {
    if (!samples) return [];
    return samples
      .filter((s) => s.timestamp > 0)
      .map((s) => ({
        ...s,
        rmssdMs: Math.round(Math.max(5, Math.min(300, s.rmssdMs)) * 10) / 10,
        source: s.source || 'Wearable HRV',
        status: s.status || 'optimal',
        confidence: s.confidence || 'high',
      }));
  }

  private normalizeSleep(sessions: SleepSession[]): SleepSession[] {
    if (!sessions) return [];
    return sessions
      .filter(
        (s) =>
          s.totalDurationMinutes >= 60 &&
          s.totalDurationMinutes <= 1440 &&
          s.startTime > 0
      )
      .map((s) => {
        const timeAsleep = Math.min(s.totalDurationMinutes, s.timeAsleepMinutes || s.totalDurationMinutes);
        const timeAwake = Math.max(0, s.totalDurationMinutes - timeAsleep);
        return {
          ...s,
          timeAsleepMinutes: timeAsleep,
          timeAwakeMinutes: timeAwake,
          efficiencyPct: Math.min(100, Math.max(0, Math.round(s.efficiencyPct || 85))),
          deepMinutes: Math.round(s.deepMinutes || 0),
          remMinutes: Math.round(s.remMinutes || 0),
          lightMinutes: Math.round(s.lightMinutes || 0),
          source: s.source || 'Wearable Sleep',
        };
      });
  }

  private normalizeActivity(activities: DailyActivity[]): DailyActivity[] {
    if (!activities) return [];
    return activities
      .filter((a) => a.steps >= 0 && a.activeEnergyBurnedKcal >= 0)
      .map((a) => ({
        ...a,
        steps: Math.round(a.steps),
        activeEnergyBurnedKcal: Math.round(a.activeEnergyBurnedKcal),
        restingHeartRateBpm:
          a.restingHeartRateBpm >= 30 && a.restingHeartRateBpm <= 150
            ? Math.round(a.restingHeartRateBpm)
            : this.restingHeartRateBaseline,
        source: a.source || 'Wearable Tracker',
      }));
  }
}

