/**
 * FitNova AI — Platform Production Observability Service (Sprint 5.1)
 * Central coordinator bridging EventBus, TelemetryService, AnalyticsService, and Logger.
 * Unifies failure tracking, health minimization, PII/secret protection,
 * and performance issue detection without duplicating infrastructure.
 */

import type { EventBus } from '../events/EventBus.ts';
import type { TelemetryService } from '../telemetry/TelemetryService.ts';
import type { AnalyticsService } from '../analytics/AnalyticsService.ts';
import type { Logger, IModuleLogger } from '../logging/Logger.ts';
import { defaultSanitizer } from '../logging/sanitizer.ts';
import type {
  ApiFailurePayload,
  WorkoutFailurePayload,
  SyncFailurePayload,
  WearableConnectionFailurePayload,
  WearableDisconnectedPayload,
  AdaptiveDecisionFailurePayload,
  AIFailurePayload,
  ApplicationErrorPayload,
  PerformanceIssuePayload,
  SyncCompletedPayload,
  SyncFailedPayload,
  HealthSyncFailedPayload,
  AIRequestFailedPayload,
  AIRequestCompletedPayload,
} from '../types/events.ts';

export interface ObservabilityConfig {
  eventBus: EventBus;
  telemetry: TelemetryService;
  analytics: AnalyticsService;
  logger?: Logger | IModuleLogger;
  apiLatencyThresholdMs?: number;
  syncDurationThresholdMs?: number;
  attachWindowListeners?: boolean;
}

export class ObservabilityService {
  private readonly eventBus: EventBus;
  private readonly telemetry: TelemetryService;
  private readonly analytics: AnalyticsService;
  private readonly logger?: IModuleLogger;
  private readonly apiLatencyThresholdMs: number;
  private readonly syncDurationThresholdMs: number;

  private unsubs: Array<() => void> = [];
  private windowErrorListener?: (event: ErrorEvent) => void;
  private windowRejectionListener?: (event: PromiseRejectionEvent) => void;
  private windowCustomAppErrorListener?: (event: Event) => void;

  constructor(config: ObservabilityConfig) {
    this.eventBus = config.eventBus;
    this.telemetry = config.telemetry;
    this.analytics = config.analytics;
    this.logger = config.logger?.forModule('Observability');
    this.apiLatencyThresholdMs = config.apiLatencyThresholdMs ?? 3000;
    this.syncDurationThresholdMs = config.syncDurationThresholdMs ?? 5000;

    this.attachEventListeners();

    if (config.attachWindowListeners !== false && typeof window !== 'undefined') {
      this.attachGlobalWindowListeners();
    }
  }

  // ==========================================
  // EVENTBUS INTEGRATION (REUSING EXISTING BUS)
  // ==========================================

