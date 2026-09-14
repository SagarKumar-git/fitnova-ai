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
}
