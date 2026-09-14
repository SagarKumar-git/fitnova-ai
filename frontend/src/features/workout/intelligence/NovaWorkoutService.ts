/**
 * FitNova AI — Nova Workout Intelligence Service
 * Coordinates AI Provider (Gemini / Mock) with deterministic intelligence engines
 * for contextual pre-workout, during-workout, and post-workout coaching.
 * Zero direct Gemini browser SDK calls.
 */

import type { AIProvider } from '../../../services/ai/providers/AIProvider.ts';
import { WorkoutIntelligenceService } from './WorkoutIntelligenceService.ts';
import type { Workout } from '../models/Workout.ts';
import type { WorkoutExercise } from '../models/WorkoutExercise.ts';
import type { WorkoutSet } from '../models/WorkoutSet.ts';
import type { WorkoutSession } from '../models/WorkoutSession.ts';
import type { WorkoutReadiness } from './types.ts';

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

  /**
   * Pre-workout coaching recommendations before beginning a session.
   */
  async getPreWorkoutGuidance(
    workout: Workout,
    readiness?: WorkoutReadiness
  ): Promise<NovaPreWorkoutAdvice> {
    const recovery = readiness
      ? this.intelligence.evaluateRecovery(readiness)
      : undefined;

    let intensityLevel: 'High' | 'Moderate' | 'Light' = 'High';
    let intensityModifier = 1.0;

    if (recovery) {
      if (recovery.action === 'rest' || recovery.action === 'recovery_workout') {
        intensityLevel = 'Light';
        intensityModifier = recovery.intensityModifier;
      } else if (recovery.action === 'reduce_intensity') {
        intensityLevel = 'Moderate';
        intensityModifier = recovery.intensityModifier;
      }
    }

    const firstExerciseName = workout.exercises[0]?.exerciseName || 'Compound movement';

    return {
      intensityLevel,
      intensityModifier,
      warmupFocus: [
        `5 mins dynamic mobility prioritizing ${workout.targetMuscleGroups.join(', ')}`,
        `2 progressive warm-up sets on ${firstExerciseName} (50% and 75% load)`,
        'Establish rhythmic diaphragmatic breathing and brace your core.',
      ],
      progressionTarget: `Target progressive overload on your first 2 working sets of ${firstExerciseName}.`,
      motivationalCue: `Fuel your ambition. Execute every rep with explosive intent and locked-in form!`,
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
}