  private attachEventListeners(): void {
    // 1. API Failures
    this.unsubs.push(
      this.eventBus.subscribe('API_FAILURE', (payload: ApiFailurePayload) => {
        this.handleApiFailure(payload);
      })
    );

    // 2. Workout Failures
    this.unsubs.push(
      this.eventBus.subscribe('WORKOUT_FAILURE', (payload: WorkoutFailurePayload) => {
        this.handleWorkoutFailure(payload);
      })
    );

    // 3. Sync Failures
    this.unsubs.push(
      this.eventBus.subscribe('SYNC_FAILURE', (payload: SyncFailurePayload) => {
        this.handleSyncFailure(payload);
      })
    );
    this.unsubs.push(
      this.eventBus.subscribe('SYNC_FAILED', (payload: SyncFailedPayload) => {
        this.handleSyncFailure({
          syncId: payload.syncId,
          failedCount: payload.failedCount,
          error: payload.error,
          timestamp: payload.timestamp,
        });
      })
    );

    // 4. Wearable Connection Failures & Disconnections
    this.unsubs.push(
      this.eventBus.subscribe('WEARABLE_CONNECTION_FAILURE', (payload: WearableConnectionFailurePayload) => {
        this.handleWearableConnectionFailure(payload);
      })
    );
    this.unsubs.push(
      this.eventBus.subscribe('WEARABLE_DISCONNECTED', (payload: WearableDisconnectedPayload) => {
        this.handleWearableDisconnected(payload);
      })
    );
    this.unsubs.push(
      this.eventBus.subscribe('HEALTH_PROVIDER_STATE_CHANGED', (payload: { state: string; provider?: string }) => {
        const provider = payload.provider || 'wearable';
        if (payload.state === 'error' || payload.state === 'unavailable') {
          this.handleWearableConnectionFailure({
            provider,
            error: `Provider entered ${payload.state} state`,
            timestamp: Date.now(),
          });
        } else if (payload.state === 'disconnected') {
          this.handleWearableDisconnected({
            provider,
            reason: 'State changed to disconnected',
            timestamp: Date.now(),
          });
        }
      })
    );
    this.unsubs.push(
      this.eventBus.subscribe('HEALTH_SYNC_FAILED', (payload: HealthSyncFailedPayload) => {
        this.handleSyncFailure({
          syncId: `health_${payload.provider || 'wearable'}`,
          failedCount: 1,
          error: payload.error,
          timestamp: payload.timestamp,
        });
      })
    );

    // 5. Adaptive Decision Failures
    this.unsubs.push(
      this.eventBus.subscribe('ADAPTIVE_DECISION_FAILURE', (payload: AdaptiveDecisionFailurePayload) => {
        this.handleAdaptiveDecisionFailure(payload);
      })
    );

    // 6. AI Interaction Failures
    this.unsubs.push(
      this.eventBus.subscribe('AI_FAILURE', (payload: AIFailurePayload) => {
        this.handleAIFailure(payload);
      })
    );
    this.unsubs.push(
      this.eventBus.subscribe('AI_REQUEST_FAILED', (payload: AIRequestFailedPayload) => {
        this.handleAIFailure({
          feature: payload.feature,
          provider: payload.provider,
          error: payload.error,
          timestamp: payload.timestamp,
        });
      })
    );

    // 7. Application Errors
    this.unsubs.push(
      this.eventBus.subscribe('APPLICATION_ERROR', (payload: ApplicationErrorPayload) => {
        this.handleApplicationError(payload);
      })
    );

    // 8. Performance Issues
    this.unsubs.push(
      this.eventBus.subscribe('PERFORMANCE_ISSUE', (payload: PerformanceIssuePayload) => {
        this.handlePerformanceIssue(payload);
      })
    );

    // Automatic Performance Monitoring on Sync and AI latency
    this.unsubs.push(
      this.eventBus.subscribe('SYNC_COMPLETED', (payload: SyncCompletedPayload) => {
        if (payload.durationMs > this.syncDurationThresholdMs) {
          this.handlePerformanceIssue({
            metric: 'SYNC_DURATION',
            durationMs: payload.durationMs,
            thresholdMs: this.syncDurationThresholdMs,
            sourceModule: 'SyncManager',
            details: {
              syncId: payload.syncId,
              syncedCount: payload.syncedCount,
              failedCount: payload.failedCount,
            },
            timestamp: payload.timestamp,
          });
        }
      })
    );

    this.unsubs.push(
      this.eventBus.subscribe('AI_REQUEST_COMPLETED', (payload: AIRequestCompletedPayload) => {
        if (payload.latencyMs > this.apiLatencyThresholdMs) {
          this.handlePerformanceIssue({
            metric: 'AI_LATENCY',
            durationMs: payload.latencyMs,
            thresholdMs: this.apiLatencyThresholdMs,
            sourceModule: 'AIService',
            details: {
              feature: payload.feature,
              provider: payload.provider,
            },
            timestamp: payload.timestamp,
          });
        }
      })
    );
  }

  // ==========================================
  // GLOBAL BROWSER ERROR MONITORING
  // ==========================================

