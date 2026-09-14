/**
 * FitNova AI — FeatureFlagService Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { FeatureFlagService } from '../feature-flags/FeatureFlagService.ts';

describe('FeatureFlagService', () => {
  it('respects default flag configurations', () => {
    const service = new FeatureFlagService();

    expect(service.isEnabled('dashboard_intelligence')).toBe(true);
    expect(service.isEnabled('ai_meal_planner')).toBe(true);
    expect(service.isEnabled('nova_voice')).toBe(false);
    expect(service.isEnabled('offline_mode')).toBe(false);
  });

  it('safely handles unknown flags by returning false', () => {
    const service = new FeatureFlagService();
    expect(service.isEnabled('completely_unknown_flag')).toBe(false);
  });

  it('evaluates environment variable overrides', () => {
    const service = new FeatureFlagService({
      env: {
        VITE_FF_NOVA_VOICE: 'true',
        VITE_FF_DASHBOARD_INTELLIGENCE: 'false',
      },
    });

    expect(service.isEnabled('nova_voice')).toBe(true);
    expect(service.isEnabled('dashboard_intelligence')).toBe(false);
  });

  it('evaluates runtime overrides with highest precedence', () => {
    const service = new FeatureFlagService();

    expect(service.isEnabled('offline_mode')).toBe(false);
    service.setOverride('offline_mode', true);
    expect(service.isEnabled('offline_mode')).toBe(true);

    service.clearOverride('offline_mode');
    expect(service.isEnabled('offline_mode')).toBe(false);
  });

  it('returns all active flag states with getAll()', () => {
    const service = new FeatureFlagService();
    service.setOverride('wearable_integration', true);

    const flags = service.getAll();
    expect(flags.wearable_integration).toBe(true);
    expect(flags.dashboard_intelligence).toBe(true);
    expect(flags.nova_voice).toBe(false);
  });
});
