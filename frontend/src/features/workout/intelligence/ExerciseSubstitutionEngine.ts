/**
 * FitNova AI — Exercise Substitution Engine
 * Recommends biomechanically equivalent exercises matching target muscle groups,
 * movement patterns, and available gym/home equipment.
 * Zero UI/React code.
 */

import type { Exercise } from '../models/Exercise.ts';
import type { SubstitutionConstraints, ExerciseSubstitution } from './types.ts';
import { MOVEMENT_PATTERNS } from './constants.ts';

export class ExerciseSubstitutionEngine {
  findSubstitutes(
    originalExercise: Exercise,
    allExercises: Exercise[],
    constraints: SubstitutionConstraints = {}
  ): ExerciseSubstitution[] {
    const { availableEquipment, excludeInjuredMuscles = [] } = constraints;

    // Determine the movement pattern of the original exercise
    let originalPattern = 'general';
    for (const [pattern, ids] of Object.entries(MOVEMENT_PATTERNS)) {
      if (ids.includes(originalExercise.id)) {
        originalPattern = pattern;
        break;
      }
    }

    const substitutes: ExerciseSubstitution[] = [];

    for (const candidate of allExercises) {
      if (candidate.id === originalExercise.id) continue;

      // Check equipment constraints if provided
      if (availableEquipment && !availableEquipment.includes(candidate.equipment)) {
        continue;
      }

      // Check injured muscles exclusions
      if (
        excludeInjuredMuscles.includes(candidate.primaryMuscleGroup) ||
        candidate.secondaryMuscleGroups.some((m) => excludeInjuredMuscles.includes(m))
      ) {
        continue;
      }

      // Score calculation
      let score = 0;
      const sharedMuscles: string[] = [];

      // 1. Primary muscle match (+0.50)
      if (candidate.primaryMuscleGroup === originalExercise.primaryMuscleGroup) {
        score += 0.5;
        sharedMuscles.push(candidate.primaryMuscleGroup);
      } else if (originalExercise.secondaryMuscleGroups.includes(candidate.primaryMuscleGroup)) {
        score += 0.25;
        sharedMuscles.push(candidate.primaryMuscleGroup);
      }

      // 2. Secondary muscle overlap (+0.25)
      for (const sm of candidate.secondaryMuscleGroups) {
        if (
          sm === originalExercise.primaryMuscleGroup ||
          originalExercise.secondaryMuscleGroups.includes(sm)
        ) {
          score += 0.1;
          if (!sharedMuscles.includes(sm)) sharedMuscles.push(sm);
        }
      }

      // 3. Movement pattern synergy (+0.25)
      const candidatePatternIds = MOVEMENT_PATTERNS[originalPattern] || [];
      if (candidatePatternIds.includes(candidate.id)) {
        score += 0.25;
      }

      const finalScore = Math.min(1.0, Math.round(score * 100) / 100);

      // Only include viable substitutes with score >= 0.45
      if (finalScore >= 0.45) {
        let reason = `Direct replacement targeting ${candidate.primaryMuscleGroup} using ${candidate.equipment}.`;
        if (candidate.equipment === originalExercise.equipment) {
          reason = `Direct equipment-equivalent movement targeting ${candidate.primaryMuscleGroup}.`;
        } else if (candidate.equipment === 'Bodyweight') {
          reason = `Calisthenics alternative requiring no equipment while targeting ${candidate.primaryMuscleGroup}.`;
        } else if (candidate.equipment === 'Dumbbell') {
          reason = `Unilateral dumbbell alternative offering greater stabilizer activation for ${candidate.primaryMuscleGroup}.`;
        }

        substitutes.push({
          originalExerciseId: originalExercise.id,
          originalExerciseName: originalExercise.name,
          substituteExercise: candidate,
          matchScore: finalScore,
          sharedMuscles,
          reason,
        });
      }
    }

    // Sort descending by match score
    return substitutes.sort((a, b) => b.matchScore - a.matchScore);
  }
}
