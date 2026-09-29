/**
 * FitNova AI — Health Enums
 * Enumerated values for health and wearable data.
 * Zero UI/React dependencies.
 */

export type BiometricConfidence = 'high' | 'medium' | 'low';

export type HeartRateContext = 'resting' | 'active' | 'workout' | 'sleep';

export type HRVStatus = 'optimal' | 'suppressed' | 'elevated';

export type SleepStageType = 'deep' | 'rem' | 'light' | 'awake';

export type RecoveryReadinessState = 'optimal' | 'moderate' | 'low' | 'rest_recommended';

export type HealthProviderType = 'mock' | 'apple_health' | 'health_connect';

export type HealthProviderStatus =
  | 'connected'
  | 'disconnected'
  | 'permission_denied'
  | 'syncing'
  | 'unavailable';

// Sprint 3.8 — Wearable Sync State Machine
export type HealthSyncStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'syncing'
  | 'stale'
  | 'error';
