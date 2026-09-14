/**
 * FitNova AI — Platform Analytics Types
 * Contract for behavioral product analytics.
 * Strictly separates product analytics from system telemetry.
 */

export type AnalyticsEventType =
  | 'PAGE_VIEWED'
  | 'WORKOUT_STARTED'
  | 'WORKOUT_COMPLETED'
  | 'MEAL_LOGGED'
  | 'FOOD_SCAN_STARTED'
  | 'FOOD_SCAN_COMPLETED'
  | 'AI_FEATURE_USED'
  | 'AI_RECOMMENDATION_ACCEPTED'
  | 'AI_RECOMMENDATION_REJECTED'
  | 'MEAL_PLAN_GENERATED'
  | 'GOAL_UPDATED'
  | 'ACHIEVEMENT_UNLOCKED'
  | 'FEATURE_USED'
  | 'ERROR_OCCURRED';

export interface AnalyticsEvent {
  name: AnalyticsEventType | (string & {});
  timestamp: number;
  sessionId: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface IAnalyticsAdapter {
  track(event: AnalyticsEvent): void | Promise<void>;
  identify?(userId: string, traits?: Record<string, unknown>): void | Promise<void>;
}
