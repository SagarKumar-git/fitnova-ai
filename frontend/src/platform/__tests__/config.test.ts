/**
 * FitNova AI — ConfigService Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { ConfigService } from '../config/ConfigService.ts';

describe('ConfigService', () => {
  it('provides safe defaults when environment variables are omitted', () => {
    const config = new ConfigService({}, {});

    expect(config.apiBaseUrl).toBe('https://fitnova-ai-4eqi.onrender.com/api');
    expect(config.get('storageNamespace')).toBe('fitnova:');
    expect(config.get('analyticsEnabled')).toBe(true);
    expect(config.get('telemetryEnabled')).toBe(true);
  });

  it('normalizes URLs and strips trailing slashes', () => {
    const config = new ConfigService(
      { apiBaseUrl: 'http://localhost:8000/api///' },
      {}
    );
    expect(config.apiBaseUrl).toBe('http://localhost:8000/api');
  });

  it('falls back to default URL when invalid schema is provided', () => {
    const config = new ConfigService(
      { apiBaseUrl: 'invalid-url-without-protocol' },
      {}
    );
    expect(config.apiBaseUrl).toBe('https://fitnova-ai-4eqi.onrender.com/api');
  });

  it('correctly reports environment boolean accessors', () => {
    const devConfig = new ConfigService({ environment: 'development' }, {});
    expect(devConfig.isDevelopment).toBe(true);
    expect(devConfig.isProduction).toBe(false);

    const prodConfig = new ConfigService({ environment: 'production' }, {});
    expect(prodConfig.isDevelopment).toBe(false);
    expect(prodConfig.isProduction).toBe(true);
  });
});
