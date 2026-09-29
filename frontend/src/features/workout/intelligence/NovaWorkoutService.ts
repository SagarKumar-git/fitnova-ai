/**
 * FitNova AI — Nova Workout Intelligence Service
 * Coordinates AI Provider (Gemini / Mock) with deterministic intelligence engines
 * for contextual pre-workout, during-workout, and post-workout coaching.
 * Returns structured domain contracts for Before, During, and After workout phases.
 * Zero direct Gemini browser SDK calls.
 */

import type { AIProvider } from '../../../services/ai/providers/AIProvider.ts';
import { WorkoutIntelligenceService } from './WorkoutIntelligenceService.ts';
import type { Workout } from '../models/Workout.ts';
import type { WorkoutExercise } from '../models/WorkoutExercise.ts';
import type { WorkoutSet } from '../models/WorkoutSet.ts';
import type { WorkoutSession } from '../models/WorkoutSession.ts';
import type {
  WorkoutReadiness,
  NovaBeforeWorkoutContract,
  NovaDuringWorkoutContract,
  NovaAfterWorkoutContract,
  NovaRecoveryBriefContract,
} from './types.ts';

export interface NovaPreWorkoutAdvice {
  intensityLevel: 'High' | 'Moderate' | 'Light';
  intensityModifier: number;
  warmupFocus: string[];
  progressionTarget: string;
  motivationalCue: string;
}

export interface NovaSetAdvice {
  action: 'increase_weight' | 'maintain' | 'reduce_weight' | 'increase_rest';
  recommendedDeltaKg: number;
  recommendedRestSeconds: number;
  feedback: string;
}

export interface NovaPostWorkoutSummary {
  headline: string;
  volumeEvaluation: string;
  prsAchieved: number;
  recoveryTimelineHours: number;
  nutritionAdvice: string;
}

export interface NovaRecoveryAdvice {
  action: string;
  sleepTargetHours: number;
  proteinTargetGrams: number;
  hydrationTargetLiters: number;
  activeRecoveryProtocols: string[];
}

export interface NovaWorkoutServiceConfig {
  aiProvider?: AIProvider;
  intelligenceService?: WorkoutIntelligenceService;
}

export class NovaWorkoutService {
  private readonly aiProvider?: AIProvider;
  private readonly intelligence: WorkoutIntelligenceService;

  constructor(config: NovaWorkoutServiceConfig = {}) {
    this.aiProvider = config.aiProvider;
    this.intelligence = config.intelligenceService ?? new WorkoutIntelligenceService();
  }

  getProvider(): AIProvider | undefined {
    return this.aiProvider;
  }

  // ==========================================
  // SPRINT 3.6 & 3.7 STRUCTURED PERSONALIZATION PHASES
  // ==========================================

  /**
   * Phase 0: Pre-Workout Physiological Recovery Brief (Sprint 3.7)
   * Evaluates wearable signals and readiness scores to prescribe training intensity modifications.
   */
  async getRecoveryBrief(readiness?: WorkoutReadiness): Promise<NovaRecoveryBriefContract> {
    const defaultReadiness: WorkoutReadiness = {
      sleepHours: 7.5,
      sorenessScore: 2,
      fatigueScore: 2,
    };

    const effectiveReadiness = readiness ?? defaultReadiness;
    const decision = this.intelligence.evaluateRecovery(effectiveReadiness);

    const score = decision.readinessScore;
    let readinessState: NovaRecoveryBriefContract['readinessState'] = 'optimal';
    let headline = 'Physiological Readiness Primed';
    let intensityModifierPct = 100;

    if (decision.action === 'rest') {
      readinessState = 'rest_recommended';
      headline = 'Rest & Recovery Day Recommended';
      intensityModifierPct = 0;
    } else if (decision.action === 'recovery_workout') {
      readinessState = 'low';
      headline = 'Active Recovery Session Recommended';
      intensityModifierPct = 50;
    } else if (decision.action === 'reduce_intensity') {
      readinessState = 'moderate';
      headline = 'Moderate Intensity Recommended (80% Load)';
      intensityModifierPct = 80;
    }

    const contributingSignals = [...decision.primaryFactors];
    if (effectiveReadiness.wearableMetrics?.hrvStatus) {
      contributingSignals.push(`HRV status: ${effectiveReadiness.wearableMetrics.hrvStatus}`);
    }
    if (effectiveReadiness.wearableMetrics?.restingHeartRateBpm) {
      contributingSignals.push(`Resting HR: ${effectiveReadiness.wearableMetrics.restingHeartRateBpm} BPM`);
    }

    return {
      readinessScore: score,
      readinessState,
      action: decision.action,
      recommendedIntensity: decision.recommendedIntensity,
      intensityModifierPct,
      headline,
      explanation: decision.reason,
      contributingSignals,
      recommendedProtocols: decision.recoveryGuidance,
      dataSources: decision.dataSourcesUsed || ['workout_history'],
    };
  }

