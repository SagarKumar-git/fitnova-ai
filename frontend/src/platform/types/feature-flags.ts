/**
 * FitNova AI — Platform Feature Flag Types
 * Strongly typed feature flags for runtime evaluation and overrides.
 */

export type StandardFeatureFlagKey =
  | 'dashboard_intelligence'
  | 'ai_meal_planner'
  | 'ai_workout_planner'
  | 'food_ai_scanner'
  | 'nova_voice'
  | 'offline_mode'
  | 'wearable_integration'
  | 'social_challenges';

export type FeatureFlagKey = StandardFeatureFlagKey | (string & {});

export interface FeatureFlagConfig {
  key: FeatureFlagKey;
  defaultValue: boolean;
  description?: string;
}

export type FeatureFlagStore = Record<FeatureFlagKey, boolean>;
