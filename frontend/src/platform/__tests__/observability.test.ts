/**
 * FitNova AI — Sprint 5.1: Production Observability Test Suite
 * Validates operational event tracking, privacy sanitization, and EventBus/Telemetry reuse.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventBus } from '../events/EventBus.ts';
import { TelemetryService } from '../telemetry/TelemetryService.ts';
import { AnalyticsService } from '../analytics/AnalyticsService.ts';
import { ObservabilityService } from '../observability/ObservabilityService.ts';
import { defaultSanitizer } from '../logging/sanitizer.ts';
import type { TelemetryEvent, ITelemetryAdapter, AnalyticsEvent, IAnalyticsAdapter } from '../types/index.ts';

describe('Sprint 5.1 — Production Observability & Privacy', () => {
  let eventBus: EventBus;
  let telemetry: TelemetryService;
  let analytics: AnalyticsService;
  let observability: ObservabilityService;
  let recordedTelemetry: TelemetryEvent[] = [];
  let trackedAnalytics: AnalyticsEvent[] = [];

  const mockTelemetryAdapter: ITelemetryAdapter = {
    record: (event) => {
      recordedTelemetry.push(event);
    },
  };

  const mockAnalyticsAdapter: IAnalyticsAdapter = {
    track: (event) => {
      trackedAnalytics.push(event);
    },
  };

  beforeEach(() => {
    recordedTelemetry = [];
    trackedAnalytics = [];

    eventBus = new EventBus();
    telemetry = new TelemetryService({
      enabled: true,
      adapters: [mockTelemetryAdapter],
    });
    analytics = new AnalyticsService({
      enabled: true,
      adapters: [mockAnalyticsAdapter],
    });

    observability = new ObservabilityService({
      eventBus,
      telemetry,
      analytics,
      apiLatencyThresholdMs: 2000,
      syncDurationThresholdMs: 4000,
      attachWindowListeners: false,
    });
  });

  afterEach(() => {
    observability.destroy();
  });

  // =========================================================================
  // 1. Privacy & Redaction Tests
  // =========================================================================
  describe('Privacy & Sensitive Data Sanitization', () => {
    it('never logs raw API keys or passwords in metadata', () => {
      telemetry.recordApiFailure({
        endpoint: '/api/v1/sync',
        method: 'POST',
        error: 'Failed with key AIzaSyA1234567890abcdef1234567890ABCDEF',
        metadata: {
          apiKey: 'AIzaSyA1234567890abcdef1234567890ABCDEF',
          secret: 'super_secret_value',
          password: 'secretPassword123',
          normalField: 'safeValue',
        },
      });

      expect(recordedTelemetry.length).toBe(1);
      const event = recordedTelemetry[0];
      expect(event.type).toBe('API_FAILURE');

      const metadata = event.metadata as Record<string, unknown>;
      expect(metadata.apiKey).toBe('[REDACTED]');
      expect(metadata.secret).toBe('[REDACTED]');
      expect(metadata.password).toBe('[REDACTED]');
      expect(metadata.normalField).toBe('safeValue');
      // String in error message is also redacted
      expect(metadata.error).toContain('[API_KEY_REDACTED]');
    });

    it('never logs JWT tokens or Bearer authorization headers', () => {
      const fakeJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w';
      telemetry.recordApplicationError({
        source: 'AuthHandler',
        error: `Failed with Bearer ${fakeJwt} and raw token ${fakeJwt}`,
        metadata: {
          token: fakeJwt,
          fitnova_token: fakeJwt,
          authorization: `Bearer ${fakeJwt}`,
        },
      });

      expect(recordedTelemetry.length).toBe(1);
      const event = recordedTelemetry[0];
      const metadata = event.metadata as Record<string, unknown>;

      expect(metadata.token).toBe('[REDACTED]');
      expect(metadata.fitnova_token).toBe('[REDACTED]');
      expect(metadata.authorization).toBe('[REDACTED]');
      expect(metadata.error).toContain('Bearer [REDACTED]');
      expect(metadata.error).toContain('[JWT_REDACTED]');
    });

    it('never logs raw biometric payloads or sensor streams', () => {
      telemetry.recordWearableConnectionFailure({
        provider: 'web_bluetooth_hr',
        metadata: {
          ecg: [1.2, 1.4, 0.9, 2.1],
          ppg: [120, 125, 118],
          raw_samples: [72, 73, 75, 78],
          accelerometer: { x: 0.1, y: 0.2, z: 9.8 },
          rrIntervals: [820, 830, 815],
          safeSummary: { avgHr: 74 },
        },
      });

      expect(recordedTelemetry.length).toBe(1);
      const event = recordedTelemetry[0];
      const metadata = event.metadata as Record<string, unknown>;

      expect(metadata.ecg).toBe('[REDACTED]');
      expect(metadata.ppg).toBe('[REDACTED]');
      expect(metadata.raw_samples).toBe('[REDACTED]');
      expect(metadata.accelerometer).toBe('[REDACTED]');
      expect(metadata.rrIntervals).toBe('[REDACTED]');
      expect((metadata.safeSummary as Record<string, unknown>).avgHr).toBe(74);
    });

    it('never logs unnecessary PII (email, phone, address, ssn)', () => {
      telemetry.recordApplicationError({
        source: 'ProfileSync',
        error: 'Failed sync for user john.doe@example.com',
        metadata: {
          email: 'john.doe@example.com',
          phone: '+1-555-123-4567',
          address: '123 Main St, Springfield',
          ssn: '000-12-3456',
          fullName: 'John Doe',
          publicUserId: 'usr_abc123',
        },
      });

      expect(recordedTelemetry.length).toBe(1);
      const event = recordedTelemetry[0];
      const metadata = event.metadata as Record<string, unknown>;

      expect(metadata.email).toBe('[REDACTED]');
      expect(metadata.phone).toBe('[REDACTED]');
      expect(metadata.address).toBe('[REDACTED]');
      expect(metadata.ssn).toBe('[REDACTED]');
      expect(metadata.fullName).toBe('[REDACTED]');
      expect(metadata.publicUserId).toBe('usr_abc123');
      expect(metadata.error).toContain('[EMAIL_REDACTED]');
    });

    it('minimizes and anonymizes health data telemetry payloads', () => {
      const rawHealthPayload = {
        provider: 'apple_health',
        source: 'AppleWatch',
        status: 'synced',
        sampleCount: 150,
        raw_samples: [60, 65, 70, 72],
        userEmail: 'athlete@example.com',
        confidence: 0.95,
      };

      const minimized = defaultSanitizer.minimizeHealthTelemetry(rawHealthPayload);

      expect(minimized.provider).toBe('apple_health');
      expect(minimized.source).toBe('AppleWatch');
      expect(minimized.status).toBe('synced');
      expect(minimized.sampleCount).toBe(150);
      expect(minimized.confidence).toBe(0.95);
      expect(minimized.raw_samples).toBeUndefined();
      expect(minimized.userEmail).toBeUndefined();
    });
  });

  // =========================================================================
  // 2. Operational Event Tracking & EventBus Reuse Tests
  // =========================================================================
  describe('Operational Event Tracking via EventBus', () => {
    it('tracks API failures via EventBus and records in both Telemetry and Analytics', () => {
      eventBus.emit('API_FAILURE', {
        endpoint: '/api/workouts/active',
        method: 'POST',
        statusCode: 500,
        error: 'Internal Server Error',
        durationMs: 450,
        correlationId: 'req_123',
        timestamp: Date.now(),
      });

      expect(recordedTelemetry.length).toBe(1);
      expect(recordedTelemetry[0].type).toBe('API_FAILURE');
      expect(recordedTelemetry[0].statusCode).toBe(500);
      expect(recordedTelemetry[0].endpoint).toBe('/api/workouts/active');

      expect(trackedAnalytics.length).toBe(1);
      expect(trackedAnalytics[0].name).toBe('API_FAILURE');
      expect(trackedAnalytics[0].metadata?.statusCode).toBe(500);
    });

    it('tracks Workout failures on session operations', () => {
      observability.trackWorkoutFailure({
        action: 'log_set',
        error: 'Storage quota exceeded',
        workoutId: 'w_push_1',
        sessionId: 'sess_999',
      });

      expect(recordedTelemetry.length).toBe(1);
      expect(recordedTelemetry[0].type).toBe('WORKOUT_FAILURE');
      expect(recordedTelemetry[0].metadata?.action).toBe('log_set');
      expect(recordedTelemetry[0].metadata?.workoutId).toBe('w_push_1');

      expect(trackedAnalytics.length).toBe(1);
      expect(trackedAnalytics[0].name).toBe('WORKOUT_FAILURE');
      expect(trackedAnalytics[0].metadata?.action).toBe('log_set');
    });

    it('tracks Sync failures from SyncManager events', () => {
      eventBus.emit('SYNC_FAILED', {
        syncId: 'sync_abc',
        failedCount: 3,
        error: '3 offline operations failed',
        timestamp: Date.now(),
      });

      expect(recordedTelemetry.length).toBe(1);
      expect(recordedTelemetry[0].type).toBe('SYNC_FAILURE');
      expect(recordedTelemetry[0].metadata?.failedCount).toBe(3);

      expect(trackedAnalytics.length).toBe(1);
      expect(trackedAnalytics[0].name).toBe('SYNC_FAILURE');
      expect(trackedAnalytics[0].metadata?.failedCount).toBe(3);
    });

    it('tracks wearable connection failures and disconnections', () => {
      // 1. Connection Failure
      eventBus.emit('WEARABLE_CONNECTION_FAILURE', {
        provider: 'web_bluetooth_hr',
        error: 'GATT connection timeout',
        timestamp: Date.now(),
      });

      // 2. Disconnection
      eventBus.emit('WEARABLE_DISCONNECTED', {
        provider: 'web_bluetooth_hr',
        reason: 'Device out of range',
        timestamp: Date.now(),
      });

      expect(recordedTelemetry.length).toBe(2);
      expect(recordedTelemetry[0].type).toBe('WEARABLE_CONNECTION_FAILURE');
      expect(recordedTelemetry[0].metadata?.provider).toBe('web_bluetooth_hr');

      expect(recordedTelemetry[1].type).toBe('WEARABLE_DISCONNECTED');
      expect(recordedTelemetry[1].metadata?.reason).toBe('Device out of range');

      expect(trackedAnalytics.length).toBe(2);
      expect(trackedAnalytics[0].name).toBe('WEARABLE_CONNECTION_FAILURE');
      expect(trackedAnalytics[1].name).toBe('WEARABLE_DISCONNECTED');
    });

    it('tracks wearable state transitions to error or disconnected automatically', () => {
      eventBus.emit('HEALTH_PROVIDER_STATE_CHANGED', {
        state: 'error',
        provider: 'mock_heart_rate',
      });

      expect(recordedTelemetry.length).toBe(1);
      expect(recordedTelemetry[0].type).toBe('WEARABLE_CONNECTION_FAILURE');
      expect(recordedTelemetry[0].metadata?.provider).toBe('mock_heart_rate');

      eventBus.emit('HEALTH_PROVIDER_STATE_CHANGED', {
        state: 'disconnected',
        provider: 'mock_heart_rate',
      });

      expect(recordedTelemetry.length).toBe(2);
      expect(recordedTelemetry[1].type).toBe('WEARABLE_DISCONNECTED');
    });

    it('tracks adaptive decision failures', () => {
      observability.trackAdaptiveDecisionFailure({
        engine: 'AdaptiveTrainingEngine',
        action: 'evaluateTrainingDecision',
        error: 'Invalid recovery metrics',
      });

      expect(recordedTelemetry.length).toBe(1);
      expect(recordedTelemetry[0].type).toBe('ADAPTIVE_DECISION_FAILURE');
      expect(recordedTelemetry[0].metadata?.action).toBe('evaluateTrainingDecision');

      expect(trackedAnalytics.length).toBe(1);
      expect(trackedAnalytics[0].name).toBe('ADAPTIVE_DECISION_FAILURE');
    });

    it('tracks AI interaction failures from AI_REQUEST_FAILED and trackAIFailure', () => {
      eventBus.emit('AI_REQUEST_FAILED', {
        requestId: 'req_ai_1',
        feature: 'ai_coach',
        provider: 'gemini',
        error: 'Quota exhausted 429',
        timestamp: Date.now(),
      });

      expect(recordedTelemetry.length).toBe(1);
      expect(recordedTelemetry[0].type).toBe('AI_FAILURE');
      expect(recordedTelemetry[0].metadata?.feature).toBe('ai_coach');

      expect(trackedAnalytics.length).toBe(1);
      expect(trackedAnalytics[0].name).toBe('AI_FAILURE');
    });

    it('tracks application errors with error classification and context', () => {
      observability.trackApplicationError({
        source: 'GlobalErrorBoundary',
        error: 'Uncaught TypeError: Cannot read properties of undefined',
        code: 'REACT_RENDER_ERROR',
        recoverability: 'retryable',
        componentStack: 'in ActiveWorkout\n in ErrorBoundary',
      });

      expect(recordedTelemetry.length).toBe(1);
      expect(recordedTelemetry[0].type).toBe('APPLICATION_ERROR');
      expect(recordedTelemetry[0].metadata?.code).toBe('REACT_RENDER_ERROR');
      expect(recordedTelemetry[0].metadata?.recoverability).toBe('retryable');

      expect(trackedAnalytics.length).toBe(1);
      expect(trackedAnalytics[0].name).toBe('APPLICATION_ERROR');
    });

    it('tracks performance issues when duration exceeds threshold', () => {
      // 1. Direct performance issue tracking
      observability.trackPerformanceIssue({
        metric: 'RENDER_TIME',
        durationMs: 3500,
        thresholdMs: 1000,
        sourceModule: 'ActiveWorkout',
      });

      // 2. Performance issue detected from high sync duration
      eventBus.emit('SYNC_COMPLETED', {
        syncId: 'sync_long',
        syncedCount: 10,
        failedCount: 0,
        durationMs: 6500, // threshold is 4000ms
        timestamp: Date.now(),
      });

      expect(recordedTelemetry.length).toBe(2);
      expect(recordedTelemetry[0].type).toBe('PERFORMANCE_ISSUE');
      expect(recordedTelemetry[0].durationMs).toBe(3500);

      expect(recordedTelemetry[1].type).toBe('PERFORMANCE_ISSUE');
      expect(recordedTelemetry[1].durationMs).toBe(6500);
      expect(recordedTelemetry[1].metadata?.metric).toBe('SYNC_DURATION');

      expect(trackedAnalytics.length).toBe(2);
      expect(trackedAnalytics[0].name).toBe('PERFORMANCE_ISSUE');
      expect(trackedAnalytics[1].name).toBe('PERFORMANCE_ISSUE');
    });
  });

  // =========================================================================
  // 3. Lifecycle & Cleanup Tests
  // =========================================================================
  describe('Observability Lifecycle', () => {
    it('unsubscribes all listeners on destroy and prevents leaked telemetry', () => {
      observability.destroy();

      eventBus.emit('API_FAILURE', {
        endpoint: '/api/test',
        statusCode: 500,
        error: 'Late error',
        timestamp: Date.now(),
      });

      expect(recordedTelemetry.length).toBe(0);
      expect(trackedAnalytics.length).toBe(0);
    });
  });
});
