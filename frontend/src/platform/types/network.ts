/**
 * FitNova AI — Platform Network Types
 * Network status, connectivity detection, and SSR-safe contracts.
 */

export interface NetworkStatus {
  isOnline: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  lastChangedAt: number;
}

export type NetworkChangeListener = (status: NetworkStatus) => void;
