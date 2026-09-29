/**
 * FitNova AI — Sprint 3.6 Workout Analytics & Adaptive Personalization Test Suite
 * Comprehensive automated verification for:
 * - WorkoutAnalyticsService
 * - TrainingLoadEngine (ACWR, rolling loads, conservative guidance)
 * - MuscleRecoveryAnalytics (per-muscle recovery, time elapsed, readiness integration)
 * - TrainingConsistencyEngine (consistency score, adherence %, streaks)
 * - Adaptive Progression Engine (RPE learning, repeated performance, change_exercise)
 * - WorkoutRecommendationEngine (split rotation, recovery, volume balance)
 * - NovaWorkoutService (Before, During, and After structured phase contracts)
 * - Bounded TTL cache & EventBus invalidation
 * - Edge cases (zero sessions, 1 session, long gaps, very high volumes)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TrainingLoadEngine } from '../analytics/TrainingLoadEngine.ts';
import { MuscleRecoveryAnalytics } from '../analytics/MuscleRecoveryAnalytics.ts';
import { TrainingConsistencyEngine } from '../analytics/TrainingConsistencyEngine.ts';
import { WorkoutAnalyticsService } from '../analytics/WorkoutAnalyticsService.ts';
import { ProgressionEngine } from '../intelligence/ProgressionEngine.ts';
import { WorkoutRecommendationEngine } from '../intelligence/WorkoutRecommendationEngine.ts';
import { NovaWorkoutService } from '../intelligence/NovaWorkoutService.ts';
import { EventBus } from '../../../platform/events/EventBus.ts';
import { StorageService } from '../../../platform/storage/StorageService.ts';
import { MemoryStorageAdapter } from '../../../platform/storage/MemoryStorageAdapter.ts';
import type { WorkoutHistoryEntry } from '../models/WorkoutHistory.ts';
import type { PersonalRecord } from '../models/PersonalRecord.ts';
import type { Exercise } from '../models/Exercise.ts';
import type { Workout } from '../models/Workout.ts';
import type { WorkoutSession } from '../models/WorkoutSession.ts';

describe('Sprint 3.6 — Workout Analytics & Adaptive Personalization Suite', () => {
  const referenceTime = 1773489600000; // Fixed deterministic timestamp
  const DAY_MS = 86_400_000;

  // Mock sample exercises
  const mockExercises: Exercise[] = [
    {
      id: 'ex_bench',
      name: 'Barbell Bench Press',
      description: 'Horizontal barbell bench press',
      primaryMuscleGroup: 'Chest',
      secondaryMuscleGroups: ['Triceps', 'Shoulders'],
      equipment: 'Barbell',
      difficulty: 'Intermediate',
      instructions: ['Press'],
      tips: ['Scapula retracted'],
      defaultRestSeconds: 120,
    },
    {
      id: 'ex_squat',
      name: 'Barbell Back Squat',
      description: 'Barbell back squat',
      primaryMuscleGroup: 'Quadriceps',
      secondaryMuscleGroups: ['Glutes', 'Hamstrings'],
      equipment: 'Barbell',
      difficulty: 'Advanced',
      instructions: ['Squat'],
      tips: ['Brace core'],
      defaultRestSeconds: 180,
    },
    {
      id: 'ex_row',
      name: 'Barbell Bent Over Row',
      description: 'Barbell row',
      primaryMuscleGroup: 'Back',
      secondaryMuscleGroups: ['Biceps'],
      equipment: 'Barbell',
      difficulty: 'Intermediate',
      instructions: ['Row'],
      tips: ['Neutral spine'],
      defaultRestSeconds: 90,
    },
  ];

  // Helper to generate history entries
  function createSampleHistory(): WorkoutHistoryEntry[] {
    return [
      {
        id: 'h_1',
        sessionId: 'sess_1',
        workoutId: 'w_push',
        workoutName: 'Push Power Routine',
        date: new Date(referenceTime - 21 * DAY_MS).toISOString().split('T')[0],
        completedAt: referenceTime - 21 * DAY_MS,
        durationSeconds: 55 * 60,
        totalVolume: 4200,
        totalSets: 12,
        completedSets: 12,
        exercisesCount: 1,
        personalRecordsCount: 1,
        exercises: [
          {
            exerciseId: 'ex_bench',
            exerciseName: 'Barbell Bench Press',
            setsCount: 4,
            volume: 2400,
            bestSet: { reps: 8, weight: 80, rpe: 7.5 },
          },
        ],
      },
      {
        id: 'h_2',
        sessionId: 'sess_2',
        workoutId: 'w_pull',
        workoutName: 'Pull Strength Routine',
        date: new Date(referenceTime - 14 * DAY_MS).toISOString().split('T')[0],
        completedAt: referenceTime - 14 * DAY_MS,
        durationSeconds: 50 * 60,
        totalVolume: 4400,
        totalSets: 12,
        completedSets: 12,
        exercisesCount: 1,
        personalRecordsCount: 0,
        exercises: [
          {
            exerciseId: 'ex_row',
            exerciseName: 'Barbell Bent Over Row',
            setsCount: 4,
            volume: 2600,
            bestSet: { reps: 8, weight: 75, rpe: 8.0 },
          },
        ],
      },
      {
        id: 'h_3',
        sessionId: 'sess_3',
        workoutId: 'w_push',
        workoutName: 'Push Power Routine',
        date: new Date(referenceTime - 10 * DAY_MS).toISOString().split('T')[0],
        completedAt: referenceTime - 10 * DAY_MS,
        durationSeconds: 60 * 60,
        totalVolume: 4600,
        totalSets: 14,
        completedSets: 14,
        exercisesCount: 1,
        personalRecordsCount: 1,
        exercises: [
          {
            exerciseId: 'ex_bench',
            exerciseName: 'Barbell Bench Press',
            setsCount: 4,
            volume: 2550,
            bestSet: { reps: 8, weight: 82.5, rpe: 7.5 },
          },
        ],
      },
      {
        id: 'h_4',
        sessionId: 'sess_4',
        workoutId: 'w_push',
        workoutName: 'Push Power Routine',
        date: new Date(referenceTime - 1 * DAY_MS).toISOString().split('T')[0],
        completedAt: referenceTime - 1 * DAY_MS,
        durationSeconds: 58 * 60,
        totalVolume: 4800,
        totalSets: 14,
        completedSets: 14,
        exercisesCount: 1,
        personalRecordsCount: 1,
        exercises: [
          {
            exerciseId: 'ex_bench',
            exerciseName: 'Barbell Bench Press',
            setsCount: 4,
            volume: 2700,
            bestSet: { reps: 8, weight: 85, rpe: 7.0 },
          },
        ],
      },
    ];
  }

  // ==========================================
  // 1. TRAINING LOAD ENGINE (ACWR)
  // ==========================================
  describe('TrainingLoadEngine', () => {
    let engine: TrainingLoadEngine;

    beforeEach(() => {
      engine = new TrainingLoadEngine();
    });

    it('handles zero workouts edge case gracefully', () => {
      const result = engine.calculateTrainingLoad([], referenceTime);
      expect(result.status).toBe('under_training');
      expect(result.score).toBe(50);
      expect(result.acuteLoad).toBe(0);
      expect(result.chronicLoad).toBe(0);
      expect(result.loadRatio).toBe(0);
      expect(result.isUnderTraining).toBe(true);
      expect(result.recommendation).toContain('foundation workouts');
    });

    it('calculates 1 workout calibration without crashing', () => {
      const singleSession: WorkoutHistoryEntry[] = [
        {
          id: 'h_solo',
          sessionId: 's_solo',
          workoutId: 'w_push',
          workoutName: 'Push',
          date: '2026-09-10',
          completedAt: referenceTime - 2 * DAY_MS,
          durationSeconds: 45 * 60,
          totalVolume: 3500,
          totalSets: 10,
          completedSets: 10,
          exercisesCount: 0,
          personalRecordsCount: 0,
          exercises: [],
        },
      ];
      const result = engine.calculateTrainingLoad(singleSession, referenceTime);
      expect(result.acuteLoad).toBe(3500);
      expect(result.chronicLoad).toBe(3500);
      expect(result.loadRatio).toBeGreaterThan(0);
    });

    it('calculates optimal Acute:Chronic Workload Ratio for regular training', () => {
      const history = createSampleHistory();
      const result = engine.calculateTrainingLoad(history, referenceTime);
      expect(result.acuteLoad).toBeGreaterThan(0);
      expect(result.chronicLoad).toBeGreaterThan(0);
      expect(result.loadRatio).toBeGreaterThanOrEqual(0.8);
      expect(result.status).toBeDefined();
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('detects excessive volume spike (ACWR > 1.5)', () => {
      const spikeHistory: WorkoutHistoryEntry[] = [
        {
          id: 'h_old',
          sessionId: 's_old',
          workoutId: 'w_leg',
          workoutName: 'Legs',
          date: '2026-08-20',
          completedAt: referenceTime - 25 * DAY_MS,
          durationSeconds: 3600,
          totalVolume: 2000,
          totalSets: 8,
          completedSets: 8,
          exercisesCount: 0,
          personalRecordsCount: 0,
          exercises: [],
        },
        // Massive sudden spike in acute 7-day window
        {
          id: 'h_spike',
          sessionId: 's_spike',
          workoutId: 'w_push',
          workoutName: 'Push Mega',
          date: '2026-09-12',
          completedAt: referenceTime - 1 * DAY_MS,
          durationSeconds: 5400,
          totalVolume: 12000,
          totalSets: 30,
          completedSets: 30,
          exercisesCount: 0,
          personalRecordsCount: 0,
          exercises: [],
        },
      ];

      const result = engine.calculateTrainingLoad(spikeHistory, referenceTime);
      expect(result.isSuddenSpike).toBe(true);
      expect(result.status).toBe('excessive_spike');
      expect(result.loadRatio).toBeGreaterThan(1.5);
      expect(result.recommendation).toContain('increased too abruptly');
    });
  });

  // ==========================================
  // 2. MUSCLE RECOVERY ANALYTICS
  // ==========================================
  describe('MuscleRecoveryAnalytics', () => {
    let recoveryAnalytics: MuscleRecoveryAnalytics;

    beforeEach(() => {
      recoveryAnalytics = new MuscleRecoveryAnalytics();
    });

    it('computes fresh status when no history exists', () => {
      const report = recoveryAnalytics.calculateMuscleRecovery([], mockExercises, undefined, referenceTime);
      expect(report.overallRecoveryStatus).toBe('fresh');
      expect(report.muscles['Chest'].estimatedRecoveryStatus).toBe('fresh');
      expect(report.muscles['Chest'].recoveryPercentage).toBe(100);
      expect(report.muscles['Chest'].isReadyToTrain).toBe(true);
    });

    it('calculates accurate hours since last trained and per-muscle recovery', () => {
      const history = createSampleHistory(); // Last Chest session was 24 hours ago
      const report = recoveryAnalytics.calculateMuscleRecovery(history, mockExercises, undefined, referenceTime);

      const chest = report.muscles['Chest'];
      expect(chest).toBeDefined();
      expect(chest.hoursSinceLastTrained).toBe(24);
      expect(chest.recentVolumeKg).toBeGreaterThan(0);
      expect(['moderate', 'recovered']).toContain(chest.estimatedRecoveryStatus);

      // Back was trained 14 days ago (>96 hours) -> Fresh
      const back = report.muscles['Back'];
      expect(back.hoursSinceLastTrained).toBeGreaterThan(96);
      expect(back.estimatedRecoveryStatus).toBe('fresh');
      expect(back.isReadyToTrain).toBe(true);
    });

    it('factors systemic low readiness score to adjust recovery status', () => {
      const history = createSampleHistory();
      const lowReadiness = {
        sleepHours: 4.0,
        sorenessScore: 9,
        fatigueScore: 9,
      };

      const report = recoveryAnalytics.calculateMuscleRecovery(history, mockExercises, lowReadiness, referenceTime);
      expect(report.overallRecoveryScore).toBeLessThan(85);
    });
  });

  // ==========================================
  // 3. TRAINING CONSISTENCY ENGINE
  // ==========================================
  describe('TrainingConsistencyEngine', () => {
    let consistencyEngine: TrainingConsistencyEngine;

    beforeEach(() => {
      consistencyEngine = new TrainingConsistencyEngine();
    });

    it('returns zero baseline for user with zero workouts', () => {
      const result = consistencyEngine.evaluateConsistency([], 4, referenceTime);
      expect(result.consistencyScore).toBe(0);
      expect(result.weeklyWorkoutFrequency).toBe(0);
      expect(result.adherencePercentage).toBe(0);
      expect(result.ratingLabel).toBe('Inconsistent');
    });

    it('calculates adherence, weekly average, and 0-100 consistency score', () => {
      const history = createSampleHistory();
      const result = consistencyEngine.evaluateConsistency(history, 4, referenceTime);
      expect(result.consistencyScore).toBeGreaterThan(0);
      expect(result.consistencyScore).toBeLessThanOrEqual(100);
      expect(result.summary).toContain('Consistency Score');
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.actionableTip).toBeDefined();
    });
  });

  // ==========================================
  // 4. WORKOUT ANALYTICS SERVICE & CACHING
  // ==========================================
  describe('WorkoutAnalyticsService', () => {
    let storage: StorageService;
    let eventBus: EventBus;
    let analyticsService: WorkoutAnalyticsService;

    beforeEach(() => {
      storage = new StorageService({ adapter: new MemoryStorageAdapter() });
      eventBus = new EventBus();
      analyticsService = new WorkoutAnalyticsService({
        storage,
        eventBus,
        cacheTtlMs: 60000,
      });
    });

    it('computes all unified KPI metrics deterministically', async () => {
      const history = createSampleHistory();
      const prs: PersonalRecord[] = [
        {
          id: 'pr_1',
          exerciseId: 'ex_bench',
          exerciseName: 'Barbell Bench Press',
          metric: '1rm',
          value: 105,
          achievedAt: 1726200000000,
        },
      ];

      const analytics = await analyticsService.getUnifiedAnalytics({
        historyOverride: history,
        prsOverride: prs,
        exercisesOverride: mockExercises,
        referenceTimestamp: referenceTime,
      });

      // Section 1 verification
      expect(analytics.totalWorkouts).toBe(4);
      expect(analytics.workoutsThisWeek).toBeGreaterThanOrEqual(1);
      expect(analytics.workoutsThisMonth).toBe(4);
      expect(analytics.totalTrainingVolume).toBe(18000);
      expect(analytics.weeklyVolume).toBeGreaterThan(0);
      expect(analytics.averageWorkoutDurationMinutes).toBeGreaterThan(0);
      expect(analytics.currentWorkoutStreak).toBeGreaterThan(0);
      expect(analytics.prCount).toBe(1);
      expect(analytics.workoutCompletionRate).toBe(96);

      // Progression & charts
      expect(analytics.estimated1RMProgression.length).toBeGreaterThan(0);
      const benchProg = analytics.estimated1RMProgression.find((e) => e.exerciseId === 'ex_bench');
      expect(benchProg).toBeDefined();
      expect(benchProg?.current1RM).toBeGreaterThan(benchProg?.previous1RM || 0);
      expect(benchProg?.percentageImprovement).toBeGreaterThan(0);

      // Nova insight card
      expect(analytics.novaInsight.headline).toBe('Your training is trending upward.');
      expect(analytics.novaInsight.trendDirection).toBe('upward');
      expect(analytics.novaInsight.supportingMetrics.length).toBeGreaterThanOrEqual(3);
      expect(analytics.novaInsight.recommendedNextAction).toBeDefined();
    });

    it('compares Last Session vs Current Session accurately with deltas', async () => {
      const history = createSampleHistory();
      const comparison = await analyticsService.getExerciseComparison('ex_bench', history);

      expect(comparison.hasComparison).toBe(true);
      expect(comparison.previousSession).toBeDefined();
      expect(comparison.currentSession).toBeDefined();
      expect(comparison.currentSession?.weightKg).toBe(85);
      expect(comparison.previousSession?.weightKg).toBe(82.5);

      // Overload deltas
      expect(comparison.deltas.weightDeltaKg).toBe(2.5);
      expect(comparison.deltas.percentageGain).toBeGreaterThan(0);
      expect(comparison.fullHistory.length).toBe(3);
      expect(comparison.personalRecord?.bestWeightKg).toBe(85);
    });

    it('invalidates bounded cache reactively upon WORKOUT_COMPLETED', async () => {
      // Populate cache
      storage.setJSON('workout:analytics:unified', { cached: true });
      expect(storage.getJSON('workout:analytics:unified')).not.toBeNull();

      // Emit event
      eventBus.emit('WORKOUT_COMPLETED', {
        workoutId: 'w_push',
        durationSeconds: 3600,
        totalVolume: 5000,
        totalSets: 12,
        timestamp: Date.now(),
      });

      // Cache should be evicted immediately
      expect(storage.getJSON('workout:analytics:unified')).toBeNull();
    });
  });

  // ==========================================
  // 5. ADAPTIVE PROGRESSION ENGINE
  // ==========================================
  describe('Adaptive Progression Engine', () => {
    let engine: ProgressionEngine;

    beforeEach(() => {
      engine = new ProgressionEngine();
    });

    it('recommends weight increase with exact Nova reasoning when target hit below RPE threshold', () => {
      const result = engine.calculateProgression({
        exerciseId: 'ex_bench',
        exerciseName: 'Barbell Bench Press',
        previousWeightKg: 80,
        previousReps: 8,
        targetReps: 8,
        completedSets: [
          { id: 's1', setNumber: 1, type: 'normal', targetReps: 8, targetWeight: 80, actualReps: 8, actualWeight: 80, rpe: 7.5, completed: true },
          { id: 's2', setNumber: 2, type: 'normal', targetReps: 8, targetWeight: 80, actualReps: 8, actualWeight: 80, rpe: 7.5, completed: true },
        ],
        lastRpe: 7.5,
        isCompound: true,
        bodyRegion: 'upper',
      });

      expect(result.action).toBe('weight_increase');
      expect(result.recommendedWeightKg).toBe(82.5);
      expect(result.reason).toContain('Previous target was completed below the RPE threshold');
      expect(result.reason).toContain('Nova recommends a 2.5kg increase');
    });

    it('triggers change_exercise outcome on prolonged plateau', () => {
      const result = engine.calculateProgression({
        exerciseId: 'ex_bench',
        exerciseName: 'Barbell Bench Press',
        previousWeightKg: 80,
        previousReps: 8,
        targetReps: 8,
        completedSets: [
          { id: 's1', setNumber: 1, type: 'normal', targetReps: 8, targetWeight: 80, actualReps: 8, actualWeight: 80, rpe: 9.5, completed: true },
        ],
        lastRpe: 9.5,
        historicalWeights: [80, 80, 80],
        historicalReps: [8, 8, 8],
        repeatedPerformanceSessions: 4,
      });

      expect(result.action).toBe('change_exercise');
      expect(result.progressionType).toBe('exercise_swap');
      expect(result.recommendation).toContain('Substitute Barbell Bench Press');
    });

    it('scales back weight when severe missed reps and fatigue are detected', () => {
      const result = engine.calculateProgression({
        exerciseId: 'ex_bench',
        exerciseName: 'Barbell Bench Press',
        previousWeightKg: 90,
        previousReps: 8,
        targetReps: 8,
        completedSets: [
          { id: 's1', setNumber: 1, type: 'normal', targetReps: 8, targetWeight: 90, actualReps: 5, actualWeight: 90, rpe: 10.0, completed: true },
        ],
        lastRpe: 10.0,
        consecutiveMissedRepsCount: 2,
      });

      expect(result.action).toBe('weight_decrease');
      expect(result.recommendedWeightKg).toBeLessThan(90);
      expect(result.progressionType).toBe('scale_back');
    });
  });

  // ==========================================
  // 6. WORKOUT RECOMMENDATION ENGINE
  // ==========================================
  describe('WorkoutRecommendationEngine', () => {
    let recEngine: WorkoutRecommendationEngine;

    const testWorkouts: Workout[] = [
      {
        id: 'w_push',
        name: 'Push Hypertrophy',
        description: 'Push routine',
        goal: 'Hypertrophy',
        difficulty: 'Intermediate',
        estimatedDurationMinutes: 60,
        targetMuscleGroups: ['Chest', 'Shoulders', 'Triceps'],
        equipment: ['Barbell'],
        tags: ['push'],
        isTemplate: true,
        exercises: [],
      },
      {
        id: 'w_pull',
        name: 'Pull Power',
        description: 'Pull routine',
        goal: 'Strength',
        difficulty: 'Intermediate',
        estimatedDurationMinutes: 60,
        targetMuscleGroups: ['Back', 'Biceps'],
        equipment: ['Barbell'],
        tags: ['pull'],
        isTemplate: true,
        exercises: [],
      },
      {
        id: 'w_legs',
        name: 'Legs Destruction',
        description: 'Legs routine',
        goal: 'Hypertrophy',
        difficulty: 'Intermediate',
        estimatedDurationMinutes: 60,
        targetMuscleGroups: ['Quadriceps', 'Hamstrings'],
        equipment: ['Barbell'],
        tags: ['legs'],
        isTemplate: true,
        exercises: [],
      },
    ];

    beforeEach(() => {
      recEngine = new WorkoutRecommendationEngine();
    });

    it('recommends Pull Day when previous session was Push with structured reasoning', () => {
      const pastSessions: WorkoutSession[] = [
        {
          id: 'sess_prev',
          workoutId: 'w_push',
          workoutName: 'Push Power Routine',
          startedAt: referenceTime - 4 * DAY_MS,
          endedAt: referenceTime - 4 * DAY_MS,
          currentExerciseIndex: 0,
          currentSetIndex: 0,
          durationSeconds: 3600,
          pausedDurationMs: 0,
          status: 'completed',
          exercises: [],
          totalVolume: 4000,
          personalRecords: [],
        },
      ];

      const recs = recEngine.recommendWorkouts({
        userGoal: 'Strength',
        availableWorkouts: testWorkouts,
        pastSessions,
      });

      expect(recs.length).toBe(3);
      expect(recs[0].workoutName).toBe('Pull Power');
      expect(recs[0].reason).toContain('Your last Pull session was 4 days ago');
      expect(recs[0].reason).toContain('recovery is high');
      expect(recs[0].reason).toContain('weekly back volume is below target');
    });
  });

  // ==========================================
  // 7. NOVA PERSONALIZATION PHASE CONTRACTS
  // ==========================================
  describe('NovaWorkoutService Structured Contracts', () => {
    let novaService: NovaWorkoutService;

    beforeEach(() => {
      novaService = new NovaWorkoutService();
    });

    it('generates Phase 1: Before Workout Personalization contract', async () => {
      const workout: Workout = {
        id: 'w_bench_fest',
        name: 'Chest Overload',
        description: 'Bench workout',
        goal: 'Hypertrophy',
        difficulty: 'Intermediate',
        estimatedDurationMinutes: 50,
        targetMuscleGroups: ['Chest', 'Triceps'],
        equipment: ['Barbell'],
        tags: ['hypertrophy'],
        isTemplate: true,
        exercises: [
          {
            id: 'we_1',
            exerciseId: 'ex_bench',
            exerciseName: 'Barbell Bench Press',
            order: 1,
            targetSets: 4,
            targetReps: 8,
            targetWeight: 80,
            restSeconds: 90,
            sets: [],
          },
        ],
      };

      const result = await novaService.getBeforeWorkoutPersonalization(workout);
      expect(result.recommendedWorkoutId).toBe('w_bench_fest');
      expect(result.expectedIntensity).toBe('High');
      expect(result.progressionTarget).toContain('Barbell Bench Press');
      expect(result.warmupFocus.length).toBeGreaterThanOrEqual(2);
      expect(result.motivationalCue).toBeDefined();
    });

    it('generates Phase 2: During Workout Personalization contract with RPE adaptation', async () => {
      const exercise = {
        id: 'we_1',
        exerciseId: 'ex_bench',
        exerciseName: 'Barbell Bench Press',
        order: 1,
        targetSets: 3,
        targetReps: 8,
        restSeconds: 90,
        sets: [],
      };

      const set = {
        id: 's_1',
        setNumber: 1,
        type: 'normal' as const,
        targetReps: 8,
        actualReps: 8,
        targetWeight: 80,
        actualWeight: 80,
        rpe: 6.0, // Light effort
        completed: true,
      };

      const result = await novaService.getDuringWorkoutPersonalization(exercise, set, 6.0);
      expect(result.recommendedWeightKg).toBe(82.5);
      expect(result.rpeInterpretation).toContain('RPE 6');
      expect(result.progressionFeedback).toContain('Previous target was completed below the RPE threshold');
    });

    it('generates Phase 3: After Workout Personalization contract with PR debrief', async () => {
      const session: WorkoutSession = {
        id: 'sess_done',
        workoutId: 'w_push',
        workoutName: 'Push Routine',
        startedAt: referenceTime - 3600000,
        endedAt: referenceTime,
        currentExerciseIndex: 1,
        currentSetIndex: 3,
        durationSeconds: 3600,
        pausedDurationMs: 0,
        status: 'completed',
        totalVolume: 5200,
        personalRecords: [
          {
            id: 'pr_new',
            exerciseId: 'ex_bench',
            exerciseName: 'Barbell Bench Press',
            metric: '1rm',
            value: 102.5,
            achievedAt: 1726300000000,
          },
        ],
        exercises: [
          {
            id: 'we_1',
            exerciseId: 'ex_bench',
            exerciseName: 'Barbell Bench Press',
            order: 1,
            targetSets: 3,
            targetReps: 8,
            restSeconds: 90,
            sets: [],
          },
        ],
      };

      const result = await novaService.getAfterWorkoutPersonalization(session, 4000);
      expect(result.headline).toContain('1 Personal Record(s) Achieved');
      expect(result.prsSummary.count).toBe(1);
      expect(result.volumeComparison.percentageDelta).toBe(30);
      expect(result.nextSessionRecommendation.recommendedSplit).toBe('Pull Day');
    });
  });
});
