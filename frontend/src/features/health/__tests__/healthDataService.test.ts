/**
 * FitNova AI — Sprint 3.7 Health Platform & Wearable Integration Test Suite
 * Tests HealthDataService normalization, provider abstraction, repository caching,
 * HRV/Sleep analytics, composite recovery scoring, and EventBus integration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageService } from '../../../platform/storage/StorageService.ts';
import { MemoryStorageAdapter } from '../../../platform/storage/MemoryStorageAdapter.ts';
import { EventBus } from '../../../platform/events/EventBus.ts';
import { HealthRepository } from '../repositories/HealthRepository.ts';
import { MockHealthProvider } from '../providers/MockHealthProvider.ts';
import { AppleHealthProvider } from '../providers/AppleHealthProvider.ts';
import { HealthConnectProvider } from '../providers/HealthConnectProvider.ts';
import { HealthDataService } from '../services/HealthDataService.ts';
import { RecoveryDataService } from '../services/RecoveryDataService.ts';
import { HRVAnalytics } from '../analytics/HRVAnalytics.ts';
import { SleepAnalytics } from '../analytics/SleepAnalytics.ts';
import { RecoveryAnalytics } from '../analytics/RecoveryAnalytics.ts';
import type { HeartRateSample } from '../models/HeartRateSample.ts';
import type { HRVSample } from '../models/HRVSample.ts';
import type { SleepSession } from '../models/SleepSession.ts';

describe('Sprint 3.7 — Health & Wearable Platform Suite', () => {
  let storage: StorageService;
  let repository: HealthRepository;
  let eventBus: EventBus;
  let mockProvider: MockHealthProvider;
  let healthService: HealthDataService;
  let recoveryService: RecoveryDataService;

  beforeEach(() => {
    storage = new StorageService({ adapter: new MemoryStorageAdapter() });
    repository = new HealthRepository({ storage, cacheTtlMs: 900_000 });
    eventBus = new EventBus();
    mockProvider = new MockHealthProvider();
    healthService = new HealthDataService({
      provider: mockProvider,
      repository,
      eventBus,
    });
    recoveryService = new RecoveryDataService(healthService);
  });

  // ==========================================================================
  // 1. PROVIDER ABSTRACTION & FALLBACK
  // ==========================================================================
  describe('1. Provider Abstraction & Fallback Handling', () => {
    it('initializes MockHealthProvider and reports connected status with capabilities', async () => {
      expect(mockProvider.type).toBe('mock');
      const isAvail = await mockProvider.isAvailable();
      expect(isAvail).toBe(true);

      const status = await healthService.getProviderStatus();
      expect(status).toBe('connected');
    });

    it('gracefully reports unavailable when AppleHealthProvider runs in standard web browser', async () => {
      const appleProvider = new AppleHealthProvider();
      const isAvail = await appleProvider.isAvailable();
      expect(isAvail).toBe(false);

      const requestRes = await appleProvider.requestPermissions();
      expect(requestRes).toBe('unavailable');

      const serviceWithApple = new HealthDataService({
        provider: appleProvider,
        repository,
        eventBus,
      });

      // Sync should automatically fallback to MockHealthProvider internally
      const dataset = await serviceWithApple.syncHealthData();
      expect(dataset).toBeDefined();
      expect(dataset.heartRateSamples.length).toBeGreaterThan(0);
    });

    it('gracefully reports unavailable when HealthConnectProvider runs in standard web browser', async () => {
      const hcProvider = new HealthConnectProvider();
      const isAvail = await hcProvider.isAvailable();
      expect(isAvail).toBe(false);

      const serviceWithHc = new HealthDataService({
        provider: hcProvider,
        repository,
        eventBus,
      });

      // Fallback kicks in smoothly
      const dataset = await serviceWithHc.syncHealthData();
      expect(dataset).toBeDefined();
      expect(dataset.hrvSamples.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // 2. DATA NORMALIZATION & PIPELINE INTEGRITY
  // ==========================================================================
  describe('2. Data Normalization & Sensor Clipping', () => {
    it('normalizes and clamps out-of-range sensor values (BPM and HRV)', () => {
      const now = Date.now();
      const dirtySamples: HeartRateSample[] = [
        { id: '1', timestamp: now, bpm: 15, source: 'external', confidence: 'high' }, // too low
        { id: '2', timestamp: now + 1000, bpm: 285, source: 'external', confidence: 'high' }, // too high
        { id: '3', timestamp: now + 2000, bpm: 72, source: 'external', confidence: 'high' },
      ];

      const normalized = healthService.normalizeHeartRate(dirtySamples);
      expect(normalized[0].bpm).toBe(30); // clamped to min safe BPM
      expect(normalized[1].bpm).toBe(240); // clamped to max safe BPM
      expect(normalized[2].bpm).toBe(72); // unchanged
    });

    it('normalizes HRV samples and clamps rMSSD readings into safe physiological bounds', () => {
      const now = Date.now();
      const rawHrv: HRVSample[] = [
        { id: 'h1', timestamp: now, rmssdMs: 2, source: 'external', confidence: 'high' },
        { id: 'h2', timestamp: now + 1000, rmssdMs: 65, status: 'optimal', source: 'external', confidence: 'high' },
        { id: 'h3', timestamp: now + 2000, rmssdMs: 450, source: 'external', confidence: 'high' }, // extreme outlier
      ];

      const clean = healthService.normalizeHRV(rawHrv);
      expect(clean[0].rmssdMs).toBe(5); // clamped to min HRV
      expect(clean[1].rmssdMs).toBe(65);
      expect(clean[2].rmssdMs).toBe(300); // clamped to max HRV ceiling
    });

    it('calculates sleep efficiency and stage breakdown cleanly', () => {
      const sleepEngine = new SleepAnalytics();
      const now = Date.now();
      const session: SleepSession = {
        id: 'sleep_1',
        date: '2026-09-14',
        startTime: now - 8 * 3600 * 1000,
        endTime: now,
        totalDurationMinutes: 480,
        timeAsleepMinutes: 432,
        timeAwakeMinutes: 48,
        efficiencyPct: 90,
        deepMinutes: 100,
        remMinutes: 110,
        lightMinutes: 222,
        stages: [
          { stage: 'deep', durationMinutes: 100, startTime: now - 8 * 3600 * 1000, endTime: now - 6 * 3600 * 1000 },
          { stage: 'rem', durationMinutes: 110, startTime: now - 6 * 3600 * 1000, endTime: now - 4 * 3600 * 1000 },
          { stage: 'light', durationMinutes: 222, startTime: now - 4 * 3600 * 1000, endTime: now - 1 * 3600 * 1000 },
          { stage: 'awake', durationMinutes: 48, startTime: now - 1 * 3600 * 1000, endTime: now },
        ],
        source: 'mock_simulator',
      };

      const score = sleepEngine.analyzeSleep([session]);
      expect(score.efficiencyPct).toBe(90);
      expect(score.deepSleepMinutes).toBe(100);
      expect(score.remSleepMinutes).toBe(110);
      expect(score.qualityRating).toBe('good');
    });
  });

  // ==========================================================================
  // 3. CACHING & REPOSITORY PERSISTENCE
  // ==========================================================================
  describe('3. Repository Persistence & Memory Caching', () => {
    it('caches health data and serves from repository cache', async () => {
      const syncSpy = vi.spyOn(mockProvider, 'getHeartRate');

      // First fetch via sync -> calls provider
      const dataset1 = await healthService.syncHealthData();
      expect(syncSpy).toHaveBeenCalledTimes(1);
      expect(dataset1.heartRateSamples.length).toBeGreaterThan(0);

      // Subsequent read serves from repository
      const cached = await repository.getCachedDataset();
      expect(cached).toBeDefined();
      expect(cached?.heartRateSamples.length).toBe(dataset1.heartRateSamples.length);
    });

    it('persists and retrieves daily recovery metrics with correct schema', async () => {
      const enriched = await recoveryService.getEnrichedReadiness();

      expect(enriched.metrics.recoveryScore).toBeGreaterThanOrEqual(0);
      expect(enriched.metrics.recoveryScore).toBeLessThanOrEqual(100);

      const cached = await repository.getLatestRecoveryMetrics();
      expect(cached).toBeDefined();
      expect(cached?.recoveryScore).toBe(enriched.metrics.recoveryScore);
    });
  });

  // ==========================================================================
  // 4. EVENT EMISSION & ANALYTICS INTEGRATION
  // ==========================================================================
  describe('4. EventBus Communication & Real-Time Sync', () => {
    it('emits HEALTH_DATA_UPDATED and RECOVERY_SCORE_UPDATED on sync', async () => {
      const healthUpdatedHandler = vi.fn();
      const recoveryUpdatedHandler = vi.fn();

      eventBus.subscribe('HEALTH_DATA_UPDATED', healthUpdatedHandler);
      eventBus.subscribe('RECOVERY_SCORE_UPDATED', recoveryUpdatedHandler);

      await healthService.syncHealthData();

      expect(healthUpdatedHandler).toHaveBeenCalled();
      const eventPayload = healthUpdatedHandler.mock.calls[0][0];
      expect(eventPayload.provider).toBe('mock');

      expect(recoveryUpdatedHandler).toHaveBeenCalled();
      const recPayload = recoveryUpdatedHandler.mock.calls[0][0];
      expect(recPayload.recoveryScore).toBeGreaterThanOrEqual(0);
      expect(recPayload.recoveryScore).toBeLessThanOrEqual(100);
      expect(['optimal', 'moderate', 'low', 'rest_recommended']).toContain(recPayload.readinessState);
    });
  });

  // ==========================================================================
  // 5. HRV & RECOVERY COMPOSITE ANALYTICS
  // ==========================================================================
  describe('5. HRV & Recovery Analytics Engine', () => {
    it('evaluates HRV deviation from baseline correctly', () => {
      const hrvEngine = new HRVAnalytics();
      const now = Date.now();

      const optimalSamples: HRVSample[] = [
        { id: '1', timestamp: now - 86400000 * 3, rmssdMs: 65, source: 'test', confidence: 'high' },
        { id: '2', timestamp: now - 86400000 * 2, rmssdMs: 65, source: 'test', confidence: 'high' },
        { id: '3', timestamp: now - 86400000 * 1, rmssdMs: 65, source: 'test', confidence: 'high' },
        { id: '4', timestamp: now, rmssdMs: 68, source: 'test', confidence: 'high' },
      ];
      const optimalAnalysis = hrvEngine.analyzeHRV(optimalSamples, 65);
      expect(optimalAnalysis.status).toBe('optimal');

      const suppressedSamples: HRVSample[] = [
        { id: '1', timestamp: now - 86400000 * 3, rmssdMs: 65, source: 'test', confidence: 'high' },
        { id: '2', timestamp: now - 86400000 * 2, rmssdMs: 65, source: 'test', confidence: 'high' },
        { id: '3', timestamp: now - 86400000 * 1, rmssdMs: 65, source: 'test', confidence: 'high' },
        { id: '4', timestamp: now, rmssdMs: 40, source: 'test', confidence: 'high' },
      ];
      const suppressedAnalysis = hrvEngine.analyzeHRV(suppressedSamples, 65);
      expect(suppressedAnalysis.status).toBe('suppressed');

      const elevatedSamples: HRVSample[] = [
        { id: '1', timestamp: now - 86400000 * 3, rmssdMs: 65, source: 'test', confidence: 'high' },
        { id: '2', timestamp: now - 86400000 * 2, rmssdMs: 65, source: 'test', confidence: 'high' },
        { id: '3', timestamp: now - 86400000 * 1, rmssdMs: 65, source: 'test', confidence: 'high' },
        { id: '4', timestamp: now, rmssdMs: 95, source: 'test', confidence: 'high' },
      ];
      const elevatedAnalysis = hrvEngine.analyzeHRV(elevatedSamples, 65);
      expect(elevatedAnalysis.status).toBe('elevated');
    });

    it('calculates composite recovery score weighing HRV, resting HR, and sleep', () => {
      const recoveryEngine = new RecoveryAnalytics();
      const now = Date.now();

      // Good night: high HRV, low resting HR, 8 hours good sleep
      const primeRecovery = recoveryEngine.calculateRecovery({
        hrvSamples: [{ id: '1', timestamp: now, rmssdMs: 75, source: 'test', confidence: 'high' }],
        sleepSessions: [
          {
            id: 's1',
            date: '2026-09-14',
            startTime: now - 8 * 3600 * 1000,
            endTime: now,
            totalDurationMinutes: 480,
            timeAsleepMinutes: 450,
            timeAwakeMinutes: 30,
            efficiencyPct: 94,
            deepMinutes: 110,
            remMinutes: 120,
            lightMinutes: 220,
            stages: [],
            source: 'test',
          },
        ],
        activities: [
          {
            id: 'a1',
            date: '2026-09-14',
            timestamp: now,
            steps: 8000,
            activeEnergyBurnedKcal: 400,
            distanceMeters: 6000,
            activeMinutes: 45,
            restingHeartRateBpm: 52,
            source: 'test',
          },
        ],
        restingHeartRateBaseline: 55,
      });

      expect(primeRecovery.recoveryScore).toBeGreaterThanOrEqual(80);
      expect(primeRecovery.readinessState).toBe('optimal');
      expect(primeRecovery.recommendedIntensity).toBe('full');

      // Exhausted night: suppressed HRV, elevated HR, 4.5 hours poor sleep
      const fatiguedRecovery = recoveryEngine.calculateRecovery({
        hrvSamples: [{ id: '2', timestamp: now, rmssdMs: 32, source: 'test', confidence: 'high' }],
        sleepSessions: [
          {
            id: 's2',
            date: '2026-09-14',
            startTime: now - 4.5 * 3600 * 1000,
            endTime: now,
            totalDurationMinutes: 270,
            timeAsleepMinutes: 220,
            timeAwakeMinutes: 50,
            efficiencyPct: 75,
            deepMinutes: 25,
            remMinutes: 35,
            lightMinutes: 160,
            stages: [],
            source: 'test',
          },
        ],
        activities: [
          {
            id: 'a2',
            date: '2026-09-14',
            timestamp: now,
            steps: 16000,
            activeEnergyBurnedKcal: 950,
            distanceMeters: 12000,
            activeMinutes: 110,
            restingHeartRateBpm: 68,
            source: 'test',
          },
        ],
        restingHeartRateBaseline: 55,
      });

      expect(fatiguedRecovery.recoveryScore).toBeLessThan(65);
      expect(['low', 'rest_recommended']).toContain(fatiguedRecovery.readinessState);
      expect(['light', 'active_recovery']).toContain(fatiguedRecovery.recommendedIntensity);
    });
  });
});