  private attachGlobalWindowListeners(): void {
    this.windowErrorListener = (event: ErrorEvent) => {
      this.trackApplicationError({
        source: 'WindowGlobalError',
        error: event.error || event.message,
        code: 'UNCAUGHT_EXCEPTION',
        componentStack: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined,
      });
    };

    this.windowRejectionListener = (event: PromiseRejectionEvent) => {
      this.trackApplicationError({
        source: 'UnhandledPromiseRejection',
        error: event.reason,
        code: 'UNHANDLED_REJECTION',
      });
    };

    this.windowCustomAppErrorListener = (event: Event) => {
      const customEvt = event as CustomEvent<{
        source?: string;
        error?: unknown;
        code?: string;
        recoverability?: string;
        componentStack?: string;
      }>;
      if (customEvt.detail) {
        this.trackApplicationError({
          source: customEvt.detail.source || 'ReactErrorBoundary',
          error: customEvt.detail.error,
          code: customEvt.detail.code,
          recoverability: customEvt.detail.recoverability,
          componentStack: customEvt.detail.componentStack,
        });
      }
    };

    window.addEventListener('error', this.windowErrorListener);
    window.addEventListener('unhandledrejection', this.windowRejectionListener);
    window.addEventListener('fitnova:application_error', this.windowCustomAppErrorListener);
  }

  // ==========================================
  // OPERATIONAL EVENT HANDLERS
  // ==========================================

  private handleApiFailure(payload: ApiFailurePayload): void {
    const sanitizedError = defaultSanitizer.sanitize(payload.error) as string;
    this.telemetry.recordApiFailure({
      endpoint: payload.endpoint,
      method: payload.method,
      statusCode: payload.statusCode,
      durationMs: payload.durationMs,
      error: sanitizedError,
      correlationId: payload.correlationId,
    });

    this.analytics.track('API_FAILURE', {
      endpoint: payload.endpoint,
      method: payload.method,
      statusCode: payload.statusCode,
      durationMs: payload.durationMs,
      error: sanitizedError,
    });

    this.logger?.warn(`[Observability] API Failure on ${payload.method || 'GET'} ${payload.endpoint}`, {
      status: payload.statusCode,
      error: sanitizedError,
    });
  }

  private handleWorkoutFailure(payload: WorkoutFailurePayload): void {
    const sanitizedError = defaultSanitizer.sanitize(payload.error) as string;
    this.telemetry.recordWorkoutFailure({
      workoutId: payload.workoutId,
      sessionId: payload.sessionId,
      action: payload.action,
      error: sanitizedError,
    });

    this.analytics.track('WORKOUT_FAILURE', {
      workoutId: payload.workoutId,
      sessionId: payload.sessionId,
      action: payload.action,
      error: sanitizedError,
    });

    this.logger?.error(`[Observability] Workout Failure during [${payload.action}]`, {
      workoutId: payload.workoutId,
      sessionId: payload.sessionId,
      error: sanitizedError,
    });
  }

  private handleSyncFailure(payload: SyncFailurePayload): void {
    const sanitizedError = defaultSanitizer.sanitize(payload.error) as string;
    this.telemetry.recordSyncFailure({
      syncId: payload.syncId,
      failedCount: payload.failedCount,
      error: sanitizedError,
    });

    this.analytics.track('SYNC_FAILURE', {
      syncId: payload.syncId,
      failedCount: payload.failedCount,
      error: sanitizedError,
    });

    this.logger?.warn(`[Observability] Sync Failure (failed ops: ${payload.failedCount})`, {
      syncId: payload.syncId,
      error: sanitizedError,
    });
  }

  private handleWearableConnectionFailure(payload: WearableConnectionFailurePayload): void {
    const sanitizedError = defaultSanitizer.sanitize(payload.error) as string;
    this.telemetry.recordWearableConnectionFailure({
      provider: payload.provider,
      error: sanitizedError,
    });

    this.analytics.track('WEARABLE_CONNECTION_FAILURE', {
      provider: payload.provider,
      error: sanitizedError,
    });

    this.logger?.warn(`[Observability] Wearable Connection Failed: ${payload.provider}`, {
      error: sanitizedError,
    });
  }

