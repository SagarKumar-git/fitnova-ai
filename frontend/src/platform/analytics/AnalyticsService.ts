/**
 * FitNova AI — Product Analytics Service
 * Tracks user actions and product events with session IDs and user attribution.
 */

import type {
  AnalyticsEvent,
  AnalyticsEventType,
  IAnalyticsAdapter,
} from '../types/index.ts';
import { defaultSanitizer } from '../logging/sanitizer.ts';
import { isDevEnv } from '../utils/env.ts';
import { ConsoleAnalyticsAdapter } from './ConsoleAnalyticsAdapter.ts';

export interface AnalyticsServiceConfig {
  enabled?: boolean;
  adapters?: IAnalyticsAdapter[];
  sessionId?: string;
  isDev?: boolean;
}

export class AnalyticsService {
  private enabled: boolean;
  private readonly sessionId: string;
  private userId?: string;
  private readonly adapters: IAnalyticsAdapter[];

  constructor(config: AnalyticsServiceConfig = {}) {
    this.enabled = config.enabled ?? true;
    this.sessionId = config.sessionId ?? this.generateSessionId();
    this.adapters = config.adapters ?? [
      new ConsoleAnalyticsAdapter(config.isDev ?? isDevEnv()),
    ];
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getUserId(): string | undefined {
    return this.userId;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  identify(userId: string, traits?: Record<string, unknown>): void {
    if (!this.enabled) return;
    this.userId = userId;

    const sanitizedTraits = traits
      ? (defaultSanitizer.sanitize(traits) as Record<string, unknown>)
      : undefined;

    for (const adapter of this.adapters) {
      try {
        if (adapter.identify) {
          adapter.identify(userId, sanitizedTraits);
        }
      } catch {
        // Isolation
      }
    }
  }

  reset(): void {
    this.userId = undefined;
  }

  track(name: AnalyticsEventType | (string & {}), metadata?: Record<string, unknown>): void {
    if (!this.enabled) return;

    const sanitizedMetadata = metadata
      ? (defaultSanitizer.sanitize(metadata) as Record<string, unknown>)
      : undefined;

    const event: AnalyticsEvent = {
      name,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      metadata: sanitizedMetadata,
    };

    for (const adapter of this.adapters) {
      try {
        adapter.track(event);
      } catch {
        // Isolation: one adapter's failure cannot break tracking or app
      }
    }
  }
}
