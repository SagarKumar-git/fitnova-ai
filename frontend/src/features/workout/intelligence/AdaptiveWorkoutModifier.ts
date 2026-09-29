/**
 * FitNova AI — Sprint 3.8 Adaptive Workout Modifier
 * Generates immutable modified workout plans from adaptive training decisions.
 * The original workout template is NEVER mutated.
 * Pure TypeScript. Zero UI/React code.
 */

import type { WorkoutExercise } from '../models/WorkoutExercise.ts';
import type { Exercise } from '../models/Exercise.ts';
import type {
  AdaptiveTrainingDecision,
  AdaptiveWorkoutPlan,
  AdaptiveExerciseModification,
} from './types/adaptiveTraining.ts';

export class AdaptiveWorkoutModifier {
  /**
   * Generates a modified workout plan by deep-cloning original exercises
   * and applying the adaptive decision adjustments.
   * The original exercises array is NEVER mutated.
   */
  generateModifiedPlan(
    originalExercises: ReadonlyArray<WorkoutExercise>,
    decision: AdaptiveTrainingDecision,
    workoutName: string = 'Workout'
  ): AdaptiveWorkoutPlan {
    const modifications: AdaptiveExerciseModification[] = [];

    // Deep clone to guarantee immutability
    const modifiedExercises = originalExercises.map((ex) => {
      const cloned = {
        id: ex.id,
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        order: ex.order,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        targetWeight: ex.targetWeight,
        restSeconds: ex.restSeconds,
        notes: ex.notes,
      };

      // No modifications needed for train_as_planned or maintain_load
      if (decision.recommendedAction === 'train_as_planned' || decision.recommendedAction === 'maintain_load') {
        return cloned;
      }

      // Rest day — zero out everything
      if (decision.recommendedAction === 'rest') {
        modifications.push({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          originalWeightKg: ex.targetWeight ?? 0,
          modifiedWeightKg: 0,
          originalReps: ex.targetReps,
          modifiedReps: 0,
          originalSets: ex.targetSets,
          modifiedSets: 0,
          originalRestSeconds: ex.restSeconds,
          modifiedRestSeconds: 0,
          reason: 'Rest day recommended — all exercises suspended.',
          isSubstitution: false,
        });
        cloned.targetSets = 0;
        cloned.targetReps = 0;
        cloned.targetWeight = 0;
        return cloned;
      }

      const originalWeight = ex.targetWeight ?? 0;
      const originalReps = ex.targetReps;
      const originalSets = ex.targetSets;
      const originalRest = ex.restSeconds;

      // Apply weight adjustment
      let modifiedWeight = originalWeight;
      if (originalWeight > 0 && decision.weightAdjustmentPercent !== 0) {
        modifiedWeight = originalWeight * (1 + decision.weightAdjustmentPercent / 100);
        // Round to nearest 0.5kg for practical plate loading
        modifiedWeight = Math.round(modifiedWeight * 2) / 2;
        modifiedWeight = Math.max(0, modifiedWeight);
      }

      // Apply rep adjustment
      let modifiedReps = originalReps + decision.repAdjustment;
      modifiedReps = Math.max(1, modifiedReps);

      // Apply volume adjustment (modify sets)
      let modifiedSets = originalSets;
      if (decision.volumeAdjustmentPercent !== 0) {
        modifiedSets = Math.round(originalSets * (1 + decision.volumeAdjustmentPercent / 100));
        modifiedSets = Math.max(1, modifiedSets);
      }

      // Apply rest adjustment
      let modifiedRest = originalRest + decision.restAdjustmentSeconds;
      modifiedRest = Math.max(30, modifiedRest);

      // Track modification if anything changed
      const hasChanged =
        modifiedWeight !== originalWeight ||
        modifiedReps !== originalReps ||
        modifiedSets !== originalSets ||
        modifiedRest !== originalRest;

      if (hasChanged) {
        const reasonParts: string[] = [];
        if (modifiedWeight !== originalWeight) {
          const delta = modifiedWeight - originalWeight;
          reasonParts.push(`Weight ${delta > 0 ? 'increased' : 'reduced'} by ${Math.abs(delta).toFixed(1)}kg`);
        }
        if (modifiedReps !== originalReps) {
          const delta = modifiedReps - originalReps;
          reasonParts.push(`Reps ${delta > 0 ? 'increased' : 'reduced'} by ${Math.abs(delta)}`);
        }
        if (modifiedSets !== originalSets) {
          const delta = modifiedSets - originalSets;
          reasonParts.push(`Sets ${delta > 0 ? 'added' : 'removed'}: ${Math.abs(delta)}`);
        }
        if (modifiedRest !== originalRest) {
          const delta = modifiedRest - originalRest;
          reasonParts.push(`Rest ${delta > 0 ? 'extended' : 'shortened'} by ${Math.abs(delta)}s`);
        }

        modifications.push({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          originalWeightKg: originalWeight,
          modifiedWeightKg: modifiedWeight,
          originalReps,
          modifiedReps,
          originalSets,
          modifiedSets,
          originalRestSeconds: originalRest,
          modifiedRestSeconds: modifiedRest,
          reason: reasonParts.join('. ') + '.',
          isSubstitution: false,
        });
      }

      cloned.targetWeight = modifiedWeight;
      cloned.targetReps = modifiedReps;
      cloned.targetSets = modifiedSets;
      cloned.restSeconds = modifiedRest;

      return cloned;
    });

    // Calculate volume metrics
    const plannedVolumeKg = this.calculateVolume(originalExercises);
    const adaptiveVolumeKg = this.calculateVolumeFromPlan(modifiedExercises);
    const volumeDeltaPct = plannedVolumeKg > 0
      ? Math.round(((adaptiveVolumeKg - plannedVolumeKg) / plannedVolumeKg) * 100)
      : 0;

    // Generate summary
    const summary = this.generateSummary(decision, modifications, volumeDeltaPct);

    return {
      originalWorkoutName: workoutName,
      originalExerciseCount: originalExercises.length,
      originalTotalSets: originalExercises.reduce((sum, ex) => sum + ex.targetSets, 0),
      modifiedExercises,
      modifications,
      plannedVolumeKg,
      adaptiveVolumeKg,
      volumeDeltaPct,
      summary,
      decision,
      generatedAt: decision.generatedAt,
    };
  }