  private handleWearableDisconnected(payload: WearableDisconnectedPayload): void {
    this.telemetry.recordWearableDisconnection({
      provider: payload.provider,
      reason: payload.reason,
    });

    this.analytics.track('WEARABLE_DISCONNECTED', {
      provider: payload.provider,
      reason: payload.reason,
    });

    this.logger?.info(`[Observability] Wearable Disconnected: ${payload.provider}`, {
      reason: payload.reason,
    });
  }

  private handleAdaptiveDecisionFailure(payload: AdaptiveDecisionFailurePayload): void {
    const sanitizedError = defaultSanitizer.sanitize(payload.error) as string;
    this.telemetry.recordAdaptiveDecisionFailure({
      engine: payload.engine,
      action: payload.action,
      error: sanitizedError,
    });

    this.analytics.track('ADAPTIVE_DECISION_FAILURE', {
      engine: payload.engine,
      action: payload.action,
      error: sanitizedError,
    });

    this.logger?.warn(`[Observability] Adaptive Decision Failed in ${payload.engine || 'Engine'}`, {
      action: payload.action,
      error: sanitizedError,
    });
  }

  private handleAIFailure(payload: AIFailurePayload): void {
    const sanitizedError = defaultSanitizer.sanitize(payload.error) as string;
    this.telemetry.recordAIFailure({
      feature: payload.feature,
      provider: payload.provider,
      error: sanitizedError,
      durationMs: payload.durationMs,
    });

    this.analytics.track('AI_FAILURE', {
      feature: payload.feature,
      provider: payload.provider,
      error: sanitizedError,
      durationMs: payload.durationMs,
    });

    this.logger?.warn(`[Observability] AI Failure for ${payload.feature}`, {
      provider: payload.provider,
      error: sanitizedError,
    });
  }

  private handleApplicationError(payload: ApplicationErrorPayload): void {
    const sanitizedError = defaultSanitizer.sanitize(payload.error) as string;
    this.telemetry.recordApplicationError({
      source: payload.source,
      error: sanitizedError,
      code: payload.code,
      recoverability: payload.recoverability,
      metadata: payload.componentStack ? { componentStack: payload.componentStack } : undefined,
    });

    this.analytics.track('APPLICATION_ERROR', {
      source: payload.source,
      error: sanitizedError,
      code: payload.code,
      recoverability: payload.recoverability,
    });

    this.logger?.error(`[Observability] Application Error in [${payload.source}]`, {
      code: payload.code,
      error: sanitizedError,
    });
  }

  private handlePerformanceIssue(payload: PerformanceIssuePayload): void {
    const sanitizedDetails = payload.details
      ? (defaultSanitizer.sanitize(payload.details) as Record<string, unknown>)
      : undefined;

    this.telemetry.recordPerformanceIssue({
      metric: payload.metric,
      durationMs: payload.durationMs,
      thresholdMs: payload.thresholdMs,
      sourceModule: payload.sourceModule,
      metadata: sanitizedDetails,
    });

    this.analytics.track('PERFORMANCE_ISSUE', {
      metric: payload.metric,
      durationMs: payload.durationMs,
      thresholdMs: payload.thresholdMs,
      sourceModule: payload.sourceModule,
      details: sanitizedDetails,
    });

    this.logger?.warn(`[Observability] Performance Issue on ${payload.metric}`, {
      durationMs: payload.durationMs,
      thresholdMs: payload.thresholdMs,
      sourceModule: payload.sourceModule,
    });
  }

  // ==========================================
  // DIRECT PUBLIC TRACKING APIS
  // ==========================================

  trackApiFailure(params: {
    endpoint: string;
    method?: string;
    statusCode?: number;
    error: unknown;
    durationMs?: number;
    correlationId?: string;
  }): void {
    const errorStr = params.error instanceof Error ? params.error.message : String(params.error || 'API Failed');
    this.eventBus.emit('API_FAILURE', {
      endpoint: params.endpoint,
      method: params.method,
      statusCode: params.statusCode,
      error: errorStr,
      durationMs: params.durationMs,
      correlationId: params.correlationId,
      timestamp: Date.now(),
    });
  }