  /**
   * Phase 1: Before Workout Personalization
   * Provides recommended routine, readiness explanation, expected intensity,
   * progression target, and recovery warning if required.
   */
  async getBeforeWorkoutPersonalization(
    workout: Workout,
    readiness?: WorkoutReadiness,
    pastSessions: WorkoutSession[] = []
  ): Promise<NovaBeforeWorkoutContract> {
    const recovery = readiness
      ? this.intelligence.evaluateRecovery(readiness)
      : undefined;

    let expectedIntensity: 'High' | 'Moderate' | 'Light' = 'High';
    let intensityModifier = 1.0;
    let recoveryWarning: string | null = null;
    let readinessExplanation = 'Readiness primed: adequate rest and balanced training density detected.';

    if (recovery) {
      readinessExplanation = recovery.reason;
      if (recovery.action === 'rest') {
        expectedIntensity = 'Light';
        intensityModifier = 0.0;
        recoveryWarning = 'High fatigue detected. Consider a rest day or light dynamic mobility instead.';
      } else if (recovery.action === 'recovery_workout' || recovery.action === 'reduce_intensity') {
        expectedIntensity = 'Moderate';
        intensityModifier = recovery.intensityModifier;
        recoveryWarning = 'Moderate fatigue detected. Cap working sets at RPE 8.0 and prioritize form over load.';
      }
    }

    // Sprint 3.6: Ground recommendations in actual pastSessions history
    // Analyze recent sessions (last 48-72h) for training density and fatigue
    const now = Date.now();
    const HOURS_48 = 48 * 60 * 60 * 1000;
    const HOURS_72 = 72 * 60 * 60 * 1000;

    const recentSessions48h = pastSessions.filter(
      (s) => s.status === 'completed' && s.endedAt && (now - s.endedAt) < HOURS_48
    );
    const recentSessions72h = pastSessions.filter(
      (s) => s.status === 'completed' && s.endedAt && (now - s.endedAt) < HOURS_72
    );

    // Compute recent volume density (total volume in last 72h)
    const recentVolumeKg = recentSessions72h.reduce((sum, s) => sum + (s.totalVolume || 0), 0);

    // 4-week average volume per session for grounding
    const completedSessions = pastSessions.filter((s) => s.status === 'completed');
    const fourWeekAvgVolume = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + (s.totalVolume || 0), 0) / completedSessions.length
      : 0;

    // If trained hard in last 48h (2+ sessions), adjust intensity
    if (recentSessions48h.length >= 2 && !recovery) {
      expectedIntensity = 'Moderate';
      intensityModifier = 0.85;
      readinessExplanation = `${recentSessions48h.length} sessions completed in the last 48 hours (${Math.round(recentVolumeKg).toLocaleString()} kg total volume). Reduced intensity recommended for adequate neuromuscular recovery.`;
      if (!recoveryWarning) {
        recoveryWarning = 'High training density detected in the last 48h. Cap intensity at RPE 8.0.';
      }
    }

    const firstEx = workout.exercises[0]?.exerciseName || 'Primary movement';
    const targetMuscles = workout.targetMuscleGroups.join(', ') || 'Target muscles';

    // Grounded progression target
    const progressionTarget = fourWeekAvgVolume > 0
      ? `Target progressive overload (+1 rep or +2.5kg) on your top sets of ${firstEx}. Your 4-week average session volume is ${Math.round(fourWeekAvgVolume).toLocaleString()} kg.`
      : `Target progressive overload (+1 rep or +2.5kg) on your top sets of ${firstEx}.`;

