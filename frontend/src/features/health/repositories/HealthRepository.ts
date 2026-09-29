/**
 * FitNova AI — Health Repository Implementation
 * Bounded-cache local persistence utilizing Platform StorageService.
 * Supports offline reads, stale indicators, and automatic TTL expiration.
 */

import type { IHealthRepository } from './IHealthRepository.ts';
import type { StorageService } from '../../../platform/storage/StorageService.ts';
import type {
  HeartRateSample,
  HRVSample,
  SleepSession,
  DailyActivity,
  RecoveryMetrics,
} from '../models/index.ts';
import type { NormalizedHealthDataset } from '../types/healthContracts.ts';

export interface HealthRepositoryConfig {
  storage: StorageService;
  cacheTtlMs?: number; // Defaults to 15 minutes (900,000 ms)
}

interface CacheWrapper<T> {
  data: T;
  cachedAt: number;
}

export class HealthRepository implements IHealthRepository {
  private readonly storage: StorageService;
  private readonly cacheTtlMs: number;

  private readonly KEY_DATASET = 'fitnova:health:dataset';
  private readonly KEY_HR = 'fitnova:health:hr';
  private readonly KEY_HRV = 'fitnova:health:hrv';
  private readonly KEY_SLEEP = 'fitnova:health:sleep';
  private readonly KEY_ACTIVITY = 'fitnova:health:activity';
  private readonly KEY_RECOVERY = 'fitnova:health:recovery';

  constructor(config: HealthRepositoryConfig) {
    this.storage = config.storage;
    this.cacheTtlMs = config.cacheTtlMs ?? 900_000;
  }

  private isFresh(cachedAt: number): boolean {
    return Date.now() - cachedAt < this.cacheTtlMs;
  }

  async getLatestHeartRate(): Promise<HeartRateSample | null> {
    const list = await this.getHeartRateHistory();
    return list.length > 0 ? list[list.length - 1] : null;
  }

  async getHeartRateHistory(): Promise<HeartRateSample[]> {
    const item = this.storage.getJSON<CacheWrapper<HeartRateSample[]>>(this.KEY_HR);
    return item?.data ?? [];
  }

  async saveHeartRateSamples(samples: HeartRateSample[]): Promise<void> {
    const existing = await this.getHeartRateHistory();
    // Merge, deduplicate by id or timestamp
    const map = new Map<string, HeartRateSample>();
    for (const s of existing) map.set(s.id || String(s.timestamp), s);
    for (const s of samples) map.set(s.id || String(s.timestamp), s);

    // Keep up to 500 samples
    const merged = Array.from(map.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-500);

    this.storage.setJSON(this.KEY_HR, { data: merged, cachedAt: Date.now() });
  }

  async getLatestHRV(): Promise<HRVSample | null> {
    const list = await this.getHRVHistory();
    return list.length > 0 ? list[list.length - 1] : null;
  }

  async getHRVHistory(): Promise<HRVSample[]> {
    const item = this.storage.getJSON<CacheWrapper<HRVSample[]>>(this.KEY_HRV);
    return item?.data ?? [];
  }

  async saveHRVSamples(samples: HRVSample[]): Promise<void> {
    const existing = await this.getHRVHistory();
    const map = new Map<string, HRVSample>();
    for (const s of existing) map.set(s.id || String(s.timestamp), s);
    for (const s of samples) map.set(s.id || String(s.timestamp), s);

    const merged = Array.from(map.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-100);

    this.storage.setJSON(this.KEY_HRV, { data: merged, cachedAt: Date.now() });
  }

  async getLatestSleep(): Promise<SleepSession | null> {
    const list = await this.getSleepHistory();
    return list.length > 0 ? list[list.length - 1] : null;
  }

  async getSleepHistory(): Promise<SleepSession[]> {
    const item = this.storage.getJSON<CacheWrapper<SleepSession[]>>(this.KEY_SLEEP);
    return item?.data ?? [];
  }

  async saveSleepSessions(sessions: SleepSession[]): Promise<void> {
    const existing = await this.getSleepHistory();
    const map = new Map<string, SleepSession>();
    for (const s of existing) map.set(s.id || s.date, s);
    for (const s of sessions) map.set(s.id || s.date, s);

    const merged = Array.from(map.values())
      .sort((a, b) => a.startTime - b.startTime)
      .slice(-60);

    this.storage.setJSON(this.KEY_SLEEP, { data: merged, cachedAt: Date.now() });
  }

  async getLatestActivity(): Promise<DailyActivity | null> {
    const list = await this.getActivityHistory();
    return list.length > 0 ? list[list.length - 1] : null;
  }

  async getActivityHistory(): Promise<DailyActivity[]> {
    const item = this.storage.getJSON<CacheWrapper<DailyActivity[]>>(this.KEY_ACTIVITY);
    return item?.data ?? [];
  }

  async saveActivities(activities: DailyActivity[]): Promise<void> {
    const existing = await this.getActivityHistory();
    const map = new Map<string, DailyActivity>();
    for (const a of existing) map.set(a.id || a.date, a);
    for (const a of activities) map.set(a.id || a.date, a);

    const merged = Array.from(map.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-60);

    this.storage.setJSON(this.KEY_ACTIVITY, { data: merged, cachedAt: Date.now() });
  }

  async getLatestRecoveryMetrics(): Promise<RecoveryMetrics | null> {
    const item = this.storage.getJSON<CacheWrapper<RecoveryMetrics>>(this.KEY_RECOVERY);
    if (!item) return null;
    return item.data;
  }

  async saveRecoveryMetrics(metrics: RecoveryMetrics): Promise<void> {
    this.storage.setJSON(this.KEY_RECOVERY, { data: metrics, cachedAt: Date.now() });
  }

  async getCachedDataset(): Promise<NormalizedHealthDataset | null> {
    const item = this.storage.getJSON<CacheWrapper<NormalizedHealthDataset>>(this.KEY_DATASET);
    if (!item) return null;
    if (!this.isFresh(item.cachedAt)) {
      return item.data; // Return stale offline data if expired
    }
    return item.data;
  }

  async saveCachedDataset(dataset: NormalizedHealthDataset): Promise<void> {
    this.storage.setJSON(this.KEY_DATASET, { data: dataset, cachedAt: Date.now() });
  }

  async clearCache(): Promise<void> {
    this.storage.remove(this.KEY_DATASET);
    this.storage.remove(this.KEY_HR);
    this.storage.remove(this.KEY_HRV);
    this.storage.remove(this.KEY_SLEEP);
    this.storage.remove(this.KEY_ACTIVITY);
    this.storage.remove(this.KEY_RECOVERY);
  }
}
