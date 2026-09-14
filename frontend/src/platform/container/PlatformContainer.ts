/**
 * FitNova AI — Platform Container
 * Explicit Dependency Injection Container for platform foundation services.
 */

import { ConfigService } from '../config/ConfigService.ts';
import { Logger } from '../logging/Logger.ts';
import { StorageService } from '../storage/StorageService.ts';
import { EventBus } from '../events/EventBus.ts';
import { NotificationService } from '../notifications/NotificationService.ts';
import { AnalyticsService } from '../analytics/AnalyticsService.ts';
import { TelemetryService } from '../telemetry/TelemetryService.ts';
import { FeatureFlagService } from '../feature-flags/FeatureFlagService.ts';
import { NetworkService } from '../network/NetworkService.ts';
import { OfflineManager } from '../offline/OfflineManager.ts';
import { SyncManager } from '../sync/SyncManager.ts';
import { AppLifecycleService } from '../lifecycle/AppLifecycleService.ts';
import { ApiClient } from '../network/ApiClient.ts';
import type { ConfigOverrides } from '../types/index.ts';

export interface PlatformContainerOverrides {
  config?: ConfigService | ConfigOverrides;
  logger?: Logger;
  storage?: StorageService;
  events?: EventBus;
  notifications?: NotificationService;
  analytics?: AnalyticsService;
  telemetry?: TelemetryService;
  featureFlags?: FeatureFlagService;
  network?: NetworkService;
  offline?: OfflineManager;
  sync?: SyncManager;
  lifecycle?: AppLifecycleService;
  apiClient?: ApiClient;
}

export class PlatformContainer {
  readonly config: ConfigService;
  readonly logger: Logger;
  readonly storage: StorageService;
  readonly events: EventBus;
  readonly notifications: NotificationService;
  readonly analytics: AnalyticsService;
  readonly telemetry: TelemetryService;
  readonly featureFlags: FeatureFlagService;
  readonly network: NetworkService;
  readonly offline: OfflineManager;
  readonly sync: SyncManager;
  readonly lifecycle: AppLifecycleService;
  readonly apiClient: ApiClient;

  constructor(overrides: PlatformContainerOverrides = {}) {
    // 1. Configuration
    this.config =
      overrides.config instanceof ConfigService
        ? overrides.config
        : new ConfigService(overrides.config);

    // 2. Logger
    this.logger =
      overrides.logger ??
      new Logger({
        module: 'FitNova',
        minLevel: this.config.isDevelopment ? 'debug' : 'warn',
        isDev: this.config.isDevelopment,
      });

    // 3. Storage
    this.storage =
      overrides.storage ??
      new StorageService({
        namespace: this.config.get('storageNamespace'),
      });

    // 4. Event Bus
    this.events =
      overrides.events ??
      new EventBus({
        onError: (evt, err) => {
          this.logger.error(`EventBus handler failed on event: ${evt}`, {
            error: err instanceof Error ? err.message : String(err),
          });
        },
      });

    // 5. Notifications
    this.notifications = overrides.notifications ?? new NotificationService();

    // 6. Analytics
    this.analytics =
      overrides.analytics ??
      new AnalyticsService({
        enabled: this.config.get('analyticsEnabled'),
        isDev: this.config.isDevelopment,
      });

    // 7. Telemetry
    this.telemetry =
      overrides.telemetry ??
      new TelemetryService({
        enabled: this.config.get('telemetryEnabled'),
      });

    // 8. Feature Flags
    this.featureFlags =
      overrides.featureFlags ??
      new FeatureFlagService({
        overrides: this.config.get('featureFlags'),
      });

    // 9. Network Service
    this.network =
      overrides.network ??
      new NetworkService({
        eventBus: this.events,
      });

    // 10. Offline Manager
    this.offline =
      overrides.offline ??
      new OfflineManager({
        storage: this.storage,
        network: this.network,
      });

    // 11. Sync Manager
    this.sync =
      overrides.sync ??
      new SyncManager({
        offlineManager: this.offline,
        eventBus: this.events,
        network: this.network,
      });

    // 12. Lifecycle Service
    this.lifecycle = overrides.lifecycle ?? new AppLifecycleService();

    // 13. Centralized API Client
    this.apiClient =
      overrides.apiClient ??
      new ApiClient({
        baseUrl: this.config.apiBaseUrl,
        networkService: this.network,
        telemetryService: this.telemetry,
        logger: this.logger,
        getToken: () => {
          const platformToken = this.storage.get('token');
          if (platformToken) return platformToken;
          if (typeof window !== 'undefined' && window.localStorage) {
            return window.localStorage.getItem('fitnova_token');
          }
          return null;
        },
      });

    // Set initial lifecycle state to ready
    this.lifecycle.transitionTo('ready');
  }

  destroy(): void {
    this.lifecycle.transitionTo('shutdown');
    this.network.destroy();
    this.sync.destroy();
    this.lifecycle.destroy();
    this.events.clear();
    this.notifications.dismissAll();
  }
}

export function createPlatformContainer(
  overrides?: PlatformContainerOverrides
): PlatformContainer {
  return new PlatformContainer(overrides);
}