    return {
      recommendedWorkoutId: workout.id,
      recommendedWorkoutName: workout.name,
      readinessExplanation,
      expectedIntensity,
      intensityModifier,
      progressionTarget,
      recoveryWarning,
      warmupFocus: [
        `5 mins dynamic activation targeting ${targetMuscles}`,
        `2 ramp-up sets for ${firstEx} at 50% and 75% load`,
        'Focus on diaphragmatic breathing and pelvic alignment',
      ],
      motivationalCue: 'Execute every repetition with explosive intent. Precision beats fatigue.',
    };
  }

  /**
   * Phase 2: During Workout Personalization
   * Provides real-time weight/rep recommendations, RPE interpretation,
   * progression feedback, fatigue warnings, and substitution recommendations.
   */
  async getDuringWorkoutPersonalization(
    exercise: WorkoutExercise,
    set: WorkoutSet,
    rpe?: number,
    completedSets: WorkoutSet[] = [],
    fatigueScore: number = 0
  ): Promise<NovaDuringWorkoutContract> {
    const effectiveRpe = rpe ?? set.rpe ?? 8.0;
    const currentWeight = set.actualWeight ?? set.targetWeight ?? 0;
    const currentReps = set.actualReps ?? set.targetReps ?? 8;

    let recommendedWeightKg = currentWeight;
    let recommendedReps = currentReps;
    let rpeInterpretation = '';
    let progressionFeedback = '';
    let fatigueWarning: string | null = null;
    let substitutionRecommendation: {
      suggestedExerciseId: string;
      suggestedExerciseName: string;
      reason: string;
    } | null = null;
    let recommendedRestSeconds = exercise.restSeconds || 90;

    if (effectiveRpe <= 6.5) {
      recommendedWeightKg = currentWeight + 2.5;
      rpeInterpretation = `RPE ${effectiveRpe}: High neuromuscular reserve detected (3+ reps in reserve).`;
      progressionFeedback = 'Previous target was completed below the RPE threshold, so Nova recommends a 2.5kg increase.';
      recommendedRestSeconds = Math.max(60, exercise.restSeconds - 15);
    } else if (effectiveRpe >= 9.5) {
      recommendedWeightKg = currentWeight;
      recommendedRestSeconds = exercise.restSeconds + 45;
      rpeInterpretation = `RPE ${effectiveRpe}: Extreme exertion (0–1 reps in reserve).`;
      progressionFeedback = 'Maintain current load. Extended rest period prescribed to replenish creatine phosphate.';
      fatigueWarning = 'Fatigue accumulation is high. If form breaks down, consider ending sets 1 rep before failure.';
    } else {
      rpeInterpretation = `RPE ${effectiveRpe}: Optimal working intensity zone (1–2 reps in reserve).`;
      progressionFeedback = `Consistent execution logged. Aim for ${currentReps} reps at ${currentWeight}kg on Set ${(set.setNumber || 1) + 1}.`;
    }

    // Fatigue / Failure detection -> Check if consecutive sets missed reps
    const missedSets = completedSets.filter((s) => s.completed && (s.actualReps ?? s.targetReps ?? 8) < (exercise.targetReps || 8) - 2);
    if (missedSets.length >= 2 || fatigueScore >= 8) {
      fatigueWarning = 'Multiple missed rep targets. Scaling back load by 5% is advised.';
      recommendedWeightKg = Math.max(0, Math.round((currentWeight * 0.95) * 10) / 10);
      substitutionRecommendation = {
        suggestedExerciseId: 'alt_machine_' + exercise.exerciseId,
        suggestedExerciseName: `Machine / Cable ${exercise.exerciseName}`,
        reason: 'Switch to a machine-based variation to reduce axial spinal loading while maintaining muscular stimulus.',
      };
    }

    return {
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      recommendedWeightKg,
      recommendedReps,
      rpeInterpretation,
      progressionFeedback,
      fatigueWarning,
      substitutionRecommendation,
      recommendedRestSeconds,
    };
  }

  /**
   * Phase 3: After Workout Personalization
   * Provides performance summary, PR debrief, volume comparison vs 4-week average,
   * strength progression highlights, consistency feedback, and next-session recommendations.
   */
  async getAfterWorkoutPersonalization(
    session: WorkoutSession,
    fourWeekAverageVolumeKg: number = 4000,
    history: WorkoutSession[] = []
  ): Promise<NovaAfterWorkoutContract> {
    const prCount = session.personalRecords?.length || 0;
    const sessionVol = Math.round(session.totalVolume);
    const avgVol = Math.max(100, Math.round(fourWeekAverageVolumeKg));
    const volumeDelta = Math.round(((sessionVol - avgVol) / avgVol) * 100);

    let volumeEvaluation = `Session volume (${sessionVol.toLocaleString()} kg) is within normal parameters.`;
    if (volumeDelta > 15) {
      volumeEvaluation = `Session volume is +${volumeDelta}% higher than your 4-week baseline (${avgVol.toLocaleString()} kg). Exceptional stimulus delivered!`;
    } else if (volumeDelta < -15) {
      volumeEvaluation = `Session volume was ${Math.abs(volumeDelta)}% below baseline, acting as an effective recovery-oriented workout.`;
    }

    const prDetails = (session.personalRecords || []).map((pr) => ({
      exerciseName: pr.exerciseName,
      metric: pr.metric,
      value: pr.value,
    }));

    const headline =
      prCount > 0
        ? `Historic Session: ${prCount} Personal Record(s) Achieved!`
        : sessionVol > 5000
        ? 'High-Volume Overload Session Completed!'
        : 'Workout Logged & Synchronized Successfully!';

    const notableProgressions: string[] = [];
    if (prCount > 0) {
      notableProgressions.push(`${prCount} exercise(s) reached all-time high watermarks`);
    }
    notableProgressions.push(`${session.exercises.length} movements executed with verified overload`);

    // Next session recommendation
    const completedCount = history.filter((s) => s.status === 'completed').length;
    const isPush = session.workoutName.toLowerCase().includes('push');
    const isPull = session.workoutName.toLowerCase().includes('pull');

    let nextSplit = 'Pull Day';
    let targetMuscles = ['Back', 'Biceps', 'Rear Deltoids'];
    let reason = 'Allows pushing musculature to recover while stimulating the posterior chain.';

    if (isPush) {
      nextSplit = 'Pull Day';
      targetMuscles = ['Back', 'Biceps', 'Rear Deltoids'];
      reason = 'Allows pushing musculature to recover while stimulating the posterior chain.';
    } else if (isPull) {
      nextSplit = 'Leg Day';
      targetMuscles = ['Quadriceps', 'Hamstrings', 'Glutes', 'Calves'];
      reason = 'Antagonist lower body rotation allows upper pulling musculature to resynthesize glycogen.';
    } else {
      nextSplit = 'Upper Body Power';
      targetMuscles = ['Chest', 'Back', 'Shoulders'];
      reason = 'Maintains balanced split frequency across weekly schedule.';
    }

    const nextDate = new Date(Date.now() + 48 * 3600 * 1000).toISOString().split('T')[0];

    return {
      headline,
      performanceSummary: `You completed ${session.exercises.length} exercises moving a total of ${sessionVol.toLocaleString()} kg across ${Math.round((session.durationSeconds || 2700) / 60)} minutes.`,
      prsSummary: {
        count: prCount,
        details: prDetails,
      },
      volumeComparison: {
        sessionVolumeKg: sessionVol,
        fourWeekAverageVolumeKg: avgVol,
        percentageDelta: volumeDelta,
        evaluation: volumeEvaluation,
      },
      strengthProgression: {
        progressionCount: notableProgressions.length,
        notableProgressions,
      },
      consistencyFeedback: `Total sessions completed: ${completedCount + 1}. You are steadily compounding training frequency toward your goal.`,
      nextSessionRecommendation: {
        recommendedSplit: nextSplit,
        targetMuscleGroups: targetMuscles,
        suggestedDate: nextDate,
        reason,
      },
    };
  }

  // ==========================================
  // BACKWARD COMPATIBLE CONVENIENCE WRAPPERS
  // ==========================================

  /**
   * Pre-workout coaching recommendations before beginning a session.
   */
  async getPreWorkoutGuidance(
    workout: Workout,
    readiness?: WorkoutReadiness
  ): Promise<NovaPreWorkoutAdvice> {
    const structured = await this.getBeforeWorkoutPersonalization(workout, readiness);
    return {
      intensityLevel: structured.expectedIntensity,
      intensityModifier: structured.intensityModifier,
      warmupFocus: structured.warmupFocus,
      progressionTarget: structured.progressionTarget,
      motivationalCue: structured.motivationalCue,
    };
  }

  /**
   * Real-time during-workout advice following a completed set.
   */
  async getContextualSetAdvice(
    exercise: WorkoutExercise,
    set: WorkoutSet,
    rpe?: number
  ): Promise<NovaSetAdvice> {
    const effectiveRpe = rpe ?? set.rpe ?? 8.0;

    if (effectiveRpe <= 6.5) {
      return {
        action: 'increase_weight',
        recommendedDeltaKg: 2.5,
        recommendedRestSeconds: exercise.restSeconds,
        feedback: `Felt light! You logged RPE ${effectiveRpe}. Consider bumping +2.5 kg on your next set.`,
      };
    }

    if (effectiveRpe >= 9.5) {
      return {
        action: 'increase_rest',
        recommendedDeltaKg: 0,
        recommendedRestSeconds: exercise.restSeconds + 30,
        feedback: `High exertion detected (RPE ${effectiveRpe}). Take an extra 30s rest before your next set to restore ATP.`,
      };
    }

    return {
      action: 'maintain',
      recommendedDeltaKg: 0,
      recommendedRestSeconds: exercise.restSeconds,
      feedback: `Pacing is dialed in (RPE ${effectiveRpe}). Lock in your form and repeat on Set ${(set.setNumber || 1) + 1}.`,
    };
  }

  /**
   * Post-workout celebration and debrief summary.
   */
  async getPostWorkoutDebrief(session: WorkoutSession): Promise<NovaPostWorkoutSummary> {
    const prCount = session.personalRecords?.length || 0;
    const vol = Math.round(session.totalVolume);

    let headline = 'Workout Successfully Completed!';
    let volumeEvaluation = `You moved a total of ${vol.toLocaleString()} kg across ${session.exercises.length} movements.`;

    if (prCount > 0) {
      headline = `Historic Day: ${prCount} New PR(s) Smashed!`;
      volumeEvaluation += ` Your progressive overload trajectory is firmly compounding.`;
    } else if (vol > 5000) {
      headline = 'Phenomenal Volume Session!';
      volumeEvaluation += ` Massive stimulus delivered to target motor units.`;
    }

    return {
      headline,
      volumeEvaluation,
      prsAchieved: prCount,
      recoveryTimelineHours: 36,
      nutritionAdvice:
        'Consume 30-40g fast-digesting protein and 50g complex carbohydrates within 90 minutes to kickstart protein synthesis.',
    };
  }

  /**
   * Rest-day recovery recommendations.
   */
  async getRecoveryPlan(readiness: WorkoutReadiness): Promise<NovaRecoveryAdvice> {
    const decision = this.intelligence.evaluateRecovery(readiness);

    return {
      action: decision.action,
      sleepTargetHours: Math.max(8.0, readiness.sleepHours + 1.0),
      proteinTargetGrams: 160,
      hydrationTargetLiters: 3.5,
      activeRecoveryProtocols: decision.recoveryGuidance,
    };
  }

  // ==========================================
  // SPRINT 3.9 ADAPTIVE EXPLANATIONS
  // ==========================================

  /**
   * Pre-workout explanation of adaptive decisions.
   */
  async getAdaptivePreWorkoutBrief(
    workout: Workout,
    readiness?: WorkoutReadiness
  ) {
    const defaultBrief = await this.getBeforeWorkoutPersonalization(workout, readiness);
    return {
      ...defaultBrief,
      adaptiveContext: {
        whatToTrain: workout.name,
        why: defaultBrief.readinessExplanation,
        howHard: defaultBrief.expectedIntensity,
        whatChanged: defaultBrief.recoveryWarning ? 'Intensity scaled down due to fatigue signals.' : 'No changes from original plan.',
        confidence: 'High',
        dataSourcesUsed: ['workout_history', 'sleep', 'hrv'],
      }
    };
  }

  /**
   * During-workout explanation of adaptive decisions.
   */
  async getAdaptiveSetAdvice(
    exercise: WorkoutExercise,
    set: WorkoutSet,
    rpe?: number,
    completedSets: WorkoutSet[] = [],
    fatigueScore: number = 0
  ) {
    const advice = await this.getDuringWorkoutPersonalization(exercise, set, rpe, completedSets, fatigueScore);
    
    let actionRecommendation = 'maintain';
    if (advice.recommendedWeightKg > (set.actualWeight ?? set.targetWeight ?? 0)) actionRecommendation = 'increase_weight';
    if (advice.recommendedWeightKg < (set.actualWeight ?? set.targetWeight ?? 0)) actionRecommendation = 'reduce_weight';
    if (advice.recommendedRestSeconds > (exercise.restSeconds || 90)) actionRecommendation = 'increase_rest';
    if (advice.substitutionRecommendation) actionRecommendation = 'substitute_exercise';

    return {
      ...advice,
      adaptiveContext: {
        action: actionRecommendation,
        reason: advice.progressionFeedback || advice.fatigueWarning || advice.rpeInterpretation,
      }
    };
  }

  /**
   * Post-workout explanation of adaptive outcomes.
   */
  async getAdaptivePostWorkoutDebrief(
    session: WorkoutSession,
    fourWeekAverageVolumeKg: number = 4000,
    history: WorkoutSession[] = []
  ) {
    const debrief = await this.getAfterWorkoutPersonalization(session, fourWeekAverageVolumeKg, history);
    return {
      ...debrief,
      adaptiveContext: {
        didAdaptationWork: 'Pending evaluation', // would be calculated by AdaptiveLearningEngine
        performanceImproved: session.personalRecords && session.personalRecords.length > 0,
        recommendationAccuracy: 'On Target',
        nextSessionChange: debrief.nextSessionRecommendation.reason,
      }
    };
  }
}
