/**
 * FitNova AI — Platform Telemetry Types
 * Tracks system behavior, latency, performance, cache efficiency, and health.
 * Strictly decoupled from product analytics; never records sensitive credentials.
 */

export type TelemetryEventType =
  | 'API_LATENCY'
  | 'AI_LATENCY'
  | 'PAGE_LOAD_METRIC'
  | 'RENDER_METRIC'
  | 'REQUEST_FAILED'
  | 'CACHE_HIT'
  | 'CACHE_MISS'
  | 'NETWORK_STATE_CHANGE'
  | 'SYNC_DURATION'
  | 'PLATFORM_ERROR'
  | 'ADAPTIVE_ENGINE_METRIC'
  | 'SAFETY_ENGINE_METRIC'
  | 'SAFETY_INTERVENTION_FIRED'
  // Sprint 5.1 — Production Observability Operational Events
  | 'API_FAILURE'
  | 'WORKOUT_FAILURE'
  | 'SYNC_FAILURE'
  | 'WEARABLE_CONNECTION_FAILURE'
  | 'WEARABLE_DISCONNECTED'
  | 'ADAPTIVE_DECISION_FAILURE'
  | 'AI_FAILURE'
  | 'APPLICATION_ERROR'
  | 'PERFORMANCE_ISSUE';

export interface TelemetryEvent {
  type: TelemetryEventType;
  timestamp: number;
  durationMs?: number;
  statusCode?: number;
  endpoint?: string;
  sourceModule: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
}

export interface ITelemetryAdapter {
  record(event: TelemetryEvent): void | Promise<void>;
}
