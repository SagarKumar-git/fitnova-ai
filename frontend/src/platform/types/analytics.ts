/**
 * FitNova AI — Platform Analytics Types
 * Contract for behavioral product analytics.
 * Strictly separates product analytics from system telemetry.
 */

export type AnalyticsEventType =
  | 'PAGE_VIEWED'
  | 'WORKOUT_STARTED'
  | 'WORKOUT_COMPLETED'
  | 'WORKOUT_VIEWED'
  | 'WORKOUT_PAUSED'
  | 'WORKOUT_RESUMED'
  | 'WORKOUT_CANCELLED'
  | 'SET_STARTED'
  | 'SET_COMPLETED'
  | 'SET_SKIPPED'
  | 'EXERCISE_COMPLETED'
  | 'EXERCISE_SUBSTITUTED'
  | 'NOVA_WORKOUT_RECOMMENDATION_SHOWN'
  | 'NOVA_COACHING_SHOWN'
  | 'NOVA_PROGRESSION_SHOWN'
  | 'NOVA_RECOVERY_RECOMMENDATION_SHOWN'
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
  | 'WORKOUT_ANALYTICS_VIEWED'
  | 'STRENGTH_PROGRESS_VIEWED'
  | 'EXERCISE_HISTORY_VIEWED'
  | 'NOVA_WORKOUT_RECOMMENDATION_VIEWED'
  | 'PROGRESSION_RECOMMENDATION_ACCEPTED'
  | 'PROGRESSION_RECOMMENDATION_REJECTED'
  | 'HEALTH_SYNC_COMPLETED'
  | 'FORM_ANALYSIS_STARTED'
  | 'FORM_ANALYSIS_STOPPED'
  | 'FORM_WARNING_DETECTED'
  // Sprint 3.8 — Adaptive Training Analytics
  | 'ADAPTIVE_DECISION_GENERATED'
  | 'ADAPTIVE_RECOMMENDATION_ACCEPTED'
  | 'ADAPTIVE_RECOMMENDATION_REJECTED'
  | 'ADAPTIVE_WEIGHT_CHANGE'
  | 'ADAPTIVE_VOLUME_CHANGE'
  | 'ADAPTIVE_EXERCISE_SUBSTITUTION'
  | 'FORM_BASED_ADJUSTMENT'
  | 'RECOVERY_BASED_ADJUSTMENT'
  | 'WEARABLE_SYNC_SUCCESS'
  | 'WEARABLE_SYNC_FAILURE'
  | 'ERROR_OCCURRED'
  // Sprint 5.1 — Production Observability Operational Analytics
  | 'API_FAILURE'
  | 'WORKOUT_FAILURE'
  | 'SYNC_FAILURE'
  | 'WEARABLE_CONNECTION_FAILURE'
  | 'WEARABLE_DISCONNECTED'
  | 'ADAPTIVE_DECISION_FAILURE'
  | 'AI_FAILURE'
  | 'APPLICATION_ERROR'
  | 'PERFORMANCE_ISSUE';

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
