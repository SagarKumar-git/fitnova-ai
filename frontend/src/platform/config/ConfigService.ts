/**
 * FitNova AI — Configuration Service
 * Centralizes environment variables, validation, and safe defaults.
 */

import type { AppConfig, ConfigOverrides, AppEnvironment } from '../types/index.ts';
import { isDevEnv, isTestEnv } from '../utils/env.ts';

const DEFAULT_API_BASE_URL = 'https://fitnova-ai-4eqi.onrender.com/api';

export class ConfigService {
  private readonly config: AppConfig;

  constructor(overrides: ConfigOverrides = {}, customEnv?: Record<string, string | undefined>) {
    const envObj = customEnv ?? (typeof import.meta !== 'undefined' ? import.meta.env : {});

    const isDev = isDevEnv();
    const isTest = isTestEnv();

    const environment: AppEnvironment = overrides.environment
      ? overrides.environment
      : isTest
      ? 'test'
      : isDev
      ? 'development'
      : 'production';

    const rawApiUrl =
      overrides.apiBaseUrl ||
      envObj?.VITE_API_BASE_URL ||
      envObj?.VITE_API_URL ||
      DEFAULT_API_BASE_URL;

    // Validate URL format safely
    const apiBaseUrl = this.validateAndNormalizeUrl(rawApiUrl);

    this.config = {
      environment,
      apiBaseUrl,
      appVersion: overrides.appVersion || envObj?.VITE_APP_VERSION || '1.0.0',
      buildVersion: overrides.buildVersion || envObj?.VITE_BUILD_VERSION || 'sprint-2.4',
      debug: overrides.debug !== undefined ? overrides.debug : isDev,
      analyticsEnabled: overrides.analyticsEnabled !== undefined ? overrides.analyticsEnabled : true,
      telemetryEnabled: overrides.telemetryEnabled !== undefined ? overrides.telemetryEnabled : true,
      offlineEnabled: overrides.offlineEnabled !== undefined ? overrides.offlineEnabled : false,
      storageNamespace: overrides.storageNamespace || 'fitnova:',
      featureFlags: overrides.featureFlags ?? {},
    };
  }

  private validateAndNormalizeUrl(url: string): string {
    try {
      // Remove trailing slashes
      const trimmed = url.trim().replace(/\/+$/, '');
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        return DEFAULT_API_BASE_URL;
      }
      return trimmed;
    } catch {
      return DEFAULT_API_BASE_URL;
    }
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  getAll(): AppConfig {
    return { ...this.config };
  }

  get apiBaseUrl(): string {
    return this.config.apiBaseUrl;
  }

  get environment(): AppEnvironment {
    return this.config.environment;
  }

  get isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  get isProduction(): boolean {
    return this.config.environment === 'production';
  }

  get isTest(): boolean {
    return this.config.environment === 'test';
  }
}
