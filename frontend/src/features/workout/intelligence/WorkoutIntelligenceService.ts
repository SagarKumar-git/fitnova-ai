/**
 * FitNova AI — Workout Intelligence Service
 * Unified domain coordinator for overload calculation, recovery readiness,
 * exercise substitution, routine recommendations, and adaptive training.
 * Pure TypeScript. Zero UI/React code.
 */

import { ProgressionEngine } from './ProgressionEngine.ts';
import { RecoveryDecisionEngine } from './RecoveryDecisionEngine.ts';
import { ExerciseSubstitutionEngine } from './ExerciseSubstitutionEngine.ts';
import { WorkoutRecommendationEngine } from './WorkoutRecommendationEngine.ts';
import { AdaptiveTrainingEngine } from './AdaptiveTrainingEngine.ts';
import { AdaptiveWorkoutModifier } from './AdaptiveWorkoutModifier.ts';
import { RealtimeSafetyEngine } from './RealtimeSafetyEngine.ts';
import type { HeartRateSafetyEvaluation, RealtimeSafetySnapshot } from './RealtimeSafetyEngine.ts';
import type { EventBus } from '../../../platform/events/EventBus.ts';
import type { NormalizedHealthSignal } from '../health/healthTypes.ts';
import type {
  ProgressionParams,
  ProgressionRecommendation,
  WorkoutReadiness,
  RecoveryDecision,
  SubstitutionConstraints,
  ExerciseSubstitution,
  WorkoutRecommendationParams,
} from './types.ts';
import type {
  AdaptiveTrainingInput,
  AdaptiveTrainingDecision,
  AdaptiveWorkoutPlan,
} from './types/adaptiveTraining.ts';
import type { Exercise } from '../models/Exercise.ts';
import type { WorkoutExercise } from '../models/WorkoutExercise.ts';
import type { WorkoutRecommendation } from '../models/Recommendation.ts';

export class WorkoutIntelligenceService {
  private readonly progressionEngine: ProgressionEngine;
  private readonly recoveryEngine: RecoveryDecisionEngine;
  private readonly substitutionEngine: ExerciseSubstitutionEngine;
  private readonly recommendationEngine: WorkoutRecommendationEngine;
  private readonly adaptiveEngine: AdaptiveTrainingEngine;
  private readonly adaptiveModifier: AdaptiveWorkoutModifier;
  private readonly realtimeSafetyEngine: RealtimeSafetyEngine;
  private readonly eventBus?: EventBus;

  constructor(engines?: {
    progressionEngine?: ProgressionEngine;
    recoveryEngine?: RecoveryDecisionEngine;
    substitutionEngine?: ExerciseSubstitutionEngine;
    recommendationEngine?: WorkoutRecommendationEngine;
    adaptiveEngine?: AdaptiveTrainingEngine;
    adaptiveModifier?: AdaptiveWorkoutModifier;
    realtimeSafetyEngine?: RealtimeSafetyEngine;
  }, eventBus?: EventBus, sessionId?: string) {
    this.eventBus = eventBus;
    this.progressionEngine = engines?.progressionEngine ?? new ProgressionEngine();
    this.recoveryEngine = engines?.recoveryEngine ?? new RecoveryDecisionEngine();
    this.substitutionEngine = engines?.substitutionEngine ?? new ExerciseSubstitutionEngine();
    this.recommendationEngine =
      engines?.recommendationEngine ?? new WorkoutRecommendationEngine(this.recoveryEngine);
    this.adaptiveEngine = engines?.adaptiveEngine ?? new AdaptiveTrainingEngine();
    this.adaptiveModifier = engines?.adaptiveModifier ?? new AdaptiveWorkoutModifier();
    this.realtimeSafetyEngine = engines?.realtimeSafetyEngine ?? new RealtimeSafetyEngine(eventBus, sessionId);
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

  // Sprint 3.8 — Adaptive Training Integration

  evaluateAdaptiveDecision(input: AdaptiveTrainingInput): AdaptiveTrainingDecision {
    try {
      return this.adaptiveEngine.evaluateTrainingDecision(input);
    } catch (err) {
      this.eventBus?.emit('ADAPTIVE_DECISION_FAILURE', {
        engine: 'AdaptiveTrainingEngine',
        action: 'evaluateTrainingDecision',
        error: err instanceof Error ? err.message : String(err),
        timestamp: Date.now(),
      });
      throw err;
    }
  }

  generateAdaptiveWorkout(
    exercises: ReadonlyArray<WorkoutExercise>,
    decision: AdaptiveTrainingDecision,
    workoutName?: string
  ): AdaptiveWorkoutPlan {
    return this.adaptiveModifier.generateModifiedPlan(exercises, decision, workoutName);
  }

  evaluateRealtimeSafety(hrSignal: NormalizedHealthSignal<number>): HeartRateSafetyEvaluation {
    return this.realtimeSafetyEngine.evaluateRealtimeHeartRate(hrSignal);
  }

  getRealtimeSafetySnapshot() {
    return this.realtimeSafetyEngine.getStateSnapshot();
  }

  restoreRealtimeSafetySnapshot(snapshot: RealtimeSafetySnapshot | null | undefined): void {
    this.realtimeSafetyEngine.restoreState(snapshot);
  }

  overrideSafetyIntervention() {
    this.realtimeSafetyEngine.overrideSafetyIntervention();
  }
}

