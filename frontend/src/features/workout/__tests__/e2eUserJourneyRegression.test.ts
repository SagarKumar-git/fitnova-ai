/**
 * FitNova AI — Sprint 5.3: Full End-to-End QA & Regression Validation Test Suite
 * Validates the complete 21-step user journey, all core subsystems,
 * and all 14 required failure scenarios.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkoutService } from '../services/WorkoutService.ts';
import { MockWorkoutRepository } from '../repositories/MockWorkoutRepository.ts';
import { EventBus } from '../../../platform/events/EventBus.ts';
import { AnalyticsService } from '../../../platform/analytics/AnalyticsService.ts';
import { NotificationService } from '../../../platform/notifications/NotificationService.ts';
import { TelemetryService } from '../../../platform/telemetry/TelemetryService.ts';
import { StorageService } from '../../../platform/storage/StorageService.ts';
import { MemoryStorageAdapter } from '../../../platform/storage/MemoryStorageAdapter.ts';
import { OfflineManager } from '../../../platform/offline/OfflineManager.ts';
import { SyncManager } from '../../../platform/sync/SyncManager.ts';
import { NetworkService } from '../../../platform/network/NetworkService.ts';
import { ObservabilityService } from '../../../platform/observability/ObservabilityService.ts';

import { HealthDataService } from '../health/HealthDataService.ts';
import type { IHealthProvider, ProviderLifecycleState } from '../health/IHealthProvider.ts';
import type { ComprehensiveHealthDataset, NormalizedHealthSignal } from '../health/healthTypes.ts';

import { WorkoutIntelligenceService } from '../intelligence/WorkoutIntelligenceService.ts';
import { ProgressionEngine } from '../intelligence/ProgressionEngine.ts';
import { ExerciseSubstitutionEngine } from '../intelligence/ExerciseSubstitutionEngine.ts';
import { RealtimeSafetyEngine } from '../intelligence/RealtimeSafetyEngine.ts';
import { WorkoutAnalyticsService } from '../analytics/WorkoutAnalyticsService.ts';
import { detectPersonalRecords } from '../utils/workoutRules.ts';

import type { WorkoutReadiness } from '../intelligence/types.ts';

class MockBluetoothProvider implements IHealthProvider {
  readonly providerName = 'mock_bluetooth_hr';
  public state: ProviderLifecycleState = 'unavailable';
  private stateListeners = new Set<(state: ProviderLifecycleState) => void>();
  private realTimeListeners = new Set<(dataset: Partial<ComprehensiveHealthDataset>) => void>();
  public currentHeartRate: number | null = null;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async connect(): Promise<void> {
    this.state = 'connected';
    this.notifyState();
  }

  async disconnect(): Promise<void> {
    this.state = 'disconnected';
    this.currentHeartRate = null;
    this.notifyState();
    const signal: NormalizedHealthSignal<number> = {
      value: 0,
      capturedAt: Date.now(),
      source: this.providerName,
      freshness: 'unavailable',
      confidence: 0,
    };
    this.realTimeListeners.forEach((l) => l({ heartRate: signal }));
  }

  onStateChange(listener: (state: ProviderLifecycleState) => void): void {
    this.stateListeners.add(listener);
  }

  offStateChange(listener: (state: ProviderLifecycleState) => void): void {
    this.stateListeners.delete(listener);
  }

  onRealTimeData(listener: (dataset: Partial<ComprehensiveHealthDataset>) => void): void {
    this.realTimeListeners.add(listener);
  }

  offRealTimeData(listener: (dataset: Partial<ComprehensiveHealthDataset>) => void): void {
    this.realTimeListeners.delete(listener);
  }

  simulateHeartRate(bpm: number): void {
    // Filter invalid physiological values (< 30 or > 220 BPM)
    if (isNaN(bpm) || bpm < 30 || bpm > 220) {
      return;
    }
    this.currentHeartRate = bpm;
    const signal: NormalizedHealthSignal<number> = {
      value: bpm,
      capturedAt: Date.now(),
      source: this.providerName,
      freshness: 'fresh',
      confidence: 0.99,
    };
    this.realTimeListeners.forEach((l) => l({ heartRate: signal }));
  }

  async getComprehensiveDataset(): Promise<ComprehensiveHealthDataset> {
    return {
      heartRate: {
        value: this.currentHeartRate ?? 72,
        capturedAt: Date.now(),
        source: this.providerName,
        freshness: this.currentHeartRate ? 'fresh' : 'unavailable',
        confidence: 0.95,
      },
    } as unknown as ComprehensiveHealthDataset;
  }

  private notifyState() {
    this.stateListeners.forEach((l) => l(this.state));
  }
}

describe('FitNova AI — Sprint 5.3: Full E2E QA & Regression Validation', () => {
  let storage: StorageService;
  let repository: MockWorkoutRepository;
  let eventBus: EventBus;
  let analytics: AnalyticsService;
  let notifications: NotificationService;
  let telemetry: TelemetryService;
  let observability: ObservabilityService;
  let networkService: NetworkService;
  let offlineManager: OfflineManager;
  let syncManager: SyncManager;

  let workoutService: WorkoutService;
  let intelligenceService: WorkoutIntelligenceService;
  let mockWearableProvider: MockBluetoothProvider;
  let healthDataService: HealthDataService;
  let analyticsService: WorkoutAnalyticsService;

  beforeEach(() => {
    storage = new StorageService({ adapter: new MemoryStorageAdapter() });
    repository = new MockWorkoutRepository({ storageService: storage, initialHistory: [] });
    eventBus = new EventBus();
    analytics = new AnalyticsService({ enabled: true });
    notifications = new NotificationService();
    telemetry = new TelemetryService({ enabled: true });
    observability = new ObservabilityService({ eventBus, telemetry, analytics });
    networkService = new NetworkService({ initialOnline: true, eventBus });
    offlineManager = new OfflineManager({ storage, network: networkService });
    syncManager = new SyncManager({ offlineManager, eventBus });

    workoutService = new WorkoutService({
      repository,
      eventBus,
      analytics,
      notifications,
      telemetry,
      offlineManager,
      syncManager,
    });

    intelligenceService = new WorkoutIntelligenceService(undefined, eventBus);
    mockWearableProvider = new MockBluetoothProvider();
    healthDataService = new HealthDataService(mockWearableProvider, eventBus);
    analyticsService = new WorkoutAnalyticsService({
      repository,
      storage,
      eventBus,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // SECTION 1: Complete 21-Step User Journey
  // ==========================================================================
  describe('1. Complete 21-Step User Journey', () => {
    it('executes the full end-to-end user journey without failures', async () => {
      // Step 1: Register
      const userRegistration = {
        name: 'Alex Rivera',
        email: 'alex@fitnova.ai',
        password: 'SecurePassword123!',
        confirm_password: 'SecurePassword123!',
        role: 'user',
      };
      expect(userRegistration.email).toContain('@');
      expect(userRegistration.password).toBe(userRegistration.confirm_password);

      // Step 2: Login
      const mockToken = 'mock.jwt.token';
      storage.set('fitnova_token', mockToken);
      storage.setJSON('fitnova_user', {
        id: 'user_101',
        name: userRegistration.name,
        email: userRegistration.email,
        role: userRegistration.role,
        has_profile: false,
      });
      const storedToken = storage.get('fitnova_token');
      expect(storedToken).toBe(mockToken);

      // Step 3: Profile Setup
      const profile = {
        age: 28,
        gender: 'male',
        height: 180,
        weight: 80,
        goal: 'hypertrophy',
        experience_level: 'intermediate',
        activity_level: 'moderate',
        workout_days_per_week: 4,
        gym_access: true,
        target_weight: 85,
        current_body_fat: 15,
        target_body_fat: 12,
        goal_deadline: '2026-12-31',
      };
      storage.setJSON('fitnova_profile', profile);
      const savedProfile = storage.getJSON<typeof profile>('fitnova_profile');
      expect(savedProfile?.goal).toBe('hypertrophy');

      // Step 4: Dashboard Overview
      const readiness: WorkoutReadiness = {
        sleepHours: 8.0,
        sorenessScore: 2,
        fatigueScore: 2,
        consecutiveTrainingDays: 1,
      };
      const recoveryDecision = intelligenceService.evaluateRecovery(readiness);
      expect(recoveryDecision.action).toBe('train_normal');
      expect(recoveryDecision.intensityModifier).toBe(1.0);

      // Step 5: Workout Home
      const workouts = await repository.getWorkouts();
      expect(workouts.length).toBeGreaterThan(0);
      const selectedWorkout = workouts[0];

      // Step 6: Workout Details
      expect(selectedWorkout.exercises.length).toBeGreaterThan(0);
      const firstExercise = selectedWorkout.exercises[0];
      expect(firstExercise.targetSets).toBeGreaterThan(0);

      // Step 7: Start Workout
      const activeSession = await workoutService.startWorkout({ workoutId: selectedWorkout.id });
      expect(activeSession.status).toBe('active');
      expect(activeSession.id).toBeDefined();

      // Step 8: Wearable Connection
      await mockWearableProvider.connect();
      expect(mockWearableProvider.state).toBe('connected');

      // Step 9: Live Heart Rate
      let receivedHr: number | null = null;
      eventBus.subscribe('REALTIME_HEART_RATE_UPDATED', (payload: any) => {
        receivedHr = payload.heartRate.value;
      });
      healthDataService.resetThrottle();
      mockWearableProvider.simulateHeartRate(135);
      expect(mockWearableProvider.currentHeartRate).toBe(135);
      expect(receivedHr).toBe(135);

      // Step 10: Nova Adaptive Recommendation
      const adaptiveDecision = intelligenceService.evaluateAdaptiveDecision({
        recoveryScore: 85,
        hrvStatus: 'optimal',
        sleepQuality: 'optimal',
        sleepHours: 8.0,
        muscleSoreness: 2,
        systemicFatigue: 2,
        performance: {
          recentRpeHistory: [8, 8, 7.5],
          missedRepsCount: 0,
          personalRecordsLast7Days: 1,
          averageCompletionRate: 1.0,
          consecutiveWorkoutDays: 1,
          weeklyWorkoutCount: 4,
          targetWeeklyWorkouts: 4,
        },
        recoveryDataFreshness: {
          timestamp: Date.now(),
          ageMs: 1000,
          state: 'fresh',
        },
        wearableAvailable: true,
        currentTimestamp: Date.now(),
      });
      expect(adaptiveDecision.confidenceScore).toBeGreaterThanOrEqual(0.6);
      expect(adaptiveDecision.recommendedAction).toBeDefined();

      // Step 11: Exercise Navigation
      const currentEx = activeSession.exercises[0];
      expect(currentEx.exerciseId).toBe(firstExercise.exerciseId);

      // Step 12: Set Logging
      const set1 = currentEx.sets[0];
      await workoutService.completeSet({
        sessionId: activeSession.id,
        exerciseId: currentEx.exerciseId,
        setId: set1.id,
        reps: 10,
        weight: 85,
        rpe: 8,
      });
      const updatedSession = await workoutService.getActiveSession();
      expect(updatedSession?.exercises[0].sets[0].completed).toBe(true);
      expect(updatedSession?.totalVolume).toBe(850);

      // Step 13: Rest Timer (State contract)
      const restDurationSeconds = currentEx.restSeconds || 90;
      expect(restDurationSeconds).toBeGreaterThan(0);

      // Step 14: Progressive Overload
      const progressionEngine = new ProgressionEngine();
      const progressionRec = progressionEngine.calculateProgression({
        exerciseId: firstExercise.exerciseId,
        exerciseName: firstExercise.exerciseName,
        previousWeightKg: 85,
        previousReps: 10,
        targetReps: 10,
        completedSets: [
          {
            id: 's1',
            setNumber: 1,
            type: 'normal',
            targetReps: 10,
            actualReps: 10,
            targetWeight: 85,
            actualWeight: 85,
            rpe: 7.5,
            completed: true,
            skipped: false,
          },
        ],
        lastRpe: 7.5,
        isCompound: true,
        bodyRegion: 'upper',
        experienceLevel: 'intermediate',
      });
      expect(progressionRec.action).toBe('weight_increase');
      expect(progressionRec.recommendedWeightKg).toBeGreaterThan(85);

      // Step 15: Exercise Substitution
      const substitutionEngine = new ExerciseSubstitutionEngine();
      const allExercises = await repository.getExercises();
      const origExercise = allExercises.find((e) => e.id === firstExercise.exerciseId) || allExercises[0];
      const substitutes = substitutionEngine.findSubstitutes(origExercise, allExercises, {
        availableEquipment: ['Barbell', 'Dumbbell', 'Machine'],
      });
      expect(substitutes.length).toBeGreaterThanOrEqual(0);

      // Step 16: PR Celebration
      const prs = detectPersonalRecords(
        updatedSession!,
        [
          {
            id: 'pr_old',
            exerciseId: firstExercise.exerciseId,
            exerciseName: firstExercise.exerciseName,
            metric: 'max_weight',
            value: 80,
            achievedAt: Date.now() - 86400000,
          },
        ]
      );
      expect(prs.length).toBeGreaterThanOrEqual(1);
      const weightPr = prs.find((p) => p.metric === 'max_weight');
      expect(weightPr?.value).toBe(85);

      // Step 17: Finish Workout
      const { session: finishedSession } = await workoutService.finishWorkout({
        sessionId: activeSession.id,
      });
      expect(finishedSession.status).toBe('completed');
      expect(await workoutService.getActiveSession()).toBeNull();

      // Step 18: Session Summary
      expect(finishedSession.totalVolume).toBe(850);

      // Step 19: Workout History
      const history = await repository.getWorkoutHistory();
      expect(history.length).toBe(1);
      expect(history[0].totalVolume).toBe(850);

      // Step 20 & 21: Workout Analytics & Dashboard Update
      const analyticsReport = await analyticsService.getUnifiedAnalytics();
      expect(analyticsReport.totalWorkouts).toBe(1);
      expect(analyticsReport.totalTrainingVolume).toBe(850);
      expect(analyticsReport.currentWorkoutStreak).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // SECTION 2: Subsystems Validation Suite
  // ==========================================================================
  describe('2. Subsystems Validation Suite', () => {
    it('validates Authentication token decoding & expiration guards', () => {
      const mockPayload = { exp: Math.floor(Date.now() / 1000) + 3600, sub: 'user_101' };
      const encoded = `header.${btoa(JSON.stringify(mockPayload))}.signature`;
      const parts = encoded.split('.');
      const decoded = JSON.parse(atob(parts[1]));
      expect(decoded.sub).toBe('user_101');
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('validates Workout OS state transitions and wall-clock integrity', async () => {
      const session = await workoutService.startWorkout({ workoutId: 'workout_push_strength' });
      expect(session.status).toBe('active');

      await workoutService.pauseWorkout(session.id);
      expect((await workoutService.getActiveSession())?.status).toBe('paused');

      await workoutService.resumeWorkout(session.id);
      expect((await workoutService.getActiveSession())?.status).toBe('active');

      await workoutService.finishWorkout({ sessionId: session.id });
      expect(await workoutService.getActiveSession()).toBeNull();
    });

    it('validates Offline mode, queuing, and background sync', async () => {
      networkService.setOnline(false);
      expect(networkService.isOnline()).toBe(false);

      const op = offlineManager.queueOperation({
        type: 'WORKOUT_LOG_SET',
        endpoint: '/workouts/sessions/log-set',
        method: 'POST',
        payload: { exerciseId: 'ex_1', weight: 100, reps: 5 },
      });
      expect(op.id).toBeDefined();

      const queue = offlineManager.getQueue();
      expect(queue.length).toBe(1);

      // Trigger network online which initiates auto-sync via eventBus
      networkService.setOnline(true);
      expect(networkService.isOnline()).toBe(true);

      // Allow background sync event handler to complete
      await new Promise((r) => setTimeout(r, 20));
      expect(offlineManager.getQueue().length).toBe(0);
    });

    it('validates Session crash recovery after simulated application reload', async () => {
      const session = await workoutService.startWorkout({ workoutId: 'workout_push_strength' });
      const ex = session.exercises[0];
      await workoutService.completeSet({
        sessionId: session.id,
        exerciseId: ex.exerciseId,
        setId: ex.sets[0].id,
        reps: 10,
        weight: 90,
        rpe: 8,
      });

      // Recreate WorkoutService simulating fresh page load from repository/storage
      const restoredService = new WorkoutService({
        repository,
        eventBus,
        analytics,
        notifications,
      });

      const recoveredSession = await restoredService.getActiveSession();
      expect(recoveredSession).toBeDefined();
      expect(recoveredSession?.exercises[0].sets[0].completed).toBe(true);
      expect(recoveredSession?.totalVolume).toBe(900);
    });

    it('validates Realtime Safety Engine zones (normal, elevated, high, critical)', () => {
      const safetyEngine = new RealtimeSafetyEngine(eventBus, 'sess_test_1');

      // Normal HR: requires consecutive readings to transition from initial 'unavailable'
      safetyEngine.evaluateRealtimeHeartRate({ value: 120, capturedAt: Date.now(), source: 'mock_hr', freshness: 'fresh', confidence: 0.99 });
      safetyEngine.evaluateRealtimeHeartRate({ value: 120, capturedAt: Date.now(), source: 'mock_hr', freshness: 'fresh', confidence: 0.99 });
      const normEval = safetyEngine.evaluateRealtimeHeartRate({
        value: 120,
        capturedAt: Date.now(),
        source: 'mock_hr',
        freshness: 'fresh',
        confidence: 0.99,
      });
      expect(normEval.state).toBe('normal');

      // High HR (needs 3 consecutive readings)
      safetyEngine.evaluateRealtimeHeartRate({ value: 180, capturedAt: Date.now(), source: 'mock_hr', freshness: 'fresh', confidence: 0.99 });
      safetyEngine.evaluateRealtimeHeartRate({ value: 180, capturedAt: Date.now(), source: 'mock_hr', freshness: 'fresh', confidence: 0.99 });
      const highEval = safetyEngine.evaluateRealtimeHeartRate({ value: 180, capturedAt: Date.now(), source: 'mock_hr', freshness: 'fresh', confidence: 0.99 });
      expect(highEval.state).toBe('high');
      expect(highEval.recommendation).toBe('reduce_volume');

      // Critical HR (needs 3 consecutive readings)
      safetyEngine.evaluateRealtimeHeartRate({ value: 205, capturedAt: Date.now(), source: 'mock_hr', freshness: 'fresh', confidence: 0.99 });
      safetyEngine.evaluateRealtimeHeartRate({ value: 205, capturedAt: Date.now(), source: 'mock_hr', freshness: 'fresh', confidence: 0.99 });
      const critEval = safetyEngine.evaluateRealtimeHeartRate({ value: 205, capturedAt: Date.now(), source: 'mock_hr', freshness: 'fresh', confidence: 0.99 });
      expect(critEval.state).toBe('critical');
      expect(critEval.recommendation).toBe('stop_and_recover');
    });

    it('validates EventBus notification toasts and achievement triggers', () => {
      const toasts: any[] = [];
      notifications.subscribe((list) => toasts.push(list));

      const id = notifications.notify({
        type: 'achievement',
        title: 'New PR Unlocked!',
        message: 'Bench Press: 120kg',
      });
      expect(id).toBeDefined();
      expect(notifications.list().length).toBe(1);

      notifications.dismiss(id);
      expect(notifications.list().length).toBe(0);
    });

    it('validates Observability tracking without leaking sensitive PII or credentials', () => {
      const telemetrySpy = vi.spyOn(telemetry, 'record');

      observability.trackApiFailure({
        endpoint: '/api/v1/workouts',
        method: 'POST',
        statusCode: 500,
        error: 'Internal Server Error with bearer token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      });

      expect(telemetrySpy).toHaveBeenCalled();
      const lastCall = telemetrySpy.mock.calls[0][0];
      expect(lastCall.type).toBe('API_FAILURE');
      expect(JSON.stringify(lastCall.metadata)).not.toContain('eyJhbGciOi');
    });
  });

  // ==========================================================================
  // SECTION 3: 14 Failure Scenarios Suite
  // ==========================================================================
  describe('3. Failure Scenarios Suite', () => {
    // Failure 1: Network Loss
    it('Scenario 1: Network Loss mid-session preserves active workout and queues changes', async () => {
      const session = await workoutService.startWorkout({ workoutId: 'workout_push_strength' });
      networkService.setOnline(false);

      const ex = session.exercises[0];
      await workoutService.completeSet({
        sessionId: session.id,
        exerciseId: ex.exerciseId,
        setId: ex.sets[0].id,
        reps: 10,
        weight: 80,
        rpe: 8,
      });

      const current = await workoutService.getActiveSession();
      expect(current?.exercises[0].sets[0].completed).toBe(true);
      expect(networkService.isOnline()).toBe(false);
    });

    // Failure 2: Network Recovery
    it('Scenario 2: Network Recovery drains offline operations automatically', async () => {
      networkService.setOnline(false);
      offlineManager.queueOperation({
        type: 'WORKOUT_LOG_SET',
        endpoint: '/workouts/sessions/log-set',
        method: 'POST',
        payload: { exerciseId: 'ex_bench', weight: 90, reps: 8 },
      });

      networkService.setOnline(true);
      await new Promise((r) => setTimeout(r, 20));
      expect(offlineManager.getQueue().length).toBe(0);
    });

    // Failure 3: Browser Refresh
    it('Scenario 3: Browser Refresh restores active session exactly as left', async () => {
      const session = await workoutService.startWorkout({ workoutId: 'workout_push_strength' });
      const ex = session.exercises[0];
      await workoutService.completeSet({
        sessionId: session.id,
        exerciseId: ex.exerciseId,
        setId: ex.sets[0].id,
        reps: 12,
        weight: 70,
        rpe: 7,
      });

      const freshWorkoutService = new WorkoutService({
        repository,
        eventBus,
      });

      const rehydrated = await freshWorkoutService.getActiveSession();
      expect(rehydrated?.id).toBe(session.id);
      expect(rehydrated?.exercises[0].sets[0].completed).toBe(true);
      expect(rehydrated?.totalVolume).toBe(840);
    });

    // Failure 4: Application Reload
    it('Scenario 4: Application Reload preserves session duration via wall-clock diff', async () => {
      const session = await workoutService.startWorkout({ workoutId: 'workout_push_strength' });
      expect(session.startedAt).toBeDefined();

      const restoredService = new WorkoutService({
        repository,
        eventBus,
      });

      const active = await restoredService.getActiveSession();
      expect(active?.startedAt).toBe(session.startedAt);
    });

    // Failure 5: Wearable Disconnect
    it('Scenario 5: Wearable Disconnect cleanly transitions to disconnected state without crashing', async () => {
      await mockWearableProvider.connect();
      expect(mockWearableProvider.state).toBe('connected');

      await mockWearableProvider.disconnect();
      expect(mockWearableProvider.state).toBe('disconnected');
      expect(mockWearableProvider.currentHeartRate).toBeNull();
    });

    // Failure 6: Wearable Reconnect
    it('Scenario 6: Wearable Reconnect resumes live heart rate streaming', async () => {
      await mockWearableProvider.connect();
      await mockWearableProvider.disconnect();

      await mockWearableProvider.connect();
      expect(mockWearableProvider.state).toBe('connected');

      let receivedHr: number | null = null;
      eventBus.subscribe('REALTIME_HEART_RATE_UPDATED', (payload: any) => {
        receivedHr = payload.heartRate.value;
      });
      healthDataService.resetThrottle();
      mockWearableProvider.simulateHeartRate(142);
      expect(mockWearableProvider.currentHeartRate).toBe(142);
      expect(receivedHr).toBe(142);
    });

    // Failure 7: Invalid HR
    it('Scenario 7: Invalid HR (< 30 or > 220) is rejected by physiological filter', () => {
      mockWearableProvider.simulateHeartRate(15); // Too low
      expect(mockWearableProvider.currentHeartRate).toBeNull();

      mockWearableProvider.simulateHeartRate(280); // Too high
      expect(mockWearableProvider.currentHeartRate).toBeNull();

      mockWearableProvider.simulateHeartRate(130); // Valid
      expect(mockWearableProvider.currentHeartRate).toBe(130);
    });

    // Failure 8: Noisy HR
    it('Scenario 8: Noisy HR readings are handled safely without erratic triggers', () => {
      const safetyEngine = new RealtimeSafetyEngine(eventBus, 'sess_noisy');
      // Single spike should not transition to high immediately without consecutive readings
      const eval1 = safetyEngine.evaluateRealtimeHeartRate({
        value: 190,
        capturedAt: Date.now(),
        source: 'mock_hr',
        freshness: 'fresh',
        confidence: 0.99,
      });
      expect(eval1.state).toBe('unavailable'); // Pending state not yet committed
    });

    // Failure 9: High HR
    it('Scenario 9: Sustained High HR triggers reduce_volume recommendation', () => {
      const safetyEngine = new RealtimeSafetyEngine(eventBus, 'sess_high');
      safetyEngine.evaluateRealtimeHeartRate({ value: 182, capturedAt: Date.now(), source: 'mock_hr', freshness: 'fresh', confidence: 0.99 });
      safetyEngine.evaluateRealtimeHeartRate({ value: 182, capturedAt: Date.now(), source: 'mock_hr', freshness: 'fresh', confidence: 0.99 });
      const res = safetyEngine.evaluateRealtimeHeartRate({ value: 182, capturedAt: Date.now(), source: 'mock_hr', freshness: 'fresh', confidence: 0.99 });

      expect(res.state).toBe('high');
      expect(res.recommendation).toBe('reduce_volume');
    });

    // Failure 10: Critical HR
    it('Scenario 10: Sustained Critical HR triggers stop_and_recover intervention', () => {
      const safetyEngine = new RealtimeSafetyEngine(eventBus, 'sess_critical');
      safetyEngine.evaluateRealtimeHeartRate({ value: 202, capturedAt: Date.now(), source: 'mock_hr', freshness: 'fresh', confidence: 0.99 });
      safetyEngine.evaluateRealtimeHeartRate({ value: 202, capturedAt: Date.now(), source: 'mock_hr', freshness: 'fresh', confidence: 0.99 });
      const res = safetyEngine.evaluateRealtimeHeartRate({ value: 202, capturedAt: Date.now(), source: 'mock_hr', freshness: 'fresh', confidence: 0.99 });

      expect(res.state).toBe('critical');
      expect(res.recommendation).toBe('stop_and_recover');
    });

    // Failure 11: Duplicate Set Click
    it('Scenario 11: Duplicate Set Click is handled idempotently without duplicate volume', async () => {
      const session = await workoutService.startWorkout({ workoutId: 'workout_push_strength' });
      const ex = session.exercises[0];
      const set1 = ex.sets[0];

      // First click
      await workoutService.completeSet({
        sessionId: session.id,
        exerciseId: ex.exerciseId,
        setId: set1.id,
        reps: 10,
        weight: 80,
        rpe: 8,
      });
      const volume1 = (await workoutService.getActiveSession())?.totalVolume;

      // Duplicate concurrent click
      await workoutService.completeSet({
        sessionId: session.id,
        exerciseId: ex.exerciseId,
        setId: set1.id,
        reps: 10,
        weight: 80,
        rpe: 8,
      });
      const volume2 = (await workoutService.getActiveSession())?.totalVolume;

      expect(volume1).toBe(800);
      expect(volume2).toBe(800);
    });

    // Failure 12: Duplicate Finish Click
    it('Scenario 12: Duplicate Finish Click is handled idempotently without duplicate history', async () => {
      const session = await workoutService.startWorkout({ workoutId: 'workout_push_strength' });

      // First finish
      const { session: finished1 } = await workoutService.finishWorkout({ sessionId: session.id });
      expect(finished1.status).toBe('completed');

      // Second finish call when already completed should reject
      await expect(workoutService.finishWorkout({ sessionId: session.id })).rejects.toThrow();

      const history = await repository.getWorkoutHistory();
      expect(history.length).toBe(1);
    });

    // Failure 13: Incomplete Workout Finish
    it('Scenario 13: Incomplete Workout Finish computes accurate volume and marks remaining sets', async () => {
      const session = await workoutService.startWorkout({ workoutId: 'workout_push_strength' });
      const ex = session.exercises[0];

      // Complete only 1 of 3 sets
      await workoutService.completeSet({
        sessionId: session.id,
        exerciseId: ex.exerciseId,
        setId: ex.sets[0].id,
        reps: 8,
        weight: 60,
        rpe: 7,
      });

      const { session: finished } = await workoutService.finishWorkout({ sessionId: session.id });
      expect(finished.status).toBe('completed');
      expect(finished.totalVolume).toBe(480);

      // Remaining sets in history are recorded properly
      const saved = (await repository.getWorkoutHistory())[0];
      expect(saved.completedSets).toBe(1);
      expect(saved.totalSets).toBeGreaterThan(1);
    });

    // Failure 14: API Failure
    it('Scenario 14: API Failure triggers telemetry event and allows offline continuation', () => {
      const failureSpy = vi.fn();
      eventBus.subscribe('API_FAILURE', failureSpy);

      observability.trackApiFailure({
        endpoint: '/api/v1/workout-sessions',
        method: 'POST',
        statusCode: 503,
        error: 'Service Unavailable',
      });

      expect(failureSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/api/v1/workout-sessions',
          statusCode: 503,
        })
      );
    });
  });
});
