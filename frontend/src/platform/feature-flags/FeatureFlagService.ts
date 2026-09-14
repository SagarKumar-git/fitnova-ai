/**
 * FitNova AI — Feature Flag Service
 * Evaluates feature availability through defaults, environment overrides, and runtime toggles.
 */

import type {
  FeatureFlagKey,
  StandardFeatureFlagKey,
  FeatureFlagStore,
} from '../types/index.ts';

const DEFAULT_FLAGS: Record<StandardFeatureFlagKey, boolean> = {
  dashboard_intelligence: true,
  ai_meal_planner: true,
  ai_workout_planner: true,
  food_ai_scanner: true,
  nova_voice: false,
  offline_mode: false,
  wearable_integration: false,
  social_challenges: false,
};

export interface FeatureFlagServiceConfig {
  defaults?: Partial<Record<FeatureFlagKey, boolean>>;
  overrides?: Partial<Record<FeatureFlagKey, boolean>>;
  env?: Record<string, string | undefined>;
}

export class FeatureFlagService {
  private readonly defaults: FeatureFlagStore;
  private readonly runtimeOverrides: Map<string, boolean> = new Map();

  constructor(config: FeatureFlagServiceConfig = {}) {
    this.defaults = {
      ...DEFAULT_FLAGS,
      ...(config.defaults as FeatureFlagStore),
    };

    // Load environment overrides (e.g. VITE_FF_AI_MEAL_PLANNER=true)
    this.loadEnvOverrides(config.env);

    // Apply explicit config overrides if passed
    if (config.overrides) {
      for (const [key, val] of Object.entries(config.overrides)) {
        if (val !== undefined) {
          this.runtimeOverrides.set(key, val);
        }
      }
    }
  }

  private loadEnvOverrides(customEnv?: Record<string, string | undefined>): void {
    const envObj = customEnv ?? (typeof import.meta !== 'undefined' ? import.meta.env : {});
    if (!envObj) return;

    for (const [key, rawVal] of Object.entries(envObj)) {
      if (key.startsWith('VITE_FF_')) {
        const flagName = key.replace('VITE_FF_', '').toLowerCase();
        if (rawVal === 'true' || rawVal === '1') {
          this.runtimeOverrides.set(flagName, true);
        } else if (rawVal === 'false' || rawVal === '0') {
          this.runtimeOverrides.set(flagName, false);
        }
      }
    }
  }

  isEnabled(flag: FeatureFlagKey): boolean {
    // 1. Runtime overrides have top priority
    if (this.runtimeOverrides.has(flag)) {
      return this.runtimeOverrides.get(flag)!;
    }

    // 2. Default configuration
    if (flag in this.defaults) {
      return this.defaults[flag];
    }

    // Unknown flags default to false safely
    return false;
  }

  get(flag: FeatureFlagKey): boolean {
    return this.isEnabled(flag);
  }

  setOverride(flag: FeatureFlagKey, value: boolean): void {
    this.runtimeOverrides.set(flag, value);
  }

  clearOverride(flag?: FeatureFlagKey): void {
    if (flag) {
      this.runtimeOverrides.delete(flag);
    } else {
      this.runtimeOverrides.clear();
    }
  }

  getAll(): FeatureFlagStore {
    const result: FeatureFlagStore = { ...this.defaults };
    for (const [key, val] of this.runtimeOverrides.entries()) {
      result[key] = val;
    }
    return result;
  }
}
