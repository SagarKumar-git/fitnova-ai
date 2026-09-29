import type { IHealthProvider, ProviderLifecycleState } from './IHealthProvider.ts';
import type { ComprehensiveHealthDataset } from './healthTypes.ts';
import { REALTIME_HR_MAX_AGE_MS } from './healthTypes.ts';
import { EventBus } from '../../../platform/events/EventBus.ts';

export class HealthDataService {
  private activeProvider: IHealthProvider | null;
  private readonly eventBus?: EventBus;

  private lastRealTimeEmit: number = 0;
  private readonly THROTTLE_MS = 3000;

  constructor(provider?: IHealthProvider, eventBus?: EventBus) {
    this.activeProvider = provider ?? null;
    this.eventBus = eventBus;
    
    if (this.activeProvider) {
      this.attachLifecycleListeners(this.activeProvider);
    }
  }

  get providerName(): string {
    return this.activeProvider?.providerName ?? 'unknown';
  }

  setProvider(provider: IHealthProvider): void {
    if (this.activeProvider) {
      this.activeProvider.offStateChange(this.handleProviderStateChange);
      this.activeProvider.offRealTimeData(this.handleRealTimeData);
      this.activeProvider.disconnect().catch(() => {});
    }
    
    this.activeProvider = provider;
    this.attachLifecycleListeners(provider);
  }
  
  private attachLifecycleListeners(provider: IHealthProvider) {
    provider.onStateChange(this.handleProviderStateChange);
    provider.onRealTimeData(this.handleRealTimeData);
  }

  private handleProviderStateChange = (state: ProviderLifecycleState) => {
    if (this.eventBus) {
      this.eventBus.emit('HEALTH_PROVIDER_STATE_CHANGED', { state, provider: this.activeProvider?.providerName });
      
      if (state === 'error' || state === 'unavailable') {
        this.eventBus.emit('WEARABLE_CONNECTION_FAILURE', {
          provider: this.activeProvider?.providerName || 'unknown',
          error: `Provider entered ${state} state`,
          timestamp: Date.now(),
        });
      } else if (state === 'disconnected') {
        this.eventBus.emit('WEARABLE_DISCONNECTED', {
          provider: this.activeProvider?.providerName || 'unknown',
          reason: 'Provider disconnected',
          timestamp: Date.now(),
        });
      }

      // If disconnected, emit a stale/unavailable heart rate payload to trigger safety UI downgrades
      if (state === 'unavailable' || state === 'error' || state === 'disconnected') {
        this.eventBus.emit('REALTIME_HEART_RATE_UPDATED', {
          heartRate: {
            value: 0,
            capturedAt: Date.now(),
            source: this.activeProvider?.providerName || 'unknown',
            freshness: 'unavailable',
            confidence: 0
          },
          timestamp: Date.now()
        });
      }
    }
  };

  private handleRealTimeData = (dataset: Partial<ComprehensiveHealthDataset>) => {
    const now = Date.now();
    if (now - this.lastRealTimeEmit >= this.THROTTLE_MS) {
      if (dataset.heartRate && this.eventBus) {
        const { heartRate } = dataset;
        let freshness = heartRate.freshness;
        const capturedAt = heartRate.capturedAt;

        if (freshness !== 'unavailable') {
          // Reject readings missing timestamps, NaN, or malformed
          if (!capturedAt || isNaN(capturedAt) || heartRate.value === undefined || heartRate.value === null || isNaN(heartRate.value)) {
            freshness = 'stale';
          } else {
            const age = now - capturedAt;
            if (age > REALTIME_HR_MAX_AGE_MS) {
              freshness = 'stale';
              this.eventBus.emit('HEALTH_DATA_STALE', {
                provider: heartRate.source || this.activeProvider?.providerName || 'unknown',
                lastSyncedAt: capturedAt,
                ageMs: age,
                freshnessState: 'stale',
                timestamp: now,
              });
            }

            // Validate physiological boundaries: 30 - 220 BPM
            if (heartRate.value < 30 || heartRate.value > 220) {
              freshness = 'stale';
            }
          }
        }

        const sanitizedHeartRate = {
          ...heartRate,
          freshness,
          confidence: freshness === 'unavailable' ? 0 : (freshness === 'stale' ? 0.2 : (heartRate.confidence ?? 0.99)),
        };

        this.eventBus.emit('REALTIME_HEART_RATE_UPDATED', {
          heartRate: sanitizedHeartRate,
          timestamp: now
        });
        this.lastRealTimeEmit = now;
      }
    }
  };

  resetThrottle(): void {
    this.lastRealTimeEmit = 0;
  }

  cleanup(): void {
    if (this.activeProvider) {
      this.activeProvider.offStateChange(this.handleProviderStateChange);
      this.activeProvider.offRealTimeData(this.handleRealTimeData);
    }
  }

  async connect(): Promise<void> {
    if (!this.activeProvider) {
      throw new Error('No Health Provider configured.');
    }
    try {
      await this.activeProvider.connect();
    } catch (err) {
      this.eventBus?.emit('WEARABLE_CONNECTION_FAILURE', {
        provider: this.providerName,
        error: err instanceof Error ? err.message : String(err),
        timestamp: Date.now(),
      });
      throw err;
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.activeProvider) {
      await this.activeProvider.disconnect();
      this.eventBus?.emit('WEARABLE_DISCONNECTED', {
        provider: this.providerName,
        reason: 'User disconnected provider',
        timestamp: Date.now(),
      });
    }
  }

  async getComprehensiveDataset(): Promise<ComprehensiveHealthDataset> {
    if (!this.activeProvider) {
      throw new Error('No Health Provider configured.');
    }

    const isAvailable = await this.activeProvider.isAvailable();
    if (!isAvailable) {
       throw new Error('Active Health Provider is not available.');
    }

    if (this.activeProvider.state === 'unavailable' || this.activeProvider.state === 'error') {
       throw new Error(`Provider is in an invalid state: ${this.activeProvider.state}`);
    }

    return await this.activeProvider.getComprehensiveDataset();
  }
}
