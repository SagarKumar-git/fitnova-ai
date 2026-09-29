import type { ComprehensiveHealthDataset } from './healthTypes.ts';

export type ProviderLifecycleState = 'unavailable' | 'connecting' | 'connected' | 'syncing' | 'error' | 'disconnected';

export interface IHealthProvider {
  /**
   * Identifies the provider (e.g., 'apple_health', 'mock', 'health_connect', 'web_bluetooth')
   */
  readonly providerName: string;
  
  /**
   * Current lifecycle state of the provider connection
   */
  readonly state: ProviderLifecycleState;

  /**
   * Returns true if this provider is available on the current device
   */
  isAvailable(): Promise<boolean>;

  /**
   * Attempt to connect/authorize the provider.
   */
  connect(): Promise<void>;
  
  /**
   * Disconnect or teardown the provider connection.
   */
  disconnect(): Promise<void>;

  /**
   * Subscribes to lifecycle state changes.
   */
  onStateChange(listener: (state: ProviderLifecycleState) => void): void;
  
  /**
   * Unsubscribes from lifecycle state changes.
   */
  offStateChange(listener: (state: ProviderLifecycleState) => void): void;

  /**
   * Subscribes to real-time health data updates (e.g., live heart rate streams).
   */
  onRealTimeData(listener: (dataset: Partial<ComprehensiveHealthDataset>) => void): void;

  /**
   * Unsubscribes from real-time health data updates.
   */
  offRealTimeData(listener: (dataset: Partial<ComprehensiveHealthDataset>) => void): void;

  /**
   * Fetches the latest health signals and normalizes them into a ComprehensiveHealthDataset.
   */
  getComprehensiveDataset(): Promise<ComprehensiveHealthDataset>;
}
