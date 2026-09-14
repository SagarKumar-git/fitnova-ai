/**
 * FitNova AI — Workout Intelligence Constants
 * Progressive overload formulas, micro-loading increments, and muscle synergy definitions.
 */

export const OVERLOAD_INCREMENTS = {
  UPPER_COMPOUND_KG: 2.5,
  UPPER_ISOLATION_KG: 1.25,
  LOWER_COMPOUND_KG: 5.0,
  LOWER_ISOLATION_KG: 2.5,
} as const;

export const RPE_THRESHOLDS = {
  EASY: 7.0,       // RPE <= 7.0: Surplus reserve, ready for aggressive jump
  TARGET_MIN: 7.5, // 7.5 - 8.5: Ideal progressive overload sweet spot
  TARGET_MAX: 8.5,
  LIMITING: 9.0,   // 9.0+: Near absolute limit, maintain or micro-increment
  EXHAUSTION: 9.5, // 9.5+: Failure hit, fatigue management priority
} as const;

export const READINESS_THRESHOLDS = {
  HIGH_FATIGUE: 8,
  HIGH_SORENESS: 8,
  LOW_SLEEP_HOURS: 6.0,
  OPTIMAL_SLEEP_HOURS: 7.5,
  MAX_CONSECUTIVE_DAYS: 4,
} as const;

export const MOVEMENT_PATTERNS: Record<string, string[]> = {
  horizontal_push: ['ex_bench_press', 'ex_incline_dumbbell_press', 'ex_pushups', 'ex_chest_dips'],
  vertical_push: ['ex_overhead_press', 'ex_dumbbell_lateral_raise', 'ex_pike_pushups'],
  horizontal_pull: ['ex_barbell_bent_row', 'ex_seated_cable_row', 'ex_dumbbell_row'],
  vertical_pull: ['ex_pullups', 'ex_lat_pulldown', 'ex_chin_ups'],
  quad_dominant: ['ex_barbell_back_squat', 'ex_leg_press', 'ex_bulgarian_split_squat', 'ex_goblet_squat'],
  hip_hinge: ['ex_deadlift', 'ex_romanian_deadlift', 'ex_barbell_hip_thrust'],
  elbow_flexion: ['ex_barbell_bicep_curl', 'ex_incline_dumbbell_curl', 'ex_hammer_curls'],
  elbow_extension: ['ex_tricep_rope_pushdown', 'ex_skull_crushers', 'ex_close_grip_bench'],
};
