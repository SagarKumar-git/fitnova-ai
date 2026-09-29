/**
 * FitNova AI — Platform Event Types
 * Strictly typed definitions for EventBus and platform events.
 * Zero feature-specific dependencies.
 */

export interface UserLoggedInPayload {
  userId: string;
  email?: string;
  timestamp: number;
}

export interface UserLoggedOutPayload {
  userId?: string;
  reason?: string;
  timestamp: number;
}

export interface ProfileUpdatedPayload {
  userId: string;
  fields: string[];
  timestamp: number;
}

export interface WorkoutStartedPayload {
  workoutId: string;
  sessionId?: string;
  templateId?: string;
  timestamp: number;
}

export interface WorkoutCompletedPayload {
  workoutId: string;
  workoutName?: string;
  sessionId?: string;
  durationSeconds: number;
  totalVolume: number;
  totalSets: number;
  completedSets?: number;
  caloriesBurned?: number;
  personalRecordsCount?: number;
  streakWeeks?: number;
  streak?: number;
  timestamp: number;
}

export interface ExerciseCompletedPayload {
  workoutId: string;
  sessionId?: string;
  exerciseId: string;
  exerciseName: string;
  setsCompleted: number;
  timestamp: number;
}

export interface ExerciseSubstitutedPayload {
  workoutId: string;
  sessionId?: string;
  originalExerciseId: string;
  originalExerciseName: string;
  substituteExerciseId: string;
  substituteExerciseName: string;
  timestamp: number;
}

export interface SetStartedPayload {
  workoutId: string;
  sessionId?: string;
  exerciseId: string;
  setNumber: number;
  timestamp: number;
}

export interface SetSkippedPayload {
  workoutId: string;
  sessionId?: string;
  exerciseId: string;
  setNumber: number;
  timestamp: number;
}

export interface SetCompletedPayload {
  workoutId: string;
  sessionId: string;
  exerciseId: string;
  setId: string;
  setNumber: number;
  reps: number;
  weight: number;
  rpe?: number;
  timestamp: number;
}

export interface WorkoutPausedPayload {
  workoutId: string;
  sessionId: string;
  timestamp: number;
}

export interface WorkoutResumedPayload {
  workoutId: string;
  sessionId: string;
  timestamp: number;
}

export interface WorkoutCancelledPayload {
  workoutId: string;
  sessionId: string;
  reason?: string;
  timestamp: number;
}

export interface PersonalRecordAchievedPayload {
  workoutId: string;
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  metric: '1rm' | 'max_weight' | 'max_reps' | 'max_volume';
  value: number;
  previousValue?: number;
  timestamp: number;
}

export interface MealLoggedPayload {
  mealId: string;
  mealType: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  timestamp: number;
}

export interface WaterLoggedPayload {
  amountMl: number;
  dailyTotalMl: number;
  timestamp: number;
}

export interface FoodScannedPayload {
  scanId: string;
  detectedItemsCount: number;
  confidenceScore?: number;
  timestamp: number;
}

export interface AIRequestStartedPayload {
  requestId: string;
  feature: string;
  provider: string;
  timestamp: number;
}

export interface AIRequestCompletedPayload {
  requestId: string;
  feature: string;
  provider: string;
  latencyMs: number;
  tokensEstimated?: number;
  timestamp: number;
}

export interface AIRequestFailedPayload {
  requestId: string;
  feature: string;
  provider: string;
  error: string;
  timestamp: number;
}

export interface AIInsightGeneratedPayload {
  insightId: string;
  type: string;
  headline: string;
  confidence?: number;
  timestamp: number;
}

export interface GoalUpdatedPayload {
  goalId: string;
  metric: string;
  targetValue: number;
  previousValue?: number;
  timestamp: number;
}

export interface AchievementUnlockedPayload {
  achievementId: string;
  title: string;
  category?: string;
  timestamp: number;
}

export interface NetworkOnlinePayload {
  timestamp: number;
  effectiveType?: string;
}

export interface NetworkOfflinePayload {
  timestamp: number;
}

export interface SyncStartedPayload {
  syncId: string;
  pendingCount: number;
  timestamp: number;
}

export interface SyncCompletedPayload {
  syncId: string;
  syncedCount: number;
  failedCount: number;
  durationMs: number;
  timestamp: number;
}

export interface SyncFailedPayload {
  syncId: string;
  error: string;
  failedCount: number;
  timestamp: number;
}

export interface HealthDataUpdatedPayload {
  provider: string;
  source: string;
  timestamp: number;
  hasHeartRate: boolean;
  hasHRV: boolean;
  hasSleep: boolean;
  hasActivity: boolean;
}

export interface RecoveryScoreUpdatedPayload {
  recoveryScore: number;
  readinessState: 'optimal' | 'moderate' | 'low' | 'rest_recommended';
  recommendedIntensity: 'full' | 'moderate' | 'light' | 'active_recovery' | 'none';
  dataSources: string[];
  timestamp: number;
}

export interface FormAnalysisUpdatedPayload {
  exerciseId: string;
  exerciseName: string;
  formScore: number;
  confidence: number;
  detectedIssuesCount: number;
  primaryCorrection?: string;
  timestamp: number;
}

