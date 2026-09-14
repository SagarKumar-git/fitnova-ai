/**
 * FitNova AI — Workout OS Constants
 */

export const WORKOUT_CONSTANTS = {
  DEFAULT_REST_SECONDS: 90,
  MIN_REST_SECONDS: 15,
  MAX_REST_SECONDS: 300,
  MAX_SETS_PER_EXERCISE: 12,
  MAX_EXERCISES_PER_WORKOUT: 20,
  SESSION_TIMEOUT_MS: 4 * 60 * 60 * 1000, // 4 hours maximum session duration
  DEFAULT_WARMUP_SETS: 1,
  STORAGE_KEYS: {
    ACTIVE_SESSION: 'workout:active_session',
    ACTIVE_SESSION_BACKUP: 'workout:active_session_backup',
    OFFLINE_SETS: 'workout:offline_sets',
    RECENT_WORKOUTS: 'workout:recent_workouts',
  },
} as const;
