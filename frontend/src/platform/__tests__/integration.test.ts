/**
 * FitNova AI — Sprint 2.5 Platform Integration Tests
 * Validates cross-system wiring, ApiClient, EventBus reactivity,
 * Storage migration, and Error handling policies.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPlatformContainer } from '../container/PlatformContainer.ts';
import { ApiClient } from '../network/ApiClient.ts';
import { NetworkService } from '../network/NetworkService.ts';
import { EventBus } from '../events/EventBus.ts';
import { StorageService } from '../storage/StorageService.ts';
import { MemoryStorageAdapter } from '../storage/MemoryStorageAdapter.ts';
import { TelemetryService } from '../telemetry/TelemetryService.ts';
import {
  normalizeError,
  sanitizeErrorMessage,
  isRetryableError,
} from '../errors/errorUtils.ts';
import {
  NetworkError,
  AuthenticationError,
  TimeoutError,
  ValidationError,
} from '../errors/FitNovaError.ts';

describe('Sprint 2.5 — Platform Integration Suite', () => {
  // --------------------------------------------------------------------------
  // 1. Container Cohesion & Service Wiring
  // --------------------------------------------------------------------------
  describe('PlatformContainer Cohesion', () => {
    it('initializes all 13 platform subsystems with a single root container', () => {
      const container = createPlatformContainer();

      expect(container.config).toBeDefined();
      expect(container.logger).toBeDefined();
      expect(container.storage).toBeDefined();
      expect(container.events).toBeDefined();
      expect(container.notifications).toBeDefined();
      expect(container.analytics).toBeDefined();
      expect(container.telemetry).toBeDefined();
      expect(container.featureFlags).toBeDefined();
      expect(container.network).toBeDefined();
      expect(container.apiClient).toBeDefined();
      expect(container.offline).toBeDefined();
      expect(container.sync).toBeDefined();
      expect(container.lifecycle).toBeDefined();

      expect(container.lifecycle.getState()).toBe('ready');

      // Cleanup
      container.destroy();
      expect(container.lifecycle.getState()).toBe('shutdown');
    });
  });

  // --------------------------------------------------------------------------
  // 2. ApiClient Network Integration & Resilience
  // --------------------------------------------------------------------------
  describe('ApiClient Integration', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('injects X-Correlation-ID and Accept headers into requests', async () => {
      let capturedHeaders: HeadersInit | undefined;

      globalThis.fetch = vi.fn().mockImplementation(async (_url, init) => {
        capturedHeaders = init?.headers;
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const client = new ApiClient({ baseUrl: 'https://api.fitnova.ai' });
      const result = await client.get<{ success: boolean }>('/health');

      expect(result).toEqual({ success: true });
      expect(capturedHeaders).toBeDefined();
      const headersRecord = capturedHeaders as Record<string, string>;
      expect(headersRecord['X-Correlation-ID']).toMatch(/^req_\d+_\d+$/);
      expect(headersRecord['Accept']).toBe('application/json');
    });

    it('rejects fast without invoking fetch when device is offline', async () => {
      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy;

      const networkService = new NetworkService({ initialOnline: false });
      const client = new ApiClient({
        baseUrl: 'https://api.fitnova.ai',
        networkService,
      });

      await expect(client.get('/dashboard')).rejects.toThrow(NetworkError);
      expect(fetchSpy).not.toHaveBeenCalled();

      networkService.destroy();
    });

    it('records latency metrics to TelemetryService upon successful requests', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const capturedEvents: any[] = [];
      const telemetryService = new TelemetryService({
        adapters: [
          {
            record: (event) => {
              capturedEvents.push(event);
            },
          },
        ],
      });

      const client = new ApiClient({
        baseUrl: 'https://api.fitnova.ai',
        telemetryService,
      });

      await client.get('/status');

      expect(capturedEvents.length).toBeGreaterThan(0);
      expect(capturedEvents[0].type).toBe('API_LATENCY');
      expect(capturedEvents[0].sourceModule).toBe('ApiClient');
      expect(capturedEvents[0].metadata?.endpoint).toBe('/status');
      expect(capturedEvents[0].metadata?.status).toBe(200);
    });

    it('normalizes HTTP 401 Unauthorized into AuthenticationError', async () => {
      const onAuthErrorSpy = vi.fn();
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: 'Invalid or expired token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const client = new ApiClient({
        baseUrl: 'https://api.fitnova.ai',
        onAuthError: onAuthErrorSpy,
      });

      await expect(client.get('/profile')).rejects.toThrow(AuthenticationError);
      expect(onAuthErrorSpy).toHaveBeenCalledWith(401);
    });

    it('normalizes HTTP 422 Unprocessable Entity into ValidationError', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: 'Invalid food serving size' }), {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const client = new ApiClient({ baseUrl: 'https://api.fitnova.ai' });
      await expect(client.post('/logs/nutrition', { food_id: 'abc' })).rejects.toThrow(ValidationError);
    });

    it('enforces idempotency policy: retries GET on 503, but DOES NOT retry POST', async () => {
      let fetchCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        fetchCount++;
        return new Response(JSON.stringify({ error: 'Service Unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const client = new ApiClient({
        baseUrl: 'https://api.fitnova.ai',
        maxRetries: 2,
      });

      // 1. GET is idempotent -> attempt 0 + 2 retries = 3 calls
      fetchCount = 0;
      await expect(client.get('/sync-status')).rejects.toThrow();
      expect(fetchCount).toBe(3);

      // 2. POST is mutation -> non-idempotent -> 1 call only, zero retries
      fetchCount = 0;
      await expect(client.post('/charges/checkout', { plan: 'pro' })).rejects.toThrow();
      expect(fetchCount).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // 3. EventBus Cross-Feature Reactivity
  // --------------------------------------------------------------------------
  describe('EventBus Cross-Feature Reactivity', () => {
    it('propagates WATER_LOGGED event from Nutrition to Dashboard listeners', () => {
      const eventBus = new EventBus();
      const dashboardState = { currentWaterMl: 1000, targetMl: 2500 };

      // Dashboard subscribes to water events
      const unsubscribe = eventBus.subscribe('WATER_LOGGED', (payload) => {
        dashboardState.currentWaterMl = payload.dailyTotalMl;
      });

      // Nutrition page emits water log
      eventBus.emit('WATER_LOGGED', {
        amountMl: 250,
        dailyTotalMl: 1250,
        timestamp: Date.now(),
      });

      expect(dashboardState.currentWaterMl).toBe(1250);

      unsubscribe();
      // Should not react after unsubscription
      eventBus.emit('WATER_LOGGED', {
        amountMl: 250,
        dailyTotalMl: 1500,
        timestamp: Date.now(),
      });
      expect(dashboardState.currentWaterMl).toBe(1250);
    });

    it('propagates MEAL_LOGGED events with calorie metrics across features', () => {
      const eventBus = new EventBus();
      const mealTracker = { totalCalories: 0, mealCount: 0 };

      eventBus.subscribe('MEAL_LOGGED', (payload) => {
        mealTracker.totalCalories += payload.calories;
        mealTracker.mealCount += 1;
      });

      eventBus.emit('MEAL_LOGGED', {
        mealId: 'food_apple_1',
        mealType: 'Breakfast',
        calories: 95,
        proteinGrams: 0,
        carbsGrams: 25,
        fatGrams: 0,
        timestamp: Date.now(),
      });

      eventBus.emit('MEAL_LOGGED', {
        mealId: 'food_chicken_2',
        mealType: 'Lunch',
        calories: 320,
        proteinGrams: 42,
        carbsGrams: 0,
        fatGrams: 8,
        timestamp: Date.now(),
      });

      expect(mealTracker.totalCalories).toBe(415);
      expect(mealTracker.mealCount).toBe(2);
    });

    it('isolates subscriber errors so one failure does not break other subscribers', () => {
      const errorLog: string[] = [];
      const eventBus = new EventBus({
        onError: (evt, err) => {
          errorLog.push(`${evt}: ${(err as Error).message}`);
        },
      });

      const healthySubscriber = vi.fn();
      const buggySubscriber = vi.fn().mockImplementation(() => {
        throw new Error('Subscriber exploded!');
      });

      eventBus.subscribe('WORKOUT_COMPLETED', buggySubscriber);
      eventBus.subscribe('WORKOUT_COMPLETED', healthySubscriber);

      eventBus.emit('WORKOUT_COMPLETED', {
        workoutId: 'w_123',
        durationSeconds: 3600,
        totalVolume: 5000,
        totalSets: 15,
        timestamp: Date.now(),
      });

      // Both were called
      expect(buggySubscriber).toHaveBeenCalledTimes(1);
      expect(healthySubscriber).toHaveBeenCalledTimes(1);
      expect(errorLog.length).toBe(1);
      expect(errorLog[0]).toContain('Subscriber exploded!');
    });
  });

  // --------------------------------------------------------------------------
  // 4. StorageService Namespacing & Migration
  // --------------------------------------------------------------------------
  describe('StorageService Namespacing & Backward Compatibility', () => {
    it('isolates keys with fitnova: namespace prefix while allowing legacy access', () => {
      const memoryAdapter = new MemoryStorageAdapter();

      // Simulate legacy unnamespaced key written by previous version
      memoryAdapter.setItem('fitnova-ui-theme', 'dark');

      const storage = new StorageService({
        adapter: memoryAdapter,
        namespace: 'fitnova:',
      });

      // New namespaced writes
      storage.set('sidebar_collapsed', 'true');
      expect(memoryAdapter.getItem('fitnova:sidebar_collapsed')).toBe('true');

      // Namespaced retrieval
      expect(storage.get('sidebar_collapsed')).toBe('true');

      // Direct adapter inspection confirms separation
      expect(memoryAdapter.getItem('fitnova-ui-theme')).toBe('dark');
      expect(storage.get('non_existent')).toBeNull();
    });

    it('safely serializes and deserializes structured data with fallback', () => {
      const storage = new StorageService({
        adapter: new MemoryStorageAdapter(),
      });

      const complexProfile = {
        name: 'Alex',
        goals: ['hypertrophy', 'endurance'],
        stats: { height: 180, weight: 78.5 },
      };

      storage.setJSON('user_profile', complexProfile);
      const retrieved = storage.getJSON<typeof complexProfile>('user_profile');

      expect(retrieved).toEqual(complexProfile);
      expect(retrieved?.goals).toContain('hypertrophy');
    });
  });

  // --------------------------------------------------------------------------
  // 5. Error Sanitization & Classification
  // --------------------------------------------------------------------------
  describe('Error Sanitization & Classification', () => {
    it('redacts sensitive Bearer tokens and passwords from error messages', () => {
      const rawErrorMsg = 'Failed request with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 and password="super_secret_password"';
      const sanitized = sanitizeErrorMessage(rawErrorMsg);

      expect(sanitized).not.toContain('eyJhbGci');
      expect(sanitized).not.toContain('super_secret_password');
      expect(sanitized).toContain('[REDACTED]');
    });

    it('normalizes generic Error instances with sanitization', () => {
      const raw = new Error('Connection failed with api_key=sk-1234567890abcdef');
      const normalized = normalizeError(raw);

      expect(normalized.message).not.toContain('sk-1234567890abcdef');
      expect(normalized.message).toContain('[REDACTED]');
    });

    it('accurately classifies retryable vs non-retryable errors', () => {
      const netError = new NetworkError('Server reset connection');
      expect(isRetryableError(netError)).toBe(true);

      const timeoutErr = new TimeoutError('Request timed out');
      expect(isRetryableError(timeoutErr)).toBe(true);

      const authErr = new AuthenticationError('Unauthorized access');
      expect(isRetryableError(authErr)).toBe(false);

      const validationErr = new ValidationError('Field email is invalid');
      expect(isRetryableError(validationErr)).toBe(false);
    });
  });
});