export interface FormWarningDetectedPayload {
  exerciseId: string;
  exerciseName: string;
  issue: string;
  severity: 'low' | 'moderate' | 'high';
  correctiveCue: string;
  timestamp: number;
}

export interface FormAnalysisStartedPayload {
  exerciseId: string;
  exerciseName: string;
  timestamp: number;
}

export interface FormAnalysisStoppedPayload {
  exerciseId: string;
  exerciseName: string;
  averageFormScore: number;
  timestamp: number;
}

// ==========================================
// SPRINT 3.8 — ADAPTIVE TRAINING EVENTS
// ==========================================

export interface AdaptiveDecisionUpdatedPayload {
  decisionId?: string;
  recommendedAction?: string;
  recommendedIntensity?: string;
  volumeAdjustmentPercent?: number;
  weightAdjustmentPercent?: number;
  confidenceScore?: number;
  reasons?: string[];
  dataSources?: string[];
  timestamp: number;
}

export interface AdaptiveWorkoutGeneratedPayload {
  workoutName: string;
  originalSets: number;
  modifiedSets: number;
  volumeDeltaPct: number;
  modificationsCount: number;
  timestamp: number;
}

export interface AdaptiveRecommendationAcceptedPayload {
  recommendationId: string;
  type: string;
  exerciseId: string;
  exerciseName: string;
  originalValue: number;
  acceptedValue: number;
  unit: string;
  timestamp: number;
}

export interface AdaptiveRecommendationRejectedPayload {
  recommendationId: string;
  type: string;
  exerciseId: string;
  exerciseName: string;
  timestamp: number;
}

export interface HealthSyncStartedPayload {
  provider?: string;
  timestamp: number;
}

export interface HealthSyncCompletedWithDetailsPayload {
  provider: string;
  samplesCount: number;
  recoveryScore: number;
  syncDurationMs: number;
  timestamp: number;
}

export interface HealthSyncFailedPayload {
  provider?: string;
  error: string;
  timestamp: number;
}

export interface HealthDataStalePayload {
  provider: string;
  lastSyncedAt: number;
  ageMs: number;
  freshnessState: string;
  timestamp: number;
}

export interface RealtimeHeartRateUpdatedPayload {
  heartRate: import('../../features/workout/health/healthTypes.ts').NormalizedHealthSignal<number>;
  timestamp: number;
}

// Sprint 4.6 — Safety Telemetry Events
export interface SafetyZoneTransitionedPayload {
  sessionId: string;
  previousZone: string;
  newZone: string;
  timestamp: number;
}

export interface SafetyInterventionTriggeredPayload {
  sessionId: string;
  zone: string;
  intervention: string;
  timestamp: number;
}

export interface SafetyInterventionClearedPayload {
  sessionId: string;
  timestamp: number;
}

export interface SafetyRecommendationOverriddenPayload {
  sessionId: string;
  intervention: string;
  timestamp: number;
}

export interface HighHrSustainedPayload {
  sessionId: string;
  bpm: number;
  consecutiveReadings: number;
  timestamp: number;
}

export interface CriticalHrSustainedPayload {
  sessionId: string;
  bpm: number;
  consecutiveReadings: number;
  timestamp: number;
}

export interface HealthSyncCompletedPayload {
  timestamp: number;
  recoveryConfidence?: number;
  hrConfidence?: number;
}

// ==========================================
// SPRINT 5.1 — PRODUCTION OBSERVABILITY EVENTS
// ==========================================

export interface ApiFailurePayload {
  endpoint: string;
  method?: string;
  statusCode?: number;
  error: string;
  durationMs?: number;
  correlationId?: string;
  timestamp: number;
}

export interface WorkoutFailurePayload {
  workoutId?: string;
  sessionId?: string;
  action: string;
  error: string;
  timestamp: number;
}

export interface SyncFailurePayload {
  syncId?: string;
  failedCount: number;
  error: string;
  timestamp: number;
}

export interface WearableConnectionFailurePayload {
  provider: string;
  error: string;
  timestamp: number;
}

export interface WearableDisconnectedPayload {
  provider: string;
  reason?: string;
  timestamp: number;
}

export interface AdaptiveDecisionFailurePayload {
  engine?: string;
  action?: string;
  error: string;
  timestamp: number;
}

export interface AIFailurePayload {
  feature: string;
  provider?: string;
  error: string;
  durationMs?: number;
  timestamp: number;
}

export interface ApplicationErrorPayload {
  source: string;
  error: string;
  code?: string;
  recoverability?: string;
  componentStack?: string;
  timestamp: number;
}

