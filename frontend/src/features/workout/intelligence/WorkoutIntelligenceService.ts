/**
 * FitNova AI — Workout Intelligence Service
 * Unified domain coordinator for overload calculation, recovery readiness,
 * exercise substitution, and routine recommendations.
 * Pure TypeScript. Zero UI/React code.
 */

import { ProgressionEngine } from './ProgressionEngine.ts';
import { RecoveryDecisionEngine } from './RecoveryDecisionEngine.ts';
import { ExerciseSubstitutionEngine } from './ExerciseSubstitutionEngine.ts';
import { WorkoutRecommendationEngine } from './WorkoutRecommendationEngine.ts';
import type {
  ProgressionParams,
  ProgressionRecommendation,
  WorkoutReadiness,
  RecoveryDecision,
  SubstitutionConstraints,
  ExerciseSubstitution,
  WorkoutRecommendationParams,
} from './types.ts';
import type { Exercise } from '../models/Exercise.ts';
import type { WorkoutRecommendation } from '../models/Recommendation.ts';

export class WorkoutIntelligenceService {
  private readonly progressionEngine: ProgressionEngine;
  private readonly recoveryEngine: RecoveryDecisionEngine;
  private readonly substitutionEngine: ExerciseSubstitutionEngine;
  private readonly recommendationEngine: WorkoutRecommendationEngine;

  constructor(engines?: {
    progressionEngine?: ProgressionEngine;
    recoveryEngine?: RecoveryDecisionEngine;
    substitutionEngine?: ExerciseSubstitutionEngine;
    recommendationEngine?: WorkoutRecommendationEngine;
  }) {
    this.progressionEngine = engines?.progressionEngine ?? new ProgressionEngine();
    this.recoveryEngine = engines?.recoveryEngine ?? new RecoveryDecisionEngine();
    this.substitutionEngine = engines?.substitutionEngine ?? new ExerciseSubstitutionEngine();
    this.recommendationEngine =
      engines?.recommendationEngine ?? new WorkoutRecommendationEngine(this.recoveryEngine);
  }

  calculateProgression(params: ProgressionParams): ProgressionRecommendation {
    return this.progressionEngine.calculateProgression(params);
  }

  evaluateRecovery(readiness: WorkoutReadiness): RecoveryDecision {
    return this.recoveryEngine.evaluateRecovery(readiness);
  }

  findSubstitutes(
    exercise: Exercise,
    allExercises: Exercise[],
    constraints?: SubstitutionConstraints
  ): ExerciseSubstitution[] {
    return this.substitutionEngine.findSubstitutes(exercise, allExercises, constraints);
  }

  recommendWorkouts(params: WorkoutRecommendationParams): WorkoutRecommendation[] {
    return this.recommendationEngine.recommendWorkouts(params);
  }
}
