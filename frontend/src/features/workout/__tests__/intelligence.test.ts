/**
 * FitNova AI — Workout Intelligence Layer Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { RecoveryDecisionEngine } from '../intelligence/RecoveryDecisionEngine.ts';
import { ExerciseSubstitutionEngine } from '../intelligence/ExerciseSubstitutionEngine.ts';
import { WorkoutRecommendationEngine } from '../intelligence/WorkoutRecommendationEngine.ts';
import { WorkoutIntelligenceService } from '../intelligence/WorkoutIntelligenceService.ts';
import { NovaWorkoutService } from '../intelligence/NovaWorkoutService.ts';
import type { Exercise, Workout, WorkoutSession, WorkoutExercise, WorkoutSet } from '../models/index.ts';

describe('Workout OS — Intelligence Engines', () => {
  describe('RecoveryDecisionEngine', () => {
    const recoveryEngine = new RecoveryDecisionEngine();

    it('prescribes complete rest when fatigue and soreness are severe', () => {
      const decision = recoveryEngine.evaluateRecovery({
        sleepHours: 4.0,
        sorenessScore: 9,
        fatigueScore: 9,
        consecutiveTrainingDays: 3,
      });

      expect(decision.action).toBe('rest');
      expect(decision.intensityModifier).toBe(0.0);
      expect(decision.recommendedDurationMinutes).toBe(0);
      expect(decision.recoveryGuidance.length).toBeGreaterThan(0);
    });

    it('prescribes active recovery workout when consecutive training days hit limit', () => {
      const decision = recoveryEngine.evaluateRecovery({
        sleepHours: 7.5,
        sorenessScore: 5,
        fatigueScore: 5,
        consecutiveTrainingDays: 4,
      });

      expect(decision.action).toBe('recovery_workout');
      expect(decision.intensityModifier).toBe(0.55);
      expect(decision.recommendedDurationMinutes).toBe(30);
    });

    it('prescribes reduced intensity for mild fatigue or sub-optimal sleep', () => {
      const decision = recoveryEngine.evaluateRecovery({
        sleepHours: 6.5,
        sorenessScore: 6,
        fatigueScore: 6,
        consecutiveTrainingDays: 2,
      });

      expect(decision.action).toBe('reduce_intensity');
      expect(decision.intensityModifier).toBe(0.8);
      expect(decision.recommendedDurationMinutes).toBe(45);
    });

    it('prescribes normal training when readiness is primed', () => {
      const decision = recoveryEngine.evaluateRecovery({
        sleepHours: 8.0,
        sorenessScore: 2,
        fatigueScore: 2,
        consecutiveTrainingDays: 1,
      });

      expect(decision.action).toBe('train_normal');
      expect(decision.intensityModifier).toBe(1.0);
      expect(decision.recommendedDurationMinutes).toBe(60);
    });
  });

  describe('ExerciseSubstitutionEngine', () => {
    const substitutionEngine = new ExerciseSubstitutionEngine();

    const benchPress: Exercise = {
      id: 'ex_bench_press',
      name: 'Barbell Bench Press',
      description: 'Flat barbell bench press',
      primaryMuscleGroup: 'Chest',
      secondaryMuscleGroups: ['Triceps', 'Shoulders'],
      equipment: 'Barbell',
      difficulty: 'Intermediate',
      instructions: [],
      tips: [],
      defaultRestSeconds: 90,
      isCustom: false,
    };

    const dumbbellBench: Exercise = {
      id: 'ex_db_bench',
      name: 'Dumbbell Bench Press',
      description: 'Flat dumbbell bench press',
      primaryMuscleGroup: 'Chest',
      secondaryMuscleGroups: ['Triceps', 'Shoulders'],
      equipment: 'Dumbbell',
      difficulty: 'Beginner',
      instructions: [],
      tips: [],
      defaultRestSeconds: 90,
      isCustom: false,
    };

    const pushups: Exercise = {
      id: 'ex_pushups',
      name: 'Push-ups',
      description: 'Standard floor pushups',
      primaryMuscleGroup: 'Chest',
      secondaryMuscleGroups: ['Triceps', 'Core'],
      equipment: 'Bodyweight',
      difficulty: 'Beginner',
      instructions: [],
      tips: [],
      defaultRestSeconds: 60,
      isCustom: false,
    };

    const barbellSquat: Exercise = {
      id: 'ex_squat',
      name: 'Barbell Squat',
      description: 'Back squat',
      primaryMuscleGroup: 'Quadriceps',
      secondaryMuscleGroups: ['Glutes', 'Hamstrings'],
      equipment: 'Barbell',
      difficulty: 'Advanced',
      instructions: [],
      tips: [],
      defaultRestSeconds: 180,
      isCustom: false,
    };

    const allExercises = [benchPress, dumbbellBench, pushups, barbellSquat];

    it('finds viable chest substitutes matching primary muscle', () => {
      const subs = substitutionEngine.findSubstitutes(benchPress, allExercises);
      expect(subs.length).toBeGreaterThanOrEqual(2);
      const subNames = subs.map((s) => s.substituteExercise.name);
      expect(subNames).toContain('Dumbbell Bench Press');
      expect(subNames).toContain('Push-ups');
      expect(subNames).not.toContain('Barbell Squat');
    });

    it('filters out substitutes requiring unavailable equipment', () => {
      const subs = substitutionEngine.findSubstitutes(benchPress, allExercises, {
        availableEquipment: ['Bodyweight'],
      });
      expect(subs.length).toBe(1);
      expect(subs[0].substituteExercise.name).toBe('Push-ups');
    });

    it('excludes exercises that recruit injured muscles', () => {
      const subs = substitutionEngine.findSubstitutes(benchPress, allExercises, {
        excludeInjuredMuscles: ['Chest'],
      });
      expect(subs.length).toBe(0);
    });
  });

  describe('WorkoutRecommendationEngine', () => {
    const recommendationEngine = new WorkoutRecommendationEngine();

    const pushWorkout: Workout = {
      id: 'w_push',
      name: 'Push Strength Routine',
      description: 'Chest, shoulders, triceps',
      goal: 'Strength',
      difficulty: 'Intermediate',
      estimatedDurationMinutes: 60,
      targetMuscleGroups: ['Chest', 'Shoulders', 'Triceps'],
      equipment: ['Barbell'],
      tags: ['Push'],
      exercises: [],
      isTemplate: true,
      createdAt: Date.now(),
    };

    const pullWorkout: Workout = {
      id: 'w_pull',
      name: 'Pull Hypertrophy Routine',
      description: 'Back and biceps',
      goal: 'Strength',
      difficulty: 'Intermediate',
      estimatedDurationMinutes: 60,
      targetMuscleGroups: ['Back', 'Biceps'],
      equipment: ['Barbell', 'Dumbbell'],
      tags: ['Pull'],
      exercises: [],
      isTemplate: true,
      createdAt: Date.now(),
    };

    const pastPushSession: WorkoutSession = {
      id: 'sess_push',
      workoutId: 'w_push',
      workoutName: 'Push Strength Routine',
      status: 'completed',
      startedAt: Date.now() - 86400000,
      endedAt: Date.now() - 82800000,
      durationSeconds: 3600,
      pausedDurationMs: 0,
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      exercises: [],
      totalVolume: 5000,
      personalRecords: [],
    };

    it('prioritizes antagonist Pull routine after a recent Push workout', () => {
      const recommendations = recommendationEngine.recommendWorkouts({
        userGoal: 'Strength',
        availableWorkouts: [pushWorkout, pullWorkout],
        pastSessions: [pastPushSession],
        preferredDurationMinutes: 60,
      });

      expect(recommendations.length).toBe(2);
      expect(recommendations[0].workoutId).toBe('w_pull');
      expect(recommendations[0].score).toBeGreaterThan(recommendations[1].score);
    });
  });

  describe('WorkoutIntelligenceService Facade', () => {
    it('coordinates overload, recovery, and substitution in a single service', () => {
      const service = new WorkoutIntelligenceService();

      const recovery = service.evaluateRecovery({
        sleepHours: 8.0,
        sorenessScore: 1,
        fatigueScore: 1,
      });
      expect(recovery.action).toBe('train_normal');

      const progression = service.calculateProgression({
        exerciseId: 'ex_1',
        exerciseName: 'Bench Press',
        previousWeightKg: 80,
        previousReps: 8,
        targetReps: 8,
        completedSets: [],
      });
      expect(progression.action).toBe('maintain');
    });
  });

  describe('NovaWorkoutService', () => {
    const novaService = new NovaWorkoutService();

    it('provides pre-workout guidance and adjusts intensity based on readiness', async () => {
      const dummyWorkout: Workout = {
        id: 'w_dummy',
        name: 'Upper Body Workout',
        description: 'Upper workout',
        goal: 'Hypertrophy',
        difficulty: 'Intermediate',
        estimatedDurationMinutes: 50,
        targetMuscleGroups: ['Chest', 'Back'],
        equipment: ['Barbell'],
        tags: ['Upper'],
        exercises: [
          {
            id: 'we_1',
            exerciseId: 'ex_1',
            exerciseName: 'Barbell Bench Press',
            order: 1,
            targetSets: 3,
            targetReps: 8,
            targetWeight: 80,
            restSeconds: 90,
            sets: [],
          },
        ],
        isTemplate: true,
        createdAt: Date.now(),
      };

      const highReadinessAdvice = await novaService.getPreWorkoutGuidance(dummyWorkout, {
        sleepHours: 8,
        sorenessScore: 2,
        fatigueScore: 2,
      });
      expect(highReadinessAdvice.intensityLevel).toBe('High');
      expect(highReadinessAdvice.intensityModifier).toBe(1.0);

      const tiredAdvice = await novaService.getPreWorkoutGuidance(dummyWorkout, {
        sleepHours: 4,
        sorenessScore: 9,
        fatigueScore: 9,
      });
      expect(tiredAdvice.intensityLevel).toBe('Light');
      expect(tiredAdvice.intensityModifier).toBe(0.0);
    });

    it('provides real-time during-set advice and evaluates fatigue', async () => {
      const currentExercise: WorkoutExercise = {
        id: 'we_1',
        exerciseId: 'ex_bench',
        exerciseName: 'Bench Press',
        order: 1,
        targetSets: 3,
        targetReps: 8,
        targetWeight: 80,
        restSeconds: 90,
        sets: [],
      };

      const completedSet: WorkoutSet = {
        id: 's_1',
        setNumber: 1,
        type: 'normal',
        targetReps: 8,
        actualReps: 8,
        targetWeight: 80,
        actualWeight: 80,
        rpe: 6.0,
        completed: true,
        skipped: false,
      };

      const advice = await novaService.getContextualSetAdvice(currentExercise, completedSet, 6.0);
      expect(advice.action).toBe('increase_weight');
      expect(advice.recommendedDeltaKg).toBeGreaterThan(0);
      expect(advice.feedback).toContain('Felt light');
    });

    it('generates post-workout debrief summary', async () => {
      const session: WorkoutSession = {
        id: 'sess_1',
        workoutId: 'w_1',
        workoutName: 'Push Routine',
        status: 'completed',
        startedAt: Date.now() - 3600000,
        endedAt: Date.now(),
        durationSeconds: 3600,
        pausedDurationMs: 0,
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        exercises: [
          {
            id: 'e1',
            exerciseId: 'ex_1',
            exerciseName: 'Bench Press',
            order: 1,
            targetSets: 3,
            targetReps: 8,
            targetWeight: 100,
            restSeconds: 90,
            sets: [],
          },
        ],
        totalVolume: 6500,
        personalRecords: [
          {
            id: 'pr_1',
            exerciseId: 'ex_1',
            exerciseName: 'Bench Press',
            metric: 'max_weight',
            value: 100,
            achievedAt: Date.now(),
          },
        ],
      };

      const summary = await novaService.getPostWorkoutDebrief(session);
      expect(summary.prsAchieved).toBe(1);
      expect(summary.volumeEvaluation).toContain('6,500 kg');
      expect(summary.recoveryTimelineHours).toBe(36);
    });
  });
});