export interface PerformanceIssuePayload {
  metric: string;
  durationMs: number;
  thresholdMs: number;
  sourceModule: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Master mapping from Event Name to Event Payload.
 * Strongly typed across EventBus and platform consumers.
 */
export interface PlatformEventMap {
  USER_LOGGED_IN: UserLoggedInPayload;
  USER_LOGGED_OUT: UserLoggedOutPayload;
  PROFILE_UPDATED: ProfileUpdatedPayload;
  WORKOUT_STARTED: WorkoutStartedPayload;
  WORKOUT_PAUSED: WorkoutPausedPayload;
  WORKOUT_RESUMED: WorkoutResumedPayload;
  WORKOUT_COMPLETED: WorkoutCompletedPayload;
  WORKOUT_CANCELLED: WorkoutCancelledPayload;
  EXERCISE_COMPLETED: ExerciseCompletedPayload;
  EXERCISE_SUBSTITUTED: ExerciseSubstitutedPayload;
  SET_STARTED: SetStartedPayload;
  SET_COMPLETED: SetCompletedPayload;
  SET_SKIPPED: SetSkippedPayload;
  PERSONAL_RECORD_ACHIEVED: PersonalRecordAchievedPayload;
  MEAL_LOGGED: MealLoggedPayload;
  WATER_LOGGED: WaterLoggedPayload;
  FOOD_SCANNED: FoodScannedPayload;
  AI_REQUEST_STARTED: AIRequestStartedPayload;
  AI_REQUEST_COMPLETED: AIRequestCompletedPayload;
  AI_REQUEST_FAILED: AIRequestFailedPayload;
  AI_INSIGHT_GENERATED: AIInsightGeneratedPayload;
  GOAL_UPDATED: GoalUpdatedPayload;
  ACHIEVEMENT_UNLOCKED: AchievementUnlockedPayload;
  NETWORK_ONLINE: NetworkOnlinePayload;
  NETWORK_OFFLINE: NetworkOfflinePayload;
  SYNC_STARTED: SyncStartedPayload;
  SYNC_COMPLETED: SyncCompletedPayload;
  SYNC_FAILED: SyncFailedPayload;
  HEALTH_DATA_UPDATED: HealthDataUpdatedPayload;
  RECOVERY_SCORE_UPDATED: RecoveryScoreUpdatedPayload;
  FORM_ANALYSIS_UPDATED: FormAnalysisUpdatedPayload;
  FORM_WARNING_DETECTED: FormWarningDetectedPayload;
  FORM_ANALYSIS_STARTED: FormAnalysisStartedPayload;
  FORM_ANALYSIS_STOPPED: FormAnalysisStoppedPayload;

  // Sprint 3.8 — Adaptive Training Events
  ADAPTIVE_DECISION_UPDATED: AdaptiveDecisionUpdatedPayload;
  ADAPTIVE_WORKOUT_GENERATED: AdaptiveWorkoutGeneratedPayload;
  ADAPTIVE_RECOMMENDATION_ACCEPTED: AdaptiveRecommendationAcceptedPayload;
  ADAPTIVE_RECOMMENDATION_REJECTED: AdaptiveRecommendationRejectedPayload;
  HEALTH_SYNC_COMPLETED_DETAILS: HealthSyncCompletedWithDetailsPayload;
  HEALTH_SYNC_FAILED_DETAILS: HealthSyncFailedPayload;
  HEALTH_DATA_STALE: HealthDataStalePayload;
  
  // Sprint 4.3 — Real-Time Health Events
  HEALTH_PROVIDER_STATE_CHANGED: { state: string, provider?: string };
  REALTIME_HEART_RATE_UPDATED: RealtimeHeartRateUpdatedPayload;
  
  // Sprint 4.6 — Safety Telemetry Events
  SAFETY_ZONE_TRANSITIONED: SafetyZoneTransitionedPayload;
  SAFETY_INTERVENTION_TRIGGERED: SafetyInterventionTriggeredPayload;
  SAFETY_INTERVENTION_CLEARED: SafetyInterventionClearedPayload;
  SAFETY_RECOMMENDATION_OVERRIDDEN: SafetyRecommendationOverriddenPayload;
  HIGH_HR_SUSTAINED: HighHrSustainedPayload;
  CRITICAL_HR_SUSTAINED: CriticalHrSustainedPayload;
  
  // HealthSyncManager sync updates
  HEALTH_SYNC_STARTED: HealthSyncStartedPayload;
  HEALTH_SYNC_COMPLETED: HealthSyncCompletedPayload;
  HEALTH_SYNC_FAILED: HealthSyncFailedPayload;

  // Sprint 5.1 — Production Observability Operational Events
  API_FAILURE: ApiFailurePayload;
  WORKOUT_FAILURE: WorkoutFailurePayload;
  SYNC_FAILURE: SyncFailurePayload;
  WEARABLE_CONNECTION_FAILURE: WearableConnectionFailurePayload;
  WEARABLE_DISCONNECTED: WearableDisconnectedPayload;
  ADAPTIVE_DECISION_FAILURE: AdaptiveDecisionFailurePayload;
  AI_FAILURE: AIFailurePayload;
  APPLICATION_ERROR: ApplicationErrorPayload;
  PERFORMANCE_ISSUE: PerformanceIssuePayload;
}

export type PlatformEventName = keyof PlatformEventMap;

export interface PlatformEvent<K extends PlatformEventName = PlatformEventName> {
  type: K;
  payload: PlatformEventMap[K];
  timestamp: number;
  correlationId?: string;
}

export type EventHandler<T> = (payload: T) => void | Promise<void>;
export type UnsubscribeFn = () => void;
