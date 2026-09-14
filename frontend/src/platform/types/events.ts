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
  SET_COMPLETED: SetCompletedPayload;
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
