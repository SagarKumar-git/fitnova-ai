/**
 * FitNova AI — Platform Context & React Hooks
 * Provides clean, declarative access to platform services within React components.
 */

import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { PlatformContainer, createPlatformContainer } from './PlatformContainer.ts';
import type { PlatformContainerOverrides } from './PlatformContainer.ts';
import type {
  StorageService,
  EventBus,
  NotificationService,
  AnalyticsService,
  TelemetryService,
  FeatureFlagService,
  NetworkService,
  OfflineManager,
  SyncManager,
  AppLifecycleService,
  ConfigService,
  Logger,
} from '../index.ts';
import type { FeatureFlagKey, NetworkStatus, NotificationItem } from '../types/index.ts';

const PlatformContext = createContext<PlatformContainer | null>(null);

export interface PlatformProviderProps {
  children: React.ReactNode;
  container?: PlatformContainer;
  overrides?: PlatformContainerOverrides;
}

export const PlatformProvider: React.FC<PlatformProviderProps> = ({
  children,
  container,
  overrides,
}) => {
  const platform = useMemo(() => {
    if (container) return container;
    return createPlatformContainer(overrides);
  }, [container, overrides]);

  return (
    <PlatformContext.Provider value={platform}>
      {children}
    </PlatformContext.Provider>
  );
};

export function usePlatform(): PlatformContainer {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
}

export function useStorage(): StorageService {
  return usePlatform().storage;
}

export function useEventBus(): EventBus {
  return usePlatform().events;
}

export function useNotificationService(): NotificationService {
  return usePlatform().notifications;
}

export function useActiveNotifications(): NotificationItem[] {
  const service = useNotificationService();
  const [items, setItems] = useState<NotificationItem[]>(() => service.list());

  useEffect(() => {
    return service.subscribe((updated) => {
      setItems(updated);
    });
  }, [service]);

  return items;
}

export function useAnalytics(): AnalyticsService {
  return usePlatform().analytics;
}

export function useTelemetry(): TelemetryService {
  return usePlatform().telemetry;
}

export function useFeatureFlags(): FeatureFlagService {
  return usePlatform().featureFlags;
}

export function useFeatureFlag(flag: FeatureFlagKey): boolean {
  const flags = useFeatureFlags();
  return flags.isEnabled(flag);
}

export function useNetworkService(): NetworkService {
  return usePlatform().network;
}

export function useNetworkStatus(): NetworkStatus {
  const network = useNetworkService();
  const [status, setStatus] = useState<NetworkStatus>(() => network.getStatus());

  useEffect(() => {
    return network.subscribe((newStatus) => {
      setStatus(newStatus);
    });
  }, [network]);

  return status;
}

export function useOfflineManager(): OfflineManager {
  return usePlatform().offline;
}

export function useSyncManager(): SyncManager {
  return usePlatform().sync;
}

export function useAppConfig(): ConfigService {
  return usePlatform().config;
}

export function useAppLifecycle(): AppLifecycleService {
  return usePlatform().lifecycle;
}

export function useLogger(moduleName?: string): Logger {
  const platform = usePlatform();
  return useMemo(() => {
    return moduleName ? (platform.logger.forModule(moduleName) as Logger) : platform.logger;
  }, [platform, moduleName]);
}

export function useApiClient() {
  return usePlatform().apiClient;
}

