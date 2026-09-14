/**
 * FitNova AI — Platform Configuration Types
 * Application environment configuration contracts.
 */

export type AppEnvironment = 'development' | 'production' | 'test';

export interface AppConfig {
  environment: AppEnvironment;
  apiBaseUrl: string;
  appVersion: string;
  buildVersion: string;
  debug: boolean;
  analyticsEnabled: boolean;
  telemetryEnabled: boolean;
  offlineEnabled: boolean;
  storageNamespace: string;
  featureFlags?: Record<string, boolean>;
}

export type ConfigOverrides = Partial<AppConfig>;
