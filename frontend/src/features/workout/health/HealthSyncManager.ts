import type { EventBus } from '../../../platform/events/EventBus.ts';
import type { HealthDataService } from './HealthDataService.ts';
import type { Logger } from '../../../platform/logging/Logger.ts';

export class HealthSyncManager {
  private isSyncing = false;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private unsub?: () => void;
  private readonly healthDataService: HealthDataService;
  private readonly eventBus: EventBus;
  private readonly logger: Logger;

  constructor(
    healthDataService: HealthDataService,
    eventBus: EventBus,
    logger: Logger
  ) {
    this.healthDataService = healthDataService;
    this.eventBus = eventBus;
    this.logger = logger;
    this.unsub = this.eventBus.subscribe('HEALTH_PROVIDER_STATE_CHANGED', this.handleProviderStateChange);
    this.startPeriodicSync();
    
    // Auto-connect on startup
    this.healthDataService.connect().catch((e: Error) => {
      this.logger.error('Failed to auto-connect health provider', { error: e.message });
    });
  }

  private handleProviderStateChange = (event: { state: string }) => {
    if (event.state === 'connected') {
      this.syncNow();
    }
  };

  public async syncNow(): Promise<void> {
    if (this.isSyncing) return;
    
    this.isSyncing = true;
    this.eventBus.emit('HEALTH_SYNC_STARTED', {
      provider: this.healthDataService.providerName,
      timestamp: Date.now()
    });

    try {
      this.logger.info('Starting health sync via HealthDataService');
      const dataset = await this.healthDataService.getComprehensiveDataset();
      
      this.eventBus.emit('HEALTH_SYNC_COMPLETED', {
        timestamp: Date.now(),
        recoveryConfidence: dataset.recoveryScore.confidence,
        hrConfidence: dataset.heartRate?.confidence
      });

      // Emitting this ensures any adaptive observers know they can re-run with fresh data
      this.eventBus.emit('ADAPTIVE_DECISION_UPDATED', {
        timestamp: Date.now()
      });
      
    } catch (error) {
      this.logger.error('Health sync failed', { error: (error as Error).message });
      this.eventBus.emit('HEALTH_SYNC_FAILED', {
        provider: this.healthDataService.providerName,
        timestamp: Date.now(),
        error: (error as Error).message
      });
    } finally {
      this.isSyncing = false;
    }
  }

  private startPeriodicSync() {
    // Sync every 15 minutes
    this.syncTimer = setInterval(() => {
      this.syncNow();
    }, 15 * 60 * 1000);
  }

  public cleanup() {
    if (this.unsub) {
      this.unsub();
      this.unsub = undefined;
    }
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }
}
