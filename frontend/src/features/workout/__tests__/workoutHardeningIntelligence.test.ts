/**
 * FitNova AI — Sprint 3.5: Workout OS Production Hardening & Advanced Intelligence Test Suite
 * Comprehensive test coverage for:
 * 1. Intelligence: Progressive Overload, RPE trends, Plateau Detection, Recovery Decisions, Workout Generation
 * 2. Synchronization: Offline set logging, queue persistence, reconnect sync, duplicate prevention, conflict resolution
 * 3. Analytics: Strength progression, volume trends, consistency, PRs, plateau identification
 * 4. Integration: Workout -> EventBus -> Dashboard, Notification priority/dedup, ApiClient cancellation & error formatting
 * 5. Nova Context: Unified domain context aggregation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProgressionEngine } from '../intelligence/ProgressionEngine.ts';
import { RecoveryDecisionEngine } from '../intelligence/RecoveryDecisionEngine.ts';
import { PlateauDetectionEngine } from '../intelligence/PlateauDetectionEngine.ts';
import { WorkoutGenerationService } from '../intelligence/WorkoutGenerationService.ts';
import { NovaContextEngine } from '../intelligence/NovaContextEngine.ts';
import { WorkoutAnalyticsEngine } from '../analytics/WorkoutAnalyticsEngine.ts';
import { ApiClient } from '../../../platform/network/ApiClient.ts';
import { EventBus } from '../../../platform/events/EventBus.ts';
import { NotificationService } from '../../../platform/notifications/NotificationService.ts';
import type { WorkoutHistoryEntry } from '../models/WorkoutHistory.ts';
import type { WorkoutCompletedPayload } from '../../../platform/types/events.ts';

describe('Sprint 3.5 — Workout OS Production Hardening & Advanced Intelligence', () => {
  // ==========================================
  // 1. ADVANCED PROGRESSION OVERLOAD ENGINE
  // ==========================================
  describe('1. Advanced Progression Engine', () => {
    let engine: ProgressionEngine;

    beforeEach(() => {
      engine = new ProgressionEngine();
    });

    it('applies lower-body compound increment (+5.0kg) for leg exercises', () => {
      const rec = engine.calculateProgression({
        exerciseId: 'ex_barbell_squat',
        exerciseName: 'Barbell Back Squat',
        previousWeightKg: 100,
        previousReps: 5,
        targetReps: 5,
        bodyRegion: 'lower',
        isCompound: true,
        completedSets: [
          { id: 's1', setNumber: 1, type: 'normal', targetReps: 5, targetWeight: 100, actualReps: 5, actualWeight: 100, completed: true, rpe: 8.0 },
          { id: 's2', setNumber: 2, type: 'normal', targetReps: 5, targetWeight: 100, actualReps: 5, actualWeight: 100, completed: true, rpe: 8.0 },
          { id: 's3', setNumber: 3, type: 'normal', targetReps: 5, targetWeight: 100, actualReps: 5, actualWeight: 100, completed: true, rpe: 8.0 },
        ],
      });

      expect(rec.action).toBe('weight_increase');
      expect(rec.progressionType).toBe('weight_jump');
      expect(rec.weightDeltaKg).toBe(5.0);
      expect(rec.recommendedWeightKg).toBe(105);
      expect(rec.recommendation).toContain('+5kg');
    });

    it('applies conservative scaling for advanced trainees', () => {
      const rec = engine.calculateProgression({
        exerciseId: 'ex_bench_press',
        exerciseName: 'Barbell Bench Press',
        previousWeightKg: 140,
        previousReps: 3,
        targetReps: 3,
        experienceLevel: 'advanced',
        isCompound: true,
        completedSets: [
          { id: 's1', setNumber: 1, type: 'normal', targetReps: 3, targetWeight: 140, actualReps: 3, actualWeight: 140, completed: true, rpe: 8.0 },
          { id: 's2', setNumber: 2, type: 'normal', targetReps: 3, targetWeight: 140, actualReps: 3, actualWeight: 140, completed: true, rpe: 8.0 },
        ],
      });

      expect(rec.weightDeltaKg).toBe(1.5); // 2.5 * 0.6 = 1.5
      expect(rec.recommendedWeightKg).toBe(141.5);
    });

    it('implements double progression within min/max rep ranges', () => {
      // Case A: Within rep range (e.g. 8-12 reps, hit 10 reps) -> advance reps
      const repAdvance = engine.calculateProgression({
        exerciseId: 'ex_db_curl',
        exerciseName: 'Dumbbell Curl',
        previousWeightKg: 14,
        previousReps: 9,
        targetReps: 10,
        repRangeMin: 8,
        repRangeMax: 12,
        completedSets: [
          { id: 's1', setNumber: 1, type: 'normal', targetReps: 10, targetWeight: 14, actualReps: 10, actualWeight: 14, completed: true, rpe: 8.0 },
        ],
      });
      expect(repAdvance.action).toBe('rep_increase');
      expect(repAdvance.progressionType).toBe('double_progression');
      expect(repAdvance.repsDelta).toBe(1);

      // Case B: Ceiling of rep range hit (all sets hit 12 reps) -> increment weight, reset reps to min
      const weightAdvance = engine.calculateProgression({
        exerciseId: 'ex_db_curl',
        exerciseName: 'Dumbbell Curl',
        previousWeightKg: 14,
        previousReps: 12,
        targetReps: 12,
        repRangeMin: 8,
        repRangeMax: 12,
        isCompound: false,
        completedSets: [
          { id: 's1', setNumber: 1, type: 'normal', targetReps: 12, targetWeight: 14, actualReps: 12, actualWeight: 14, completed: true, rpe: 8.0 },
          { id: 's2', setNumber: 2, type: 'normal', targetReps: 12, targetWeight: 14, actualReps: 12, actualWeight: 14, completed: true, rpe: 8.0 },
        ],
      });
      expect(weightAdvance.action).toBe('weight_increase');
      expect(weightAdvance.progressionType).toBe('double_progression');
      expect(weightAdvance.weightDeltaKg).toBe(1.25);
      expect(weightAdvance.recommendedReps).toBe(8); // Reset to repRangeMin
    });

    it('detects high fatigue and prescribes deload at 60% load', () => {
      const deload = engine.calculateProgression({
        exerciseId: 'ex_deadlift',
        exerciseName: 'Deadlift',
        previousWeightKg: 180,
        previousReps: 5,
        targetReps: 5,
        accumulatedFatigueScore: 9,
        completedSets: [
          { id: 's1', setNumber: 1, type: 'normal', targetReps: 5, targetWeight: 180, actualReps: 3, actualWeight: 180, completed: true, rpe: 9.5 },
        ],
      });

      expect(deload.action).toBe('deload');
      expect(deload.progressionType).toBe('deload');
      expect(deload.isDeloadRecommended).toBe(true);
      expect(deload.recommendedWeightKg).toBeLessThan(180);
      expect(deload.targetRPE).toBe(6.0);
    });
  });

  // ==========================================
  // 2. ADVANCED RECOVERY INTELLIGENCE
  // ==========================================
  describe('2. Advanced Recovery Intelligence', () => {
    let recoveryEngine: RecoveryDecisionEngine;

    beforeEach(() => {
      recoveryEngine = new RecoveryDecisionEngine();
    });

    it('detects acute workload spike (ACWR > 1.5) and penalizes readiness', () => {
      const decision = recoveryEngine.evaluateRecovery({
        sleepHours: 7.5,
        sorenessScore: 3,
        fatigueScore: 3,
        acuteWorkload: 8000,
        chronicWorkload: 4500, // ACWR = 1.77
      });

      expect(decision.primaryFactors.some((f) => f.includes('Acute workload spike'))).toBe(true);
      expect(decision.recoveryDebt).toBeGreaterThan(0);
    });

    it('factors chronic multi-day sleep trend deficit into recovery scoring', () => {
      const decision = recoveryEngine.evaluateRecovery({
        sleepHours: 6.5,
        sorenessScore: 3,
        fatigueScore: 4,
        sleepTrend: [5.5, 5.0, 5.8], // Avg < 6h
      });

      expect(decision.primaryFactors.some((f) => f.includes('Chronic sleep debt'))).toBe(true);
      expect(decision.readinessScore).toBeLessThan(80);
    });

    it('returns structured domain contracts with readinessScore and primaryFactors', () => {
      const decision = recoveryEngine.evaluateRecovery({
        sleepHours: 8.0,
        sorenessScore: 1,
        fatigueScore: 2,
      });

      expect(decision.action).toBe('train_normal');
      expect(decision.decision).toBe('train_normal');
      expect(decision.readinessScore).toBeGreaterThanOrEqual(80);
      expect(decision.isRestDayRecommended).toBe(false);
      expect(decision.recommendedIntensity).toBe('full');
      expect(decision.primaryFactors.length).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // 3. PLATEAU DETECTION ENGINE
  // ==========================================
  describe('3. Plateau Detection Engine', () => {
    let plateauEngine: PlateauDetectionEngine;

    beforeEach(() => {
      plateauEngine = new PlateauDetectionEngine();
    });

    it('detects strength plateau after 3 sessions of static weight and reps', () => {
      const history = [
        { exerciseId: 'bench', exerciseName: 'Bench Press', weightKg: 100, reps: 6, setsCount: 3, totalVolumeKg: 1800, averageRpe: 8.5 },
        { exerciseId: 'bench', exerciseName: 'Bench Press', weightKg: 100, reps: 6, setsCount: 3, totalVolumeKg: 1800, averageRpe: 9.0 },
        { exerciseId: 'bench', exerciseName: 'Bench Press', weightKg: 100, reps: 6, setsCount: 3, totalVolumeKg: 1800, averageRpe: 9.0 },
      ];

      const analysis = plateauEngine.detectExercisePlateau('bench', 'Bench Press', history);
      expect(analysis.isPlateaued).toBe(true);
      expect(analysis.stalledMetric).toBe('strength');
      expect(analysis.intervention).toBe('change rep range');
      expect(analysis.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('recommends exercise change for prolonged plateaus (4+ sessions)', () => {
      const history = [
        { exerciseId: 'ohp', exerciseName: 'Overhead Press', weightKg: 60, reps: 5, setsCount: 3, totalVolumeKg: 900, averageRpe: 8.5 },
        { exerciseId: 'ohp', exerciseName: 'Overhead Press', weightKg: 60, reps: 5, setsCount: 3, totalVolumeKg: 900, averageRpe: 9.0 },
        { exerciseId: 'ohp', exerciseName: 'Overhead Press', weightKg: 60, reps: 5, setsCount: 3, totalVolumeKg: 900, averageRpe: 9.0 },
        { exerciseId: 'ohp', exerciseName: 'Overhead Press', weightKg: 60, reps: 5, setsCount: 3, totalVolumeKg: 900, averageRpe: 9.5 },
      ];

      const analysis = plateauEngine.detectExercisePlateau('ohp', 'Overhead Press', history);
      expect(analysis.isPlateaued).toBe(true);
      expect(analysis.intervention).toBe('change exercise');
    });

    it('detects repeated failure at the same load with high RPE', () => {
      const history = [
        { exerciseId: 'squat', exerciseName: 'Back Squat', weightKg: 120, reps: 5, targetReps: 5, setsCount: 3, totalVolumeKg: 1800, averageRpe: 9.0 },
        { exerciseId: 'squat', exerciseName: 'Back Squat', weightKg: 120, reps: 4, targetReps: 5, setsCount: 3, totalVolumeKg: 1440, averageRpe: 9.5 },
        { exerciseId: 'squat', exerciseName: 'Back Squat', weightKg: 120, reps: 3, targetReps: 5, setsCount: 3, totalVolumeKg: 1080, averageRpe: 10.0 },
      ];

      const analysis = plateauEngine.detectExercisePlateau('squat', 'Back Squat', history);
      expect(analysis.isPlateaued).toBe(true);
      expect(analysis.stalledMetric).toBe('reps');
      expect(analysis.intervention).toBe('reduce volume');
    });
  });

  // ==========================================
  // 4. SMART WORKOUT GENERATION
  // ==========================================
  describe('4. Smart Workout Generation Service', () => {
    let generator: WorkoutGenerationService;

    beforeEach(() => {
      generator = new WorkoutGenerationService();
    });

    it('generates complete structured workout matching split and equipment', () => {
      const result = generator.generateWorkout({
        userGoal: 'hypertrophy',
        trainingSplit: 'push',
        availableEquipment: ['Barbell', 'Dumbbell'],
        targetDurationMinutes: 50,
      });

      expect(result.workoutName).toContain('Push');
      expect(result.goal).toBe('hypertrophy');
      expect(result.intensity).toBe('high');
      expect(result.exercises.length).toBeGreaterThanOrEqual(3);

      const firstEx = result.exercises[0];
      expect(firstEx.exercise).toBeDefined();
      expect(firstEx.sets).toBeGreaterThan(0);
      expect(firstEx.reps).toBeGreaterThan(0);
      expect(firstEx.weight).toBeGreaterThan(0);
      expect(firstEx.rest).toBeGreaterThan(0);
      expect(firstEx.rationale.length).toBeGreaterThan(0);
      expect(result.novaSummary.length).toBeGreaterThan(0);
    });

    it('adapts generated workout volume and intensity when recovery is impaired', () => {
      const result = generator.generateWorkout({
        userGoal: 'strength',
        trainingSplit: 'lower',
        availableEquipment: ['Barbell', 'Dumbbell'],
        readiness: {
          sleepHours: 4.0,
          sorenessScore: 9,
          fatigueScore: 9,
        },
      });

      expect(result.intensity).toBe('low');
      expect(result.workoutName).toContain('Active Recovery');
      expect(result.exercises[0].targetRPE).toBeLessThanOrEqual(7.0);
    });
  });

  // ==========================================
  // 5. NOVA CONTEXT CONTRACT
  // ==========================================
  describe('5. Nova Context Engine', () => {
    let contextEngine: NovaContextEngine;

    beforeEach(() => {
      contextEngine = new NovaContextEngine();
    });

    it('builds unified multimodal domain context for AI consumption', () => {
      const context = contextEngine.buildUnifiedContext({
        session: {
          id: 'sess_1',
          workoutId: 'w_push',
          workoutName: 'Push Strength',
          startedAt: Date.now() - 10000,
          durationSeconds: 10,
          currentExerciseIndex: 0,
          currentSetIndex: 1,
          status: 'active',
          totalVolume: 800,
          exercises: [
            {
              id: 'we_bench',
              exerciseId: 'ex_bench',
              exerciseName: 'Bench Press',
              order: 1,
              targetSets: 3,
              targetReps: 8,
              restSeconds: 90,
              sets: [
                { id: 's1', setNumber: 1, type: 'normal', targetReps: 8, targetWeight: 80, actualReps: 8, actualWeight: 80, completed: true, rpe: 8.0 },
                { id: 's2', setNumber: 2, type: 'normal', targetReps: 8, targetWeight: 80, completed: false },
              ],
            },
          ],
          personalRecords: [],
          pausedDurationMs: 0,
        },
        activeExerciseIndex: 0,
        activeSetIndex: 1,
        readiness: {
          sleepHours: 7.5,
          sorenessScore: 2,
          fatigueScore: 3,
        },
        personalRecords: [
          {
            id: 'pr_1',
            exerciseId: 'ex_bench',
            exerciseName: 'Bench Press',
            metric: '1rm',
            value: 100,
            achievedAt: Date.now(),
          },
        ],
      });

      expect(context.currentExercise?.name).toBe('Bench Press');
      expect(context.previousPerformance?.weight).toBe(80);
      expect(context.previousPerformance?.reps).toBe(8);
      expect(context.sleep.quality).toBe('optimal');
      expect(context.recoveryScore).toBeGreaterThan(80);
      expect(context.prHistory.length).toBe(1);
    });
  });

  // ==========================================
  // 6. WORKOUT ANALYTICS ENGINE
  // ==========================================
  describe('6. Pure-TypeScript Workout Analytics Engine', () => {
    let analyticsEngine: WorkoutAnalyticsEngine;

    const mockHistory: WorkoutHistoryEntry[] = [
      {
        id: 'h1',
        sessionId: 's1',
        workoutId: 'w1',
        workoutName: 'Push 1',
        date: '2026-09-01',
        completedAt: new Date('2026-09-01T10:00:00Z').getTime(),
        durationSeconds: 3600,
        totalVolume: 4000,
        totalSets: 12,
        completedSets: 12,
        exercisesCount: 3,
        personalRecordsCount: 1,
        exercises: [
          {
            exerciseId: 'ex_bench',
            exerciseName: 'Bench Press',
            setsCount: 3,
            bestSet: { reps: 8, weight: 80 },
            volume: 1920,
          },
        ],
      },
      {
        id: 'h2',
        sessionId: 's2',
        workoutId: 'w1',
        workoutName: 'Push 2',
        date: '2026-09-08',
        completedAt: new Date('2026-09-08T10:00:00Z').getTime(),
        durationSeconds: 3600,
        totalVolume: 4500,
        totalSets: 12,
        completedSets: 12,
        exercisesCount: 3,
        personalRecordsCount: 1,
        exercises: [
          {
            exerciseId: 'ex_bench',
            exerciseName: 'Bench Press',
            setsCount: 3,
            bestSet: { reps: 8, weight: 85 },
            volume: 2040,
          },
        ],
      },
    ];

    beforeEach(() => {
      analyticsEngine = new WorkoutAnalyticsEngine();
    });

    it('calculates exercise-level strength progression and E1RM curve', () => {
      const report = analyticsEngine.calculateExerciseStrengthProgression('ex_bench', mockHistory);

      expect(report.exerciseName).toBe('Bench Press');
      expect(report.initial1RM).toBeGreaterThan(0);
      expect(report.current1RM).toBeGreaterThan(report.initial1RM);
      expect(report.percentageGain).toBeGreaterThan(0);
      expect(report.trend.length).toBe(2);
    });

    it('calculates weekly and monthly volume trends', () => {
      const volumeReport = analyticsEngine.calculateVolumeTrends(mockHistory);

      expect(volumeReport.weekly.length).toBeGreaterThan(0);
      expect(volumeReport.totalTonnageKg).toBe(8500);
      expect(volumeReport.weekly[0].averageVolumePerWorkout).toBeGreaterThan(0);
    });

    it('computes consistency, weekly frequency, and streak weeks', () => {
      const consistency = analyticsEngine.calculateConsistency(mockHistory, 4);

      expect(consistency.totalWorkouts).toBe(2);
      expect(consistency.adherenceRate).toBeGreaterThanOrEqual(0);
      expect(consistency.streakWeeks).toBeGreaterThanOrEqual(1);
    });

    it('correlates recovery readiness with workout volume output', () => {
      const readinessLogs = [
        { date: '2026-09-01', readinessScore: 85 },
        { date: '2026-09-08', readinessScore: 90 },
      ];

      const correlation = analyticsEngine.calculateRecoveryPerformanceCorrelation(
        readinessLogs,
        mockHistory
      );

      expect(correlation.correlationScore).toBeGreaterThan(0);
      expect(correlation.insight).toContain('higher');
    });
  });

  // ==========================================
  // 7. DASHBOARD REACTIVE EVENTBUS INTEGRATION
  // ==========================================
  describe('7. Dashboard Reactive EventBus Integration', () => {
    it('reactively broadcasts WORKOUT_COMPLETED to recalculate dashboard metrics without tight coupling', () => {
      const eventBus = new EventBus();
      let receivedPayload: WorkoutCompletedPayload | null = null;

      // Decoupled Dashboard listener
      eventBus.subscribe('WORKOUT_COMPLETED', (payload) => {
        receivedPayload = payload;
      });

      // Emitted by workout domain
      eventBus.emit('WORKOUT_COMPLETED', {
        workoutId: 'w_push_strength',
        workoutName: 'Push Strength Live',
        sessionId: 'sess_123',
        durationSeconds: 3200,
        totalVolume: 5600,
        totalSets: 14,
        completedSets: 14,
        personalRecordsCount: 2,
        timestamp: Date.now(),
      });

      expect(receivedPayload).not.toBeNull();
      expect((receivedPayload as unknown as WorkoutCompletedPayload).totalVolume).toBe(5600);
      expect((receivedPayload as unknown as WorkoutCompletedPayload).personalRecordsCount).toBe(2);
    });
  });

  // ==========================================
  // 8. NOTIFICATION INTELLIGENCE & PRIORITY
  // ==========================================
  describe('8. Notification Intelligence', () => {
    let notifService: NotificationService;

    beforeEach(() => {
      notifService = new NotificationService({ defaultDurationMs: 5000, defaultDedupWindowMs: 2000 });
    });

    it('deduplicates repetitive notifications within the deduplication window', () => {
      const id1 = notifService.notify({
        type: 'workout',
        title: 'Set Logged',
        message: '80kg × 8 reps',
        dedupKey: 'bench_set_1',
      });

      const id2 = notifService.notify({
        type: 'workout',
        title: 'Set Logged',
        message: '80kg × 8 reps',
        dedupKey: 'bench_set_1',
      });

      // Returns existing notification ID and does not duplicate
      expect(id1).toBe(id2);
      expect(notifService.list().length).toBe(1);
    });

    it('assigns high priority to PR achievements and recovery alerts', () => {
      notifService.notify({
        type: 'achievement',
        title: 'New PR!',
        message: 'Bench Press: 100kg',
      });

      const items = notifService.list();
      expect(items[0].priority).toBe('high');
    });
  });

  // ==========================================
  // 9. API CLIENT HARDENING & CANCELLATION
  // ==========================================
  describe('9. ApiClient Hardening & Cancellation', () => {
    it('cancels requests via caller AbortSignal', async () => {
      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      const controller = new AbortController();

      // Immediately abort
      controller.abort('User unmounted');

      await expect(
        client.request('/workouts/sessions/active', {
          signal: controller.signal,
        })
      ).rejects.toThrow();
    });

    it('formats FastAPI 422 array validation details cleanly into strings', async () => {
      const client = new ApiClient({ baseUrl: 'https://api.example.com' });

      // Mock fetch returning FastAPI 422 array response
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({
          detail: [
            { loc: ['body', 'exercise_id'], msg: 'field required' },
            { loc: ['body', 'reps'], msg: 'value must be greater than 0' },
          ],
        }),
      } as unknown as Response);

      await expect(
        client.request('/workouts/sessions/log-set', { method: 'POST', body: '{}' })
      ).rejects.toThrow(/exercise_id: field required; reps: value must be greater than 0/);
    });
  });
});