  /**
   * Applies an exercise substitution to an existing adaptive workout plan.
   * Returns a new plan with the substitution applied (immutable).
   */
  applySubstitution(
    plan: AdaptiveWorkoutPlan,
    exerciseId: string,
    substituteExercise: Exercise
  ): AdaptiveWorkoutPlan {
    const modifiedExercises = plan.modifiedExercises.map((ex) => {
      if (ex.exerciseId !== exerciseId) return { ...ex };

      return {
        ...ex,
        exerciseId: substituteExercise.id,
        exerciseName: substituteExercise.name,
        notes: `Substituted from original exercise. ${ex.notes || ''}`.trim(),
      };
    });

    const originalExercise = plan.modifiedExercises.find((e) => e.exerciseId === exerciseId);

    const substitutionMod: AdaptiveExerciseModification = {
      exerciseId,
      exerciseName: originalExercise?.exerciseName ?? exerciseId,
      originalWeightKg: originalExercise?.targetWeight ?? 0,
      modifiedWeightKg: originalExercise?.targetWeight ?? 0,
      originalReps: originalExercise?.targetReps ?? 8,
      modifiedReps: originalExercise?.targetReps ?? 8,
      originalSets: originalExercise?.targetSets ?? 3,
      modifiedSets: originalExercise?.targetSets ?? 3,
      originalRestSeconds: originalExercise?.restSeconds ?? 90,
      modifiedRestSeconds: originalExercise?.restSeconds ?? 90,
      reason: `Exercise substituted with ${substituteExercise.name}.`,
      isSubstitution: true,
      substituteExerciseId: substituteExercise.id,
      substituteExerciseName: substituteExercise.name,
    };

    return {
      ...plan,
      modifiedExercises,
      modifications: [...plan.modifications, substitutionMod],
    };
  }

  private calculateVolume(exercises: ReadonlyArray<WorkoutExercise>): number {
    return exercises.reduce((total, ex) => {
      const weight = ex.targetWeight ?? 0;
      return total + (weight * ex.targetReps * ex.targetSets);
    }, 0);
  }

  private calculateVolumeFromPlan(
    exercises: Array<{ targetWeight?: number; targetReps: number; targetSets: number }>
  ): number {
    return exercises.reduce((total, ex) => {
      const weight = ex.targetWeight ?? 0;
      return total + (weight * ex.targetReps * ex.targetSets);
    }, 0);
  }

  private generateSummary(
    decision: AdaptiveTrainingDecision,
    modifications: AdaptiveExerciseModification[],
    volumeDeltaPct: number
  ): string {
    if (decision.recommendedAction === 'train_as_planned') {
      return 'Your recovery signals and performance history support training as planned. Proceed with your programmed session.';
    }

    if (decision.recommendedAction === 'rest') {
      return 'Nova recommends a full rest day based on multiple recovery signals. Focus on nutrition and sleep.';
    }

    if (decision.recommendedAction === 'recovery_workout') {
      return 'Nova recommends an active recovery session. Light mobility and controlled movements at low intensity.';
    }

    if (modifications.length === 0) {
      return 'No specific exercise modifications required for today\'s session.';
    }

    const modCount = modifications.length;
    const volumeText = volumeDeltaPct < 0
      ? `reducing overall volume by ${Math.abs(volumeDeltaPct)}%`
      : volumeDeltaPct > 0
        ? `increasing volume by ${volumeDeltaPct}%`
        : 'maintaining overall volume';

    return `Nova recommends adjusting ${modCount} exercise${modCount > 1 ? 's' : ''}, ${volumeText}. ${decision.reasons[0] || ''}`;
  }
}
