/**
 * FitNova AI — Workout Intelligence Layer Contracts
 * Strongly typed models for progressive overload, recovery evaluation, exercise substitutions,
 * plateau detection, workout generation, and unified Nova context.
 */

export interface FormSignal {
  exerciseId: string;
  score: number;
  warnings: string[];
  capturedAt: number;
  confidence: number;
}

import type { Exercise } from '../models/Exercise.ts';
import type { Workout } from '../models/Workout.ts';
import type { WorkoutSet } from '../models/WorkoutSet.ts';
import type { WorkoutSession } from '../models/WorkoutSession.ts';
import type { Equipment } from '../types/enums.ts';

// ==========================================
// PROGRESSIVE OVERLOAD
// ==========================================

export type ProgressionAction =
  | 'weight_increase'
  | 'rep_increase'
  | 'maintain'
  | 'weight_decrease'
  | 'deload'
  | 'change_exercise';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type BodyRegion = 'upper' | 'lower' | 'core' | 'full';

export type ProgressionType =
  | 'weight_jump'
  | 'rep_advance'
  | 'double_progression'
  | 'wave_progression'
  | 'hold'
  | 'deload'
  | 'scale_back'
  | 'exercise_swap';

export interface ProgressionParams {
  exerciseId: string;
  exerciseName: string;
  previousWeightKg: number;
  previousReps: number;
  targetReps: number;
  completedSets: WorkoutSet[];
  lastRpe?: number;
  isCompound?: boolean;
  bodyRegion?: BodyRegion;
  experienceLevel?: ExperienceLevel;
  repRangeMin?: number;
  repRangeMax?: number;
  historicalRpeTrend?: number[]; // e.g. [8.0, 8.5, 9.5]
  historicalWeights?: number[]; // e.g. [80, 80, 80]
  historicalReps?: number[]; // e.g. [8, 8, 8]
  consecutiveMissedRepsCount?: number;
  accumulatedFatigueScore?: number;
  recentEstimated1RM?: number;
  recentVolumeKg?: number;
  repeatedPerformanceSessions?: number;
  exerciseHistorySummary?: {
    totalSessions: number;
    maxWeightKg: number;
    maxReps: number;
    lastSessionDate?: string;
  };
  
  // Sprint 3.9 Adaptive Training Integration
  adaptiveConfidence?: number;
  maxWeightIncreaseKg?: number;
  maxVolumeIncreasePct?: number;
  formWarningActive?: boolean;
}

export interface ProgressionRecommendation {
  exerciseId: string;
  exerciseName: string;
  action: ProgressionAction;
  recommendedWeightKg: number;
  recommendedReps: number;
  weightDeltaKg: number;
  repsDelta: number;
  reason: string;
  confidence: number; // 0.0 to 1.0

  // Sprint 3.5 structured domain extensions
  recommendation: string;
  currentWeight: number;
  recommendedWeight: number;
  currentReps: number;
  targetRPE: number;
  progressionType: ProgressionType;
  isPlateauDetected?: boolean;
  isDeloadRecommended?: boolean;
  substitutedExerciseId?: string;
  substitutedExerciseName?: string;
}

// ==========================================
// RECOVERY DECISION
// ==========================================

export type RecoveryAction =
  | 'train_normal'
  | 'reduce_intensity'
  | 'recovery_workout'
  | 'rest';

export interface WorkoutReadiness {
  sleepHours: number; // e.g. 7.5
  sorenessScore: number; // 1 (none) to 10 (extreme)
  fatigueScore: number; // 1 (fresh) to 10 (exhausted)
  stressScore?: number; // 1 to 10
  restingHeartRate?: number;
  lastWorkoutDate?: string;
  consecutiveTrainingDays?: number;

  // Sprint 3.5 extensions
  sleepTrend?: number[]; // multi-day sleep hours
  muscleSorenessMap?: Record<string, number>; // muscle -> soreness 1-10
  weeklyWorkoutVolumeKg?: number;
  acuteWorkload?: number; // 7-day load volume
  chronicWorkload?: number; // 28-day baseline
  recentHighRpeSessionsCount?: number; // sessions with RPE >= 8.5

  // Sprint 3.7 Wearable Biometrics
  wearableMetrics?: {
    hrvRmssdMs?: number;
    hrvBaselineMs?: number;
    hrvStatus?: 'optimal' | 'suppressed' | 'elevated';
    restingHeartRateBpm?: number;
    restingHeartRateBaselineBpm?: number;
    sleepEfficiencyPct?: number;
    deepSleepPct?: number;
    remSleepPct?: number;
    recoveryScore?: number;
  };
}

export interface RecoveryDecision {
  action: RecoveryAction;
  decision: RecoveryAction;
  intensityModifier: number; // 0.0 to 1.0
  recommendedDurationMinutes?: number;
  reason: string;
  recoveryGuidance: string[];
  confidence: number;

  // Sprint 3.5 structured extensions
  readinessScore: number; // 0 to 100
  recommendedIntensity: 'full' | 'moderate' | 'light' | 'active_recovery' | 'none';
  isRestDayRecommended: boolean;
  recoveryDebt: number; // 0 to 100
  primaryFactors: string[];
  recommendationExplanation: string;

  // Sprint 3.7 Wearable Extensions
  dataSourcesUsed?: Array<'workout_history' | 'hrv' | 'resting_hr' | 'sleep' | 'activity'>;
  wearableEnriched?: boolean;
}

// ==========================================
// PLATEAU DETECTION
// ==========================================

