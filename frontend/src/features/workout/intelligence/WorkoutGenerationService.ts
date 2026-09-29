/**
 * FitNova AI — Smart Workout Generation Service
 * Deterministic domain generator combining user goals, equipment availability,
 * training split, recovery readiness, and progressive overload into a structured workout.
 * Zero Gemini API keys exposed in frontend.
 */

import type {
  GeneratedWorkout,
  GeneratedWorkoutExercise,
  WorkoutGenerationParams,
} from './types.ts';
import type { Exercise } from '../models/Exercise.ts';
import { MOCK_EXERCISES } from '../mocks/mockExercises.ts';
import { RecoveryDecisionEngine } from './RecoveryDecisionEngine.ts';

export class WorkoutGenerationService {
  private readonly recoveryEngine: RecoveryDecisionEngine;

  constructor(recoveryEngine?: RecoveryDecisionEngine) {
    this.recoveryEngine = recoveryEngine ?? new RecoveryDecisionEngine();
  }

  generateWorkout(params: WorkoutGenerationParams): GeneratedWorkout {
    const {
      userGoal = 'hypertrophy',
      availableEquipment = [],
      trainingSplit = 'push',
      readiness,
      targetDurationMinutes = 55,
      availableExercises = MOCK_EXERCISES,
    } = params;

    // 1. Evaluate Recovery & Readiness State
    const recoveryDecision = readiness
      ? this.recoveryEngine.evaluateRecovery(readiness)
      : null;

    const isLowRecovery = recoveryDecision?.action === 'recovery_workout' || recoveryDecision?.action === 'rest';
    const isModerateRecovery = recoveryDecision?.action === 'reduce_intensity';

    const intensity: 'high' | 'moderate' | 'low' = isLowRecovery
      ? 'low'
      : isModerateRecovery
      ? 'moderate'
      : 'high';

    // 2. Filter exercises by available equipment
    const normalizedEquip = availableEquipment.map((e) => e.toLowerCase());
    const eligibleExercises = availableExercises.filter((ex) => {
      if (normalizedEquip.length === 0) return true;
      const exEquip = (ex.equipment || 'bodyweight').toLowerCase();
      return (
        normalizedEquip.includes(exEquip) ||
        exEquip === 'bodyweight' ||
        normalizedEquip.includes('all')
      );
    });

    const pool = eligibleExercises.length > 0 ? eligibleExercises : availableExercises;

    // 3. Resolve Target Muscle Groups from Split
    const targetMuscles = this.getTargetMusclesForSplit(trainingSplit);

    // 4. Select Exercises to Balance Movements
    const selectedExercises: Exercise[] = [];
    for (const muscle of targetMuscles) {
      const match = pool.find(
        (ex) =>
          ex.primaryMuscleGroup.toLowerCase() === muscle.toLowerCase() &&
          !selectedExercises.some((s) => s.id === ex.id)
      );
      if (match) {
        selectedExercises.push(match);
      }
    }

    // Fallback if split didn't yield at least 3 exercises
    if (selectedExercises.length < 3) {
      for (const ex of pool) {
        if (!selectedExercises.some((s) => s.id === ex.id)) {
          selectedExercises.push(ex);
        }
        if (selectedExercises.length >= 4) break;
      }
    }

    // Limit to 4-5 exercises to fit estimated duration
    const finalExercises = selectedExercises.slice(0, Math.min(5, Math.max(3, Math.floor(targetDurationMinutes / 12))));

    // 5. Build Structured Workout Exercises
    const workoutExercises: GeneratedWorkoutExercise[] = finalExercises.map((exercise, index) => {
      const isFirstCompound = index === 0;

      let sets = 3;
      let reps = 10;
      let targetRPE = 8.0;
      let rest = exercise.defaultRestSeconds || 90;
      let baseWeight = 40.0;

      // Adjust based on goal
      if (userGoal.toLowerCase().includes('strength')) {
        sets = isFirstCompound ? 4 : 3;
        reps = isFirstCompound ? 5 : 6;
        targetRPE = 8.5;
        rest = isFirstCompound ? 150 : 120;
        baseWeight = isFirstCompound ? 70.0 : 45.0;
      } else if (userGoal.toLowerCase().includes('endurance') || userGoal.toLowerCase().includes('fat_loss')) {
        sets = 3;
        reps = 14;
        targetRPE = 7.5;
        rest = 60;
        baseWeight = 30.0;
      } else {
        // Hypertrophy
        sets = isFirstCompound ? 4 : 3;
        reps = isFirstCompound ? 8 : 10;
        targetRPE = 8.0;
        rest = isFirstCompound ? 120 : 90;
        baseWeight = isFirstCompound ? 60.0 : 35.0;
      }

      // Modify for recovery state
      if (isLowRecovery) {
        sets = Math.max(2, sets - 1);
        targetRPE = 6.5;
        baseWeight = Math.round(baseWeight * 0.7);
        rest = Math.max(90, rest);
      } else if (isModerateRecovery) {
        targetRPE = 7.5;
        baseWeight = Math.round(baseWeight * 0.85);
      }

      const rationale = isFirstCompound
        ? `Primary heavy compound movement targeting ${exercise.primaryMuscleGroup} at RPE ${targetRPE} for optimal mechanical tension.`
        : `Accessory volume for ${exercise.primaryMuscleGroup} to maximize metabolic stress and hypertrophic stimulus.`;

      return {
        exercise,
        sets,
        reps,
        weight: baseWeight,
        rest,
        targetRPE,
        rationale,
      };
    });

    const splitTitle = trainingSplit.charAt(0).toUpperCase() + trainingSplit.slice(1);
    const workoutName = isLowRecovery
      ? `Active Recovery: ${splitTitle} Mobility & Flow`
      : `Adaptive AI ${splitTitle} Session (${userGoal.toUpperCase()})`;

    const novaSummary = isLowRecovery
      ? `Readiness is low (Score ${recoveryDecision?.readinessScore ?? 50}/100). Nova dialed back working volume by 30% with submaximal loads to promote circulation without neural taxation.`
      : `Programmed ${finalExercises.length} targeted exercises for ${trainingSplit.toUpperCase()}. Prioritized progressive overload on ${finalExercises[0]?.name || 'compounds'} with ${intensity} intensity.`;

    const estimatedDuration = Math.min(
      targetDurationMinutes,
      workoutExercises.reduce((acc, e) => acc + (e.sets * (e.reps * 3 + e.rest)) / 60, 10)
    );

    return {
      workoutName,
      goal: userGoal,
      estimatedDuration: Math.round(estimatedDuration),
      intensity,
      exercises: workoutExercises,
      novaSummary,
    };
  }

  private getTargetMusclesForSplit(split: string): string[] {
    const s = split.toLowerCase();
    if (s.includes('push')) return ['Chest', 'Shoulders', 'Triceps'];
    if (s.includes('pull')) return ['Back', 'Biceps'];
    if (s.includes('leg')) return ['Quads', 'Hamstrings', 'Calves'];
    if (s.includes('upper')) return ['Chest', 'Back', 'Shoulders', 'Arms'];
    if (s.includes('lower')) return ['Quads', 'Hamstrings', 'Glutes'];
    return ['Chest', 'Back', 'Quads', 'Shoulders']; // Full body default
  }
}
