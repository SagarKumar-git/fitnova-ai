/**
 * FitNova AI — Platform Telemetry Service
 * System performance, latency, cache efficiency, and reliability tracking.
 * Strictly sanitizes all data; credentials and tokens are forbidden.
 */

import type {
  TelemetryEvent,
  TelemetryEventType,
  ITelemetryAdapter,
} from '../types/index.ts';
import { defaultSanitizer } from '../logging/sanitizer.ts';

export interface TelemetryServiceConfig {
  enabled?: boolean;
  adapters?: ITelemetryAdapter[];
}

export class TelemetryService {
  private enabled: boolean;
  private readonly adapters: ITelemetryAdapter[];

  constructor(config: TelemetryServiceConfig = {}) {
    this.enabled = config.enabled ?? true;
    this.adapters = config.adapters ?? [];
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  addAdapter(adapter: ITelemetryAdapter): void {
    this.adapters.push(adapter);
  }

  record(event: Omit<TelemetryEvent, 'timestamp'>): void {
    if (!this.enabled) return;

    const sanitizedMetadata = event.metadata
      ? (defaultSanitizer.sanitize(event.metadata) as Record<string, unknown>)
      : undefined;

    const fullEvent: TelemetryEvent = {
      ...event,
      timestamp: Date.now(),
      metadata: sanitizedMetadata,
    };

    for (const adapter of this.adapters) {
      try {
        adapter.record(fullEvent);
      } catch {
        // Isolation
      }
    }
  }

  recordLatency(
    type: 'API_LATENCY' | 'AI_LATENCY',
    sourceModule: string,
    durationMs: number,
    metadata?: Record<string, unknown>
  ): void {
    this.record({
      type,
      sourceModule,
      durationMs,
      metadata,
    });
  }

  recordCache(hit: boolean, sourceModule: string, key?: string): void {
    this.record({
      type: hit ? 'CACHE_HIT' : 'CACHE_MISS',
      sourceModule,
      metadata: key ? { cacheKey: key } : undefined,
    });
  }

  async time<T>(
    type: TelemetryEventType,
    sourceModule: string,
    operation: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await operation();
      const durationMs = Math.round(performance.now() - start);
      this.record({
        type,
        sourceModule,
        durationMs,
        metadata: { ...metadata, success: true },
      });
      return result;
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      this.record({
        type,
        sourceModule,
        durationMs,
        metadata: {
          ...metadata,
          success: false,
          error: err instanceof Error ? err.message : 'Operation failed',
        },
      });
      throw err;
    }
  }

  // ==========================================
  // SPRINT 5.1 — OPERATIONAL TELEMETRY HELPERS
  // ==========================================

  recordApiFailure(params: {
    endpoint: string;
    method?: string;
    statusCode?: number;
    durationMs?: number;
    error?: unknown;
    correlationId?: string;
    metadata?: Record<string, unknown>;
  }): void {
    this.record({
      type: 'API_FAILURE',
      sourceModule: 'ApiClient',
      endpoint: params.endpoint,
      statusCode: params.statusCode,
      durationMs: params.durationMs,
      correlationId: params.correlationId,
      metadata: {
        ...params.metadata,
        method: params.method || 'GET',
        error: params.error instanceof Error ? params.error.message : String(params.error || 'API call failed'),
      },
    });
  }

  recordWorkoutFailure(params: {
    workoutId?: string;
    sessionId?: string;
    action: string;
    error?: unknown;
    metadata?: Record<string, unknown>;
  }): void {
    this.record({
      type: 'WORKOUT_FAILURE',
      sourceModule: 'WorkoutService',
      metadata: {
        ...params.metadata,
        workoutId: params.workoutId,
        sessionId: params.sessionId,
        action: params.action,
        error: params.error instanceof Error ? params.error.message : String(params.error || 'Workout action failed'),
      },
    });
  }

  recordSyncFailure(params: {
    syncId?: string;
    failedCount?: number;
    error?: unknown;
    metadata?: Record<string, unknown>;
  }): void {
    this.record({
      type: 'SYNC_FAILURE',
      sourceModule: 'SyncManager',
      metadata: {
        ...params.metadata,
        syncId: params.syncId,
        failedCount: params.failedCount,
        error: params.error instanceof Error ? params.error.message : String(params.error || 'Sync failed'),
      },
    });
  }

  recordWearableConnectionFailure(params: {
    provider: string;
    error?: unknown;
    metadata?: Record<string, unknown>;
  }): void {
    this.record({
      type: 'WEARABLE_CONNECTION_FAILURE',
      sourceModule: 'HealthDataService',
      metadata: {
        ...params.metadata,
        provider: params.provider,
        error: params.error instanceof Error ? params.error.message : String(params.error || 'Connection failed'),
      },
    });
  }

  recordWearableDisconnection(params: {
    provider: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  }): void {
    this.record({
      type: 'WEARABLE_DISCONNECTED',
      sourceModule: 'HealthDataService',
      metadata: {
        ...params.metadata,
        provider: params.provider,
        reason: params.reason || 'Device disconnected',
      },
    });
  }

  recordAdaptiveDecisionFailure(params: {
    engine?: string;
    action?: string;
    error?: unknown;
    metadata?: Record<string, unknown>;
  }): void {
    this.record({
      type: 'ADAPTIVE_DECISION_FAILURE',
      sourceModule: params.engine || 'AdaptiveTrainingEngine',
      metadata: {
        ...params.metadata,
        action: params.action || 'evaluate',
        error: params.error instanceof Error ? params.error.message : String(params.error || 'Adaptive decision failed'),
      },
    });
  }

  recordAIFailure(params: {
    feature: string;
    provider?: string;
    error?: unknown;
    durationMs?: number;
    metadata?: Record<string, unknown>;
  }): void {
    this.record({
      type: 'AI_FAILURE',
      sourceModule: 'AIService',
      durationMs: params.durationMs,
      metadata: {
        ...params.metadata,
        feature: params.feature,
        provider: params.provider || 'gemini',
        error: params.error instanceof Error ? params.error.message : String(params.error || 'AI generation failed'),
      },
    });
  }

  recordApplicationError(params: {
    source: string;
    error?: unknown;
    code?: string;
    recoverability?: string;
    metadata?: Record<string, unknown>;
  }): void {
    this.record({
      type: 'APPLICATION_ERROR',
      sourceModule: params.source,
      metadata: {
        ...params.metadata,
        code: params.code,
        recoverability: params.recoverability,
        error: params.error instanceof Error ? params.error.message : String(params.error || 'Application error'),
      },
    });
  }

  recordPerformanceIssue(params: {
    metric: string;
    durationMs: number;
    thresholdMs: number;
    sourceModule: string;
    metadata?: Record<string, unknown>;
  }): void {
    this.record({
      type: 'PERFORMANCE_ISSUE',
      sourceModule: params.sourceModule,
      durationMs: params.durationMs,
      metadata: {
        ...params.metadata,
        metric: params.metric,
        thresholdMs: params.thresholdMs,
        exceededByMs: Math.max(0, params.durationMs - params.thresholdMs),
      },
    });
  }
}
