/**
 * FitNova AI — Console Analytics Adapter
 * Development and fallback adapter that logs product events to console.
 */

import type { AnalyticsEvent, IAnalyticsAdapter } from '../types/index.ts';

export class ConsoleAnalyticsAdapter implements IAnalyticsAdapter {
  private readonly enabled: boolean;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  track(event: AnalyticsEvent): void {
    if (!this.enabled) return;
    if (typeof console !== 'undefined' && console.info) {
      console.info(`[Analytics] [${event.name}]`, {
        sessionId: event.sessionId,
        userId: event.userId,
        timestamp: new Date(event.timestamp).toISOString(),
        metadata: event.metadata,
      });
    }
  }

  identify(userId: string, traits?: Record<string, unknown>): void {
    if (!this.enabled) return;
    if (typeof console !== 'undefined' && console.info) {
      console.info(`[Analytics] [IDENTIFY] User: ${userId}`, traits);
    }
  }
}