  trackWorkoutFailure(params: {
    action: string;
    error: unknown;
    workoutId?: string;
    sessionId?: string;
  }): void {
    const errorStr = params.error instanceof Error ? params.error.message : String(params.error || 'Workout Failed');
    this.eventBus.emit('WORKOUT_FAILURE', {
      action: params.action,
      error: errorStr,
      workoutId: params.workoutId,
      sessionId: params.sessionId,
      timestamp: Date.now(),
    });
  }

  trackSyncFailure(params: {
    syncId?: string;
    failedCount: number;
    error: unknown;
  }): void {
    const errorStr = params.error instanceof Error ? params.error.message : String(params.error || 'Sync Failed');
    this.eventBus.emit('SYNC_FAILURE', {
      syncId: params.syncId,
      failedCount: params.failedCount,
      error: errorStr,
      timestamp: Date.now(),
    });
  }

  trackWearableConnectionFailure(provider: string, error: unknown): void {
    const errorStr = error instanceof Error ? error.message : String(error || 'Connection Failed');
    this.eventBus.emit('WEARABLE_CONNECTION_FAILURE', {
      provider,
      error: errorStr,
      timestamp: Date.now(),
    });
  }

  trackWearableDisconnected(provider: string, reason?: string): void {
    this.eventBus.emit('WEARABLE_DISCONNECTED', {
      provider,
      reason,
      timestamp: Date.now(),
    });
  }

  trackAdaptiveDecisionFailure(params: {
    engine?: string;
    action?: string;
    error: unknown;
  }): void {
    const errorStr = params.error instanceof Error ? params.error.message : String(params.error || 'Adaptive Decision Failed');
    this.eventBus.emit('ADAPTIVE_DECISION_FAILURE', {
      engine: params.engine,
      action: params.action || 'evaluate',
      error: errorStr,
      timestamp: Date.now(),
    });
  }

  trackAIFailure(params: {
    feature: string;
    error: unknown;
    provider?: string;
    durationMs?: number;
  }): void {
    const errorStr = params.error instanceof Error ? params.error.message : String(params.error || 'AI Failed');
    this.eventBus.emit('AI_FAILURE', {
      feature: params.feature,
      provider: params.provider,
      error: errorStr,
      durationMs: params.durationMs,
      timestamp: Date.now(),
    });
  }

  trackApplicationError(params: {
    source: string;
    error: unknown;
    code?: string;
    recoverability?: string;
    componentStack?: string;
  }): void {
    const errorStr = params.error instanceof Error ? params.error.message : String(params.error || 'Application Error');
    this.eventBus.emit('APPLICATION_ERROR', {
      source: params.source,
      error: errorStr,
      code: params.code,
      recoverability: params.recoverability,
      componentStack: params.componentStack,
      timestamp: Date.now(),
    });
  }

  trackPerformanceIssue(params: {
    metric: string;
    durationMs: number;
    thresholdMs: number;
    sourceModule: string;
    details?: Record<string, unknown>;
  }): void {
    this.eventBus.emit('PERFORMANCE_ISSUE', {
      metric: params.metric,
      durationMs: params.durationMs,
      thresholdMs: params.thresholdMs,
      sourceModule: params.sourceModule,
      details: params.details,
      timestamp: Date.now(),
    });
  }

  // ==========================================
  // CLEANUP & LIFECYCLE
  // ==========================================

  destroy(): void {
    for (const unsub of this.unsubs) {
      unsub();
    }
    this.unsubs = [];

    if (typeof window !== 'undefined') {
      if (this.windowErrorListener) {
        window.removeEventListener('error', this.windowErrorListener);
      }
      if (this.windowRejectionListener) {
        window.removeEventListener('unhandledrejection', this.windowRejectionListener);
      }
      if (this.windowCustomAppErrorListener) {
        window.removeEventListener('fitnova:application_error', this.windowCustomAppErrorListener);
      }
    }
  }
}
