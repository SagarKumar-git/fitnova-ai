/**
 * FitNova AI — Sprint 3.8 Adaptive Training Type Contracts
 * Strongly typed models for adaptive training decisions, workout modifications,
 * data freshness, health sync status, and explainable recommendation pipelines.
 * Pure TypeScript. Zero UI/React dependencies.
 */

// ==========================================
// ADAPTIVE ACTIONS
// ==========================================

export type AdaptiveAction =
  | 'train_as_planned'
  | 'increase_intensity'
  | 'maintain_load'
  | 'reduce_intensity'
  | 'reduce_volume'
  | 'recovery_workout'
  | 'substitute_exercise'
  | 'rest';

// ==========================================
// DATA FRESHNESS
// ==========================================

export type DataFreshnessState = 'fresh' | 'aging' | 'stale' | 'unavailable';

export interface DataFreshness {
  timestamp: number;
  ageMs: number;
  state: DataFreshnessState;
}

// ==========================================
// HEALTH SYNC STATUS
// ==========================================

export type HealthSyncStatusType =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'syncing'
  | 'stale'
  | 'error';

// ==========================================
// ADAPTIVE TRAINING INPUT
// ==========================================

export interface AdaptiveFormQualityInput {
  averageFormScore: number; // 0–100
  recentWarningCount: number;
  repeatedIssues: string[];
  lastFormScore?: number;
}

export interface AdaptivePerformanceInput {
  recentRpeHistory: number[]; // last N sessions RPE averages
  missedRepsCount: number;
  personalRecordsLast7Days: number;
  averageCompletionRate: number; // 0–1.0
  consecutiveWorkoutDays: number;
  weeklyWorkoutCount: number;
  targetWeeklyWorkouts: number;
}

export interface AdaptiveTrainingInput {
  // Recovery signals
  recoveryScore: number; // 0–100
  hrvStatus: 'optimal' | 'suppressed' | 'elevated' | 'unknown';
  hrvTrendPct?: number; // % above/below baseline (e.g., -14 means 14% below)
  restingHeartRateDelta?: number; // BPM above baseline
  sleepQuality: 'optimal' | 'moderate' | 'poor';
  sleepHours?: number;
  deepSleepPct?: number;
  muscleSoreness: number; // 1–10
  systemicFatigue: number; // 1–10

  // Training load signals
  acwr?: number; // Acute:Chronic Workload Ratio
  acuteTrainingLoad?: number;
  chronicTrainingLoad?: number;

  // Performance signals
  performance: AdaptivePerformanceInput;

  // Form quality signals
  formQuality?: AdaptiveFormQualityInput;

  // Data freshness
  recoveryDataFreshness: DataFreshness;
  wearableAvailable: boolean;

  // Context
  plannedWorkoutType?: string; // 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full_body'
  currentTimestamp: number;
}

// ==========================================
// ADAPTIVE TRAINING DECISION
// ==========================================

export type AdaptiveIntensity =
  | 'full'
  | 'high'
  | 'moderate'
  | 'light'
  | 'active_recovery'
  | 'none';

export type AdaptiveDataSource =
  | 'wearable'
  | 'workout_history'
  | 'training_load'
  | 'form_analysis'
  | 'user_reported_recovery'
  | 'performance_history';

export interface AdaptiveTrainingDecision {
  recommendedAction: AdaptiveAction;
  recommendedIntensity: AdaptiveIntensity;
  volumeAdjustmentPercent: number; // e.g., -20 means reduce 20%
  weightAdjustmentPercent: number; // e.g., -6 means reduce 6%
  repAdjustment: number; // e.g., -2 means 2 fewer reps
  restAdjustmentSeconds: number; // e.g., +30 means 30s more rest
  confidenceScore: number; // 0.0–1.0
  reasons: string[];
  dataSources: AdaptiveDataSource[];
  warnings: string[];
  generatedAt: number;
  requiresUserConfirmation: boolean;
}

// ==========================================
// ADAPTIVE WORKOUT PLAN (IMMUTABLE SESSIONS)
// ==========================================

export interface AdaptiveExerciseModification {
  exerciseId: string;
  exerciseName: string;
  originalWeightKg: number;
  modifiedWeightKg: number;
  originalReps: number;
  modifiedReps: number;
  originalSets: number;
  modifiedSets: number;
  originalRestSeconds: number;
  modifiedRestSeconds: number;
  reason: string;
  isSubstitution: boolean;
  substituteExerciseId?: string;
  substituteExerciseName?: string;
}

export interface AdaptiveWorkoutPlan {
  originalWorkoutName: string;
  originalExerciseCount: number;
  originalTotalSets: number;
  modifiedExercises: Array<{
    id: string;
    exerciseId: string;
    exerciseName: string;
    order: number;
    targetSets: number;
    targetReps: number;
    targetWeight?: number;
    restSeconds: number;
    notes?: string;
  }>;
  modifications: AdaptiveExerciseModification[];
  plannedVolumeKg: number;
  adaptiveVolumeKg: number;
  volumeDeltaPct: number;
  summary: string;
  decision: AdaptiveTrainingDecision;
  generatedAt: number;
}

// ==========================================
// DURING-WORKOUT ADAPTIVE RECOMMENDATIONS
// ==========================================

export type AdaptiveRecommendationType =
  | 'increase_weight'
  | 'maintain_weight'
  | 'reduce_weight'
  | 'increase_rest'
  | 'reduce_volume'
  | 'stop_and_recover'
  | 'substitute_exercise';

export type AdaptiveRecommendationPriority = 'safety' | 'recovery' | 'form' | 'performance';

export interface AdaptiveRecommendationEvent {
  id: string;
  type: AdaptiveRecommendationType;
  priority: AdaptiveRecommendationPriority;
  exerciseId: string;
  exerciseName: string;
  currentValue: number;
  recommendedValue: number;
  unit: 'kg' | 'reps' | 'seconds' | 'sets';
  reason: string;
  confidenceScore: number;
  timestamp: number;
  dismissed: boolean;
  accepted: boolean;
}

// ==========================================
// SESSION SUMMARY ADAPTIVE REPORT
// ==========================================

export interface AdaptiveSessionReport {
  plannedVolumeKg: number;
  completedVolumeKg: number;
  adaptiveVolumeKg: number;
  averageRpe: number;
  averageFormScore: number;
  recoveryScoreAtStart: number;
  trainingLoadDelta: number;
  personalRecordsCount: number;
  exerciseModifications: AdaptiveExerciseModification[];
  novaSummary: string;
  dataSources: AdaptiveDataSource[];
}

// ==========================================
// ADAPTIVE ENGINE SAFETY CONSTANTS
// ==========================================

export const ADAPTIVE_SAFETY_LIMITS = {
  MAX_WEIGHT_INCREASE_PCT: 5,
  MAX_WEIGHT_DECREASE_PCT: 20,
  MAX_VOLUME_INCREASE_PCT: 15,
  MAX_VOLUME_DECREASE_PCT: 40,
  MAX_REST_INCREASE_SECONDS: 60,
  MAX_REP_ADJUSTMENT: 4,
  MIN_CONFIDENCE_SCORE: 0.30,
  MIN_SUPPORTING_SIGNALS: 2,
  RECOMMENDATION_COOLDOWN_MS: 30_000,
  DATA_FRESHNESS_FRESH_MS: 2 * 60 * 60 * 1000, // 2 hours
  DATA_FRESHNESS_AGING_MS: 8 * 60 * 60 * 1000, // 8 hours
  DATA_FRESHNESS_STALE_MS: 24 * 60 * 60 * 1000, // 24 hours
} as const;
