import type { EventBus } from '../../../platform/events/EventBus.ts';
import type { NormalizedHealthSignal } from '../health/healthTypes.ts';

const isDev = Boolean(
  typeof import.meta !== 'undefined' && import.meta.env?.DEV
);

/**
 * FitNova AI — Realtime Safety Diagnostics (DEV-ONLY)
 * Simulates wearable hardware signals, noisy spikes, stale readings, and disconnects
 * for local validation without requiring physical Bluetooth hardware.
 * Strictly forbidden in production builds.
 */
export class RealtimeSafetyDiagnostics {
  private readonly eventBus: EventBus;
  private readonly sessionId: string;

  constructor(eventBus: EventBus, sessionId: string) {
    if (!isDev) {
      throw new Error('RealtimeSafetyDiagnostics is strictly restricted to development/testing environments.');
    }
    this.eventBus = eventBus;
    this.sessionId = sessionId;
  }

  private emitHr(bpm: number, freshness: 'fresh' | 'aging' | 'stale' | 'unavailable' = 'fresh', ageMs: number = 0) {
    const signal: NormalizedHealthSignal<number> = {
      value: bpm,
      capturedAt: Date.now() - ageMs,
      source: 'diagnostics_simulator',
      freshness,
      confidence: freshness === 'stale' ? 0.2 : 0.99,
    };

    this.eventBus.emit('REALTIME_HEART_RATE_UPDATED', {
      heartRate: signal,
      timestamp: Date.now(),
    });
  }

  /**
   * Simulates normal cardiovascular output (e.g. 130 BPM).
   */
  public simulateNormalHr(bpm: number = 130): void {
    this.emitHr(bpm, 'fresh');
  }

  /**
   * Simulates elevated heart rate (e.g. 155 BPM).
   */
  public simulateElevatedHr(bpm: number = 155): void {
    this.emitHr(bpm, 'fresh');
  }

  /**
   * Simulates sustained high heart rate (e.g. 175 BPM) to trigger volume reduction.
   */
  public simulateHighHr(readingsCount: number = 3, bpm: number = 175): void {
    for (let i = 0; i < readingsCount; i++) {
      this.emitHr(bpm, 'fresh');
    }
  }

  /**
   * Simulates sustained critical heart rate (e.g. 192 BPM) to trigger stop and recover.
   */
  public simulateCriticalHr(readingsCount: number = 3, bpm: number = 192): void {
    for (let i = 0; i < readingsCount; i++) {
      this.emitHr(bpm, 'fresh');
    }
  }

  /**
   * Simulates an isolated noisy spike (e.g. single 195 BPM reading followed immediately by normal 130 BPM).
   * Verifies that isolated spikes do not falsely trigger interventions.
   */
  public simulateNoisySpike(spikeBpm: number = 195, normalBpm: number = 130): void {
    this.emitHr(spikeBpm, 'fresh');
    this.emitHr(normalBpm, 'fresh');
  }

  /**
   * Simulates stale biometric readings (reading older than REALTIME_HR_MAX_AGE_MS).
   */
  public simulateStaleReadings(ageMs: number = 8000, lastBpm: number = 140): void {
    this.emitHr(lastBpm, 'stale', ageMs);
    this.eventBus.emit('HEALTH_DATA_STALE', {
      provider: 'diagnostics_simulator',
      lastSyncedAt: Date.now() - ageMs,
      ageMs,
      freshnessState: 'stale',
      timestamp: Date.now(),
    });
  }

  /**
   * Simulates wearable Bluetooth disconnect during workout.
   */
  public simulateWearableDisconnect(): void {
    this.eventBus.emit('HEALTH_PROVIDER_STATE_CHANGED', {
      state: 'disconnected',
      provider: 'diagnostics_simulator',
    });
    this.emitHr(0, 'unavailable');
  }

  /**
   * Simulates wearable Bluetooth reconnect during workout.
   */
  public simulateWearableReconnect(bpm: number = 135): void {
    this.eventBus.emit('HEALTH_PROVIDER_STATE_CHANGED', {
      state: 'connected',
      provider: 'diagnostics_simulator',
    });
    this.emitHr(bpm, 'fresh');
  }

  /**
   * Simulates user overriding an intervention.
   */
  public simulateUserOverride(intervention: string = 'stop_and_recover'): void {
    this.eventBus.emit('SAFETY_RECOMMENDATION_OVERRIDDEN', {
      sessionId: this.sessionId,
      intervention,
      timestamp: Date.now(),
    });
  }
}

// Attach globally only in development
if (isDev && typeof window !== 'undefined') {
  (window as unknown as { FitNovaSafetyDiagnostics?: typeof RealtimeSafetyDiagnostics }).FitNovaSafetyDiagnostics = RealtimeSafetyDiagnostics;
}
