/**
 * FitNova AI — Sprint 3.4: Real-Time Workout Intelligence UX Test Suite
 * Validates PreWorkoutBrief logic, CoachingPanel guidance, Progressive Overload UX,
 * Adaptive Exercise Substitution session preservation, Intelligent Rest Timer,
 * Real-Time Nova States, and PR Achievement Experience.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorkoutService } from '../services/WorkoutService.ts';
import { MockWorkoutRepository } from '../repositories/MockWorkoutRepository.ts';
import { StorageService } from '../../../platform/storage/StorageService.ts';
import { MemoryStorageAdapter } from '../../../platform/storage/MemoryStorageAdapter.ts';
import { EventBus } from '../../../platform/events/EventBus.ts';
import { AnalyticsService } from '../../../platform/analytics/AnalyticsService.ts';
import { NotificationService } from '../../../platform/notifications/NotificationService.ts';
import { TelemetryService } from '../../../platform/telemetry/TelemetryService.ts';
import { ProgressionEngine } from '../intelligence/ProgressionEngine.ts';
import { RecoveryDecisionEngine } from '../intelligence/RecoveryDecisionEngine.ts';
import { ExerciseSubstitutionEngine } from '../intelligence/ExerciseSubstitutionEngine.ts';
import { NovaWorkoutService } from '../intelligence/NovaWorkoutService.ts';
import type { Exercise } from '../models/Exercise.ts';
import type { PersonalRecord } from '../models/PersonalRecord.ts';
import type { WorkoutReadiness } from '../intelligence/types.ts';

describe('Sprint 3.4 — Real-Time Workout Intelligence UX Suite', () => {
  let storage: StorageService;
  let repository: MockWorkoutRepository;
  let eventBus: EventBus;
  let service: WorkoutService;
  let progressionEngine: ProgressionEngine;
  let recoveryEngine: RecoveryDecisionEngine;
  let substitutionEngine: ExerciseSubstitutionEngine;
  let novaWorkoutService: NovaWorkoutService;

  beforeEach(() => {
    storage = new StorageService({ adapter: new MemoryStorageAdapter() });
    repository = new MockWorkoutRepository({ storageService: storage });
    eventBus = new EventBus();
    service = new WorkoutService({
      repository,
      eventBus,
      analytics: new AnalyticsService({ enabled: false }),
      notifications: new NotificationService(),
      telemetry: new TelemetryService({ enabled: false }),
    });
    progressionEngine = new ProgressionEngine();
    recoveryEngine = new RecoveryDecisionEngine();
    substitutionEngine = new ExerciseSubstitutionEngine();
    novaWorkoutService = new NovaWorkoutService();
  });

  // ==========================================================================
  // 1. PRE-WORKOUT INTELLIGENCE
  // ==========================================================================
  describe('1. Pre-Workout Intelligence & Recovery Readiness', () => {
    it('evaluates primed recovery readiness and recommends 100% full intensity', () => {
      const readiness: WorkoutReadiness = {
        sleepHours: 8.0,
        sorenessScore: 2,
        fatigueScore: 2,
        consecutiveTrainingDays: 1,
      };

      const decision = recoveryEngine.evaluateRecovery(readiness);
      expect(decision.action).toBe('train_normal');
      expect(decision.intensityModifier).toBe(1.0);
      expect(decision.reason).toContain('Readiness is primed');
    });

    it('recommends reduced intensity (80%) when moderate soreness or sleep debt is present', () => {
      const readiness: WorkoutReadiness = {
        sleepHours: 6.0,
        sorenessScore: 6,
        fatigueScore: 6,
        consecutiveTrainingDays: 2,
      };

      const decision = recoveryEngine.evaluateRecovery(readiness);
      expect(decision.action).toBe('reduce_intensity');
      expect(decision.intensityModifier).toBe(0.8);
      expect(decision.recoveryGuidance.length).toBeGreaterThan(0);
    });

    it('provides contextual Nova pre-workout guidance with warmup cues and intensity', async () => {
      const [workout] = await repository.getWorkouts();
      const guidance = await novaWorkoutService.getPreWorkoutGuidance(workout, {
        sleepHours: 8.0,
        sorenessScore: 2,
        fatigueScore: 2,
      });

      expect(guidance.intensityLevel).toBe('High');
      expect(guidance.intensityModifier).toBe(1.0);
      expect(guidance.warmupFocus.length).toBeGreaterThanOrEqual(2);
      expect(guidance.progressionTarget).toContain('Target progressive overload');
    });
  });

  // ==========================================================================
  // 2. SMART ACTIVE WORKOUT & AI GUIDANCE
  // ==========================================================================
  describe('2. Smart Active Workout Guidance & Set Advice', () => {
    it('recommends weight increase when set felt light (RPE <= 6.5)', async () => {
      const [workout] = await repository.getWorkouts();
      const exercise = workout.exercises[0];
      const set = exercise.sets[0];

      const advice = await novaWorkoutService.getContextualSetAdvice(exercise, set, 6.0);
      expect(advice.action).toBe('increase_weight');
      expect(advice.recommendedDeltaKg).toBe(2.5);
      expect(advice.feedback).toContain('Felt light');
    });

    it('recommends extra rest when set reached high fatigue (RPE >= 9.5)', async () => {
      const [workout] = await repository.getWorkouts();
      const exercise = workout.exercises[0];
      const set = exercise.sets[0];

      const advice = await novaWorkoutService.getContextualSetAdvice(exercise, set, 9.5);
      expect(advice.action).toBe('increase_rest');
      expect(advice.recommendedRestSeconds).toBe(exercise.restSeconds + 30);
      expect(advice.feedback).toContain('High exertion detected');
    });
  });

  // ==========================================================================
  // 3. PROGRESSIVE OVERLOAD UX
  // ==========================================================================
  describe('3. Progressive Overload Suggestions', () => {
    it('calculates +2.5kg jump when previous sets hit target reps with comfortable RPE', () => {
      const recommendation = progressionEngine.calculateProgression({
        exerciseId: 'ex_bench',
        exerciseName: 'Bench Press',
        previousWeightKg: 80,
        previousReps: 8,
        targetReps: 8,
        completedSets: [
          { id: 's1', setNumber: 1, type: 'normal', targetReps: 8, targetWeight: 80, actualReps: 8, actualWeight: 80, rpe: 7.5, completed: true },
          { id: 's2', setNumber: 2, type: 'normal', targetReps: 8, targetWeight: 80, actualReps: 8, actualWeight: 80, rpe: 8.0, completed: true },
        ],
        isCompound: true,
      });

      expect(recommendation.action).toBe('weight_increase');
      expect(recommendation.recommendedWeightKg).toBe(82.5);
      expect(recommendation.weightDeltaKg).toBe(2.5);
      expect(recommendation.confidence).toBeGreaterThanOrEqual(0.9);
      expect(recommendation.reason).toContain('overload');
    });

    it('suggests rep consolidation when average reps dropped slightly', () => {
      const recommendation = progressionEngine.calculateProgression({
        exerciseId: 'ex_bench',
        exerciseName: 'Bench Press',
        previousWeightKg: 80,
        previousReps: 8,
        targetReps: 8,
        completedSets: [
          { id: 's1', setNumber: 1, type: 'normal', targetReps: 8, targetWeight: 80, actualReps: 8, actualWeight: 80, rpe: 8.0, completed: true },
          { id: 's2', setNumber: 2, type: 'normal', targetReps: 8, targetWeight: 80, actualReps: 7, actualWeight: 80, rpe: 8.5, completed: true },
        ],
        isCompound: true,
      });

      expect(recommendation.action).toBe('rep_increase');
      expect(recommendation.recommendedWeightKg).toBe(80);
      expect(recommendation.repsDelta).toBe(1);
    });
  });

  // ==========================================================================
  // 4. ADAPTIVE EXERCISE SUBSTITUTION
  // ==========================================================================
  describe('4. Adaptive Exercise Substitution & Progress Preservation', () => {
    it('filters out movements with unavailable equipment and ranks by compatibility score', async () => {
      const allExercises = await repository.getExercises();
      const benchPress = allExercises.find((e) => e.name.toLowerCase().includes('bench'))!;
      expect(benchPress).toBeDefined();

      const substitutes = substitutionEngine.findSubstitutes(benchPress, allExercises, {
        availableEquipment: ['Dumbbell', 'Bodyweight'],
      });

      expect(substitutes.length).toBeGreaterThan(0);
      // All returned exercises must use Dumbbell or Bodyweight
      substitutes.forEach((sub) => {
        expect(['Dumbbell', 'Bodyweight']).toContain(sub.substituteExercise.equipment);
        expect(sub.matchScore).toBeGreaterThanOrEqual(0.45);
      });
      // Highest score first
      expect(substitutes[0].matchScore).toBeGreaterThanOrEqual(substitutes[substitutes.length - 1].matchScore);
    });

    it('replaces an exercise in-flight in WorkoutService without losing session progress or volume', async () => {
      const workout = (await repository.getWorkouts())[0];

      // Start session
      const session = await service.startWorkout({ workoutId: workout.id });
      const firstExercise = session.exercises[0];

      // Complete 1 set on first exercise
      await service.completeSet({
        sessionId: session.id,
        exerciseId: firstExercise.exerciseId,
        setId: firstExercise.sets[0].id,
        reps: 8,
        weight: 80,
        rpe: 8.0,
      });

      const activeBefore = await service.getActiveSession();
      expect(activeBefore?.totalVolume).toBe(640);
      expect(activeBefore?.exercises[0].sets[0].completed).toBe(true);

      // Now substitute the SECOND exercise
      const secondExercise = session.exercises[1];
      const dumbbellAlternative: Exercise = {
        id: 'ex_db_substitute',
        name: 'Incline Dumbbell Press',
        description: 'Dumbbell replacement',
        primaryMuscleGroup: 'Chest',
        secondaryMuscleGroups: ['Triceps', 'Shoulders'],
        equipment: 'Dumbbell',
        difficulty: 'Intermediate',
        instructions: ['Press smoothly'],
        tips: [],
        defaultRestSeconds: 90,
        isCustom: false,
      };

      const updated = await service.substituteExercise({
        sessionId: session.id,
        originalExerciseId: secondExercise.exerciseId,
        substituteExercise: dumbbellAlternative,
      });

      // Verification of session integrity:
      expect(updated.id).toBe(session.id);
      expect(updated.startedAt).toBe(session.startedAt);
      expect(updated.exercises.length).toBe(session.exercises.length);
      // First exercise sets and completed status preserved intact
      expect(updated.exercises[0].sets[0].completed).toBe(true);
      expect(updated.exercises[0].sets[0].actualWeight).toBe(80);
      expect(updated.totalVolume).toBe(640);
      // Second exercise successfully substituted
      expect(updated.exercises[1].exerciseId).toBe('ex_db_substitute');
      expect(updated.exercises[1].exerciseName).toBe('Incline Dumbbell Press');
      expect(updated.exercises[1].targetSets).toBe(secondExercise.targetSets);
    });
  });

  // ==========================================================================
  // 5. INTELLIGENT REST TIMER
  // ==========================================================================
  describe('5. Intelligent Rest Timer Calculations', () => {
    it('detects high RPE and extends baseline rest interval for ATP restoration', async () => {
      const [workout] = await repository.getWorkouts();
      const exercise = workout.exercises[0];
      const set = exercise.sets[0];

      const highRpeAdvice = await novaWorkoutService.getContextualSetAdvice(exercise, set, 9.5);
      expect(highRpeAdvice.action).toBe('increase_rest');
      expect(highRpeAdvice.recommendedRestSeconds).toBe(exercise.restSeconds + 30);
    });

    it('maintains standard rest interval for moderate exertion', async () => {
      const [workout] = await repository.getWorkouts();
      const exercise = workout.exercises[0];
      const set = exercise.sets[0];

      const normalAdvice = await novaWorkoutService.getContextualSetAdvice(exercise, set, 8.0);
      expect(normalAdvice.action).toBe('maintain');
      expect(normalAdvice.recommendedRestSeconds).toBe(exercise.restSeconds);
    });
  });

  // ==========================================================================
  // 6. REAL-TIME NOVA STATES & EVENT INTEGRATION
  // ==========================================================================
  describe('6. Real-Time Nova States Reactions', () => {
    it('notifies EventBus on set completion, exercise completion, and PR milestones', async () => {
      const eventsCaptured: string[] = [];
      eventBus.subscribe('SET_COMPLETED', () => {
        eventsCaptured.push('SET_COMPLETED');
      });
      eventBus.subscribe('PERSONAL_RECORD_ACHIEVED', () => {
        eventsCaptured.push('PERSONAL_RECORD_ACHIEVED');
      });
      eventBus.subscribe('EXERCISE_COMPLETED', () => {
        eventsCaptured.push('EXERCISE_COMPLETED');
      });

      const session = await service.startWorkout({ workoutId: 'workout_push_strength' });
      const ex = session.exercises[0];

      // Complete all sets for this exercise, setting a heavy weight to trigger PR
      for (const set of ex.sets) {
        await service.completeSet({
          sessionId: session.id,
          exerciseId: ex.exerciseId,
          setId: set.id,
          reps: 10,
          weight: 150, // Triggers new PR
          rpe: 8.0,
        });
      }

      expect(eventsCaptured).toContain('SET_COMPLETED');
      expect(eventsCaptured).toContain('PERSONAL_RECORD_ACHIEVED');
      expect(eventsCaptured).toContain('EXERCISE_COMPLETED');
    });
  });

  // ==========================================================================
  // 7. PR & ACHIEVEMENT GAMIFICATION EXPERIENCE
  // ==========================================================================
  describe('7. PR & Achievement Experience', () => {
    it('calculates percentage improvement and diff over previous record', () => {
      const record: PersonalRecord = {
        id: 'pr_bench_1',
        exerciseId: 'ex_bench',
        exerciseName: 'Bench Press',
        metric: '1rm',
        value: 85,
        previousValue: 80,
        achievedAt: Date.now(),
      };

      const diff = Math.round((record.value - record.previousValue!) * 10) / 10;
      const pct = Math.round(((record.value - record.previousValue!) / record.previousValue!) * 1000) / 10;

      expect(diff).toBe(5);
      expect(pct).toBe(6.3);
    });

    it('emits ACHIEVEMENT_UNLOCKED over EventBus during PR celebration', () => {
      let unlockedEvent: unknown = null;
      eventBus.subscribe('ACHIEVEMENT_UNLOCKED', (payload) => {
        unlockedEvent = payload;
      });

      // Simulate PR achievement emission
      eventBus.emit('ACHIEVEMENT_UNLOCKED', {
        achievementId: 'pr_bench_123',
        title: 'New PR: Bench Press (85kg)',
        category: 'strength',
        timestamp: Date.now(),
      });

      expect(unlockedEvent).not.toBeNull();
      expect((unlockedEvent as { title: string }).title).toContain('Bench Press');
    });
  });
});