export type PlateauIntervention =
  | 'increase reps'
  | 'change exercise'
  | 'reduce volume'
  | 'deload'
  | 'change rep range'
  | 'maintain current load';

export interface PlateauAnalysis {
  isPlateaued: boolean;
  exerciseId: string;
  exerciseName: string;
  sessionsStagnant: number;
  stalledMetric: 'strength' | 'volume' | 'reps' | 'rpe_exhaustion' | 'none';
  averageRpe: number;
  intervention: PlateauIntervention;
  rationale: string;
  confidence: number;
}

// ==========================================
// SMART WORKOUT GENERATION
// ==========================================

export interface GeneratedWorkoutExercise {
  exercise: Exercise;
  sets: number;
  reps: number;
  weight: number;
  rest: number;
  targetRPE: number;
  rationale: string;
}

export interface GeneratedWorkout {
  workoutName: string;
  goal: string;
  estimatedDuration: number;
  intensity: 'high' | 'moderate' | 'low';
  exercises: GeneratedWorkoutExercise[];
  novaSummary: string;
}

export interface WorkoutGenerationParams {
  userGoal: string;
  availableEquipment: Equipment[];
  trainingSplit?: string; // 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full_body'
  recentHistory?: WorkoutSession[];
  readiness?: WorkoutReadiness;
  targetDurationMinutes?: number;
  experienceLevel?: ExperienceLevel;
  availableExercises?: Exercise[];
}

// ==========================================
// NOVA CONTEXT CONTRACT
// ==========================================

export interface NovaUnifiedContext {
  currentWorkout?: WorkoutSession | null;
  currentExercise?: { exerciseId: string; name: string; targetSets: number; targetReps: number } | null;
  currentSet?: WorkoutSet | null;
  previousPerformance?: { weight: number; reps: number; rpe?: number } | null;
  rpe?: number | null;
  recoveryScore: number;
  sleep: { hours: number; quality: 'optimal' | 'moderate' | 'poor' };
  soreness: { score: number; affectedMuscles: string[] };
  trainingHistory: { totalSessionsCompleted: number; weeklyFrequency: number; lastWorkoutDate?: string };
  prHistory: Array<{ exerciseName: string; metric: string; value: number }>;
  progressionRecommendation?: ProgressionRecommendation | null;
  substitutionOptions?: Array<{ id: string; name: string; matchScore: number; rationale: string }>;
  plateauAlerts?: PlateauAnalysis[];
}

// ==========================================
// EXERCISE SUBSTITUTION
// ==========================================

export interface SubstitutionConstraints {
  availableEquipment?: Equipment[];
  excludeInjuredMuscles?: string[];
  maxDifficulty?: string;
}

export interface ExerciseSubstitution {
  originalExerciseId: string;
  originalExerciseName: string;
  substituteExercise: Exercise;
  matchScore: number; // 0.0 to 1.0
  sharedMuscles: string[];
  reason: string;
}

export interface WorkoutRecommendationParams {
  userGoal: string;
  availableWorkouts: Workout[];
  pastSessions: WorkoutSession[];
  readiness?: WorkoutReadiness;
  preferredDurationMinutes?: number;
  recentMuscleGroups?: string[];
  workoutSplit?: string;
  weeklyVolumeDistribution?: Record<string, number>;
  equipment?: Equipment[];
  targetFrequency?: number;
  progressionTrends?: Array<{ exerciseName: string; isPlateau?: boolean; percentageImprovement?: number }>;
}

// ==========================================
// NOVA PERSONALIZATION PHASE CONTRACTS
// ==========================================

export interface NovaBeforeWorkoutContract {
  recommendedWorkoutId: string;
  recommendedWorkoutName: string;
  readinessExplanation: string;
  expectedIntensity: 'High' | 'Moderate' | 'Light';
  intensityModifier: number;
  progressionTarget: string;
  recoveryWarning: string | null;
  warmupFocus: string[];
  motivationalCue: string;
}

export interface NovaDuringWorkoutContract {
  exerciseId: string;
  exerciseName: string;
  recommendedWeightKg: number;
  recommendedReps: number;
  rpeInterpretation: string;
  progressionFeedback: string;
  fatigueWarning: string | null;
  substitutionRecommendation: {
    suggestedExerciseId: string;
    suggestedExerciseName: string;
    reason: string;
  } | null;
  recommendedRestSeconds: number;
}

export interface NovaAfterWorkoutContract {
  headline: string;
  performanceSummary: string;
  prsSummary: {
    count: number;
    details: Array<{ exerciseName: string; metric: string; value: number }>;
  };
  volumeComparison: {
    sessionVolumeKg: number;
    fourWeekAverageVolumeKg: number;
    percentageDelta: number;
    evaluation: string;
  };
  strengthProgression: {
    progressionCount: number;
    notableProgressions: string[];
  };
  consistencyFeedback: string;
  nextSessionRecommendation: {
    recommendedSplit: string;
    targetMuscleGroups: string[];
    suggestedDate: string;
    reason: string;
  };
}

export interface NovaRecoveryBriefContract {
  readinessScore: number; // 0 to 100
  readinessState: 'optimal' | 'moderate' | 'low' | 'rest_recommended';
  action: 'train_normal' | 'reduce_intensity' | 'recovery_workout' | 'rest';
  recommendedIntensity: 'full' | 'moderate' | 'light' | 'active_recovery' | 'none';
  intensityModifierPct: number; // e.g., 100, 80, 60, 0
  headline: string;
  explanation: string;
  contributingSignals: string[];
  recommendedProtocols: string[];
  dataSources: string[];
}
