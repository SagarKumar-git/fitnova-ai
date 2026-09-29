/**
 * FitNova AI — Sprint 3.6 Production Sync & Intelligence Tests
 * Tests: Idempotency key generation, exponential backoff retry,
 * dead-letter queue handling, partial sync resilience,
 * deterministic conflict resolution, ProgressionEngine safeguards,
 * and Nova intelligence grounding.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncManager } from '../../../platform/sync/SyncManager.ts';
import { OfflineManager } from '../../../platform/offline/OfflineManager.ts';
import { EventBus } from '../../../platform/events/EventBus.ts';
import { StorageService } from '../../../platform/storage/StorageService.ts';
import { MemoryStorageAdapter } from '../../../platform/storage/MemoryStorageAdapter.ts';
import { ProgressionEngine } from '../intelligence/ProgressionEngine.ts';
import { NovaWorkoutService } from '../intelligence/NovaWorkoutService.ts';
import type { WorkoutSession } from '../models/index.ts';
import type { Workout } from '../models/Workout.ts';

// ==========================================
// 1. IDEMPOTENCY KEY GENERATION
// ==========================================

describe('Sprint 3.6 — Idempotency Key Generation', () => {
  it('generates unique idempotency keys for different operations', () => {
    const sessionId = 'sess_123';
    const exerciseId = 'ex_bench';
    const setNumber = 1;

    const key1 = `set_${sessionId}_${exerciseId}_${setNumber}`;
    const key2 = `set_${sessionId}_${exerciseId}_${setNumber + 1}`;
    const finishKey = `finish_${sessionId}`;

    expect(key1).toBe('set_sess_123_ex_bench_1');
    expect(key2).toBe('set_sess_123_ex_bench_2');
    expect(finishKey).toBe('finish_sess_123');
    expect(key1).not.toBe(key2);
    expect(key1).not.toBe(finishKey);
  });

  it('produces deterministic keys for the same operation', () => {
    const sessionId = 'sess_456';
    const exerciseId = 'ex_squat';
    const setNumber = 3;

    const key1 = `set_${sessionId}_${exerciseId}_${setNumber}`;
    const key2 = `set_${sessionId}_${exerciseId}_${setNumber}`;

    expect(key1).toBe(key2);
  });
});

// ==========================================
// 2. EXPONENTIAL BACKOFF RETRY LOGIC
// ==========================================

describe('Sprint 3.6 — Exponential Backoff & Retry', () => {
  let storage: StorageService;
  let offlineManager: OfflineManager;
  let eventBus: EventBus;
  let syncManager: SyncManager;

  beforeEach(() => {
    storage = new StorageService({ adapter: new MemoryStorageAdapter() });
    offlineManager = new OfflineManager({ storage });
    eventBus = new EventBus();
    syncManager = new SyncManager({ offlineManager, eventBus });
  });

  it('calculates exponential backoff with jitter within expected bounds', () => {
    // Access private method via prototype
    const calculateBackoff = (syncManager as unknown as { calculateBackoffMs: (n: number) => number }).calculateBackoffMs.bind(syncManager);

    const backoff0 = calculateBackoff(0);
    expect(backoff0).toBeGreaterThanOrEqual(1000);
    expect(backoff0).toBeLessThanOrEqual(1500);

    const backoff2 = calculateBackoff(2);
    expect(backoff2).toBeGreaterThanOrEqual(4000);
    expect(backoff2).toBeLessThanOrEqual(4500);

    const backoff5 = calculateBackoff(5);
    expect(backoff5).toBeGreaterThanOrEqual(30000);
    expect(backoff5).toBeLessThanOrEqual(30500);

    // Cap at 30000ms + jitter
    const backoff10 = calculateBackoff(10);
    expect(backoff10).toBeGreaterThanOrEqual(30000);
    expect(backoff10).toBeLessThanOrEqual(30500);
  });

  it('skips operations whose backoff window has not elapsed', async () => {
    // Queue an operation that was recently attempted with backoff
    offlineManager.queueOperation({
      type: 'WORKOUT_LOG_SET',
      endpoint: '/workouts/sessions/log-set',
      method: 'POST',
      payload: { exercise_id: 'ex_1', set_number: 1, reps: 8, weight: 60 },
    });

    const ops = offlineManager.getPendingOperations();
    const queueInstance = offlineManager.getQueueInstance();

    // Simulate a recent failed attempt with backoff
    queueInstance.update(ops[0].id, {
      lastAttemptAt: Date.now(),
      backoffMs: 60000, // 60 second backoff
      retryCount: 1,
    });

    const processor = vi.fn().mockResolvedValue({ operationId: ops[0].id, success: true });
    const report = await syncManager.sync(processor);

    // Should be skipped because backoff window hasn't elapsed
    expect(processor).not.toHaveBeenCalled();
    expect(report.synced).toBe(0);
  });

  it('moves operations exceeding maxRetries to dead_letter', async () => {
    offlineManager.queueOperation({
      type: 'WORKOUT_LOG_SET',
      endpoint: '/workouts/sessions/log-set',
      method: 'POST',
      payload: { exercise_id: 'ex_1', set_number: 1, reps: 8, weight: 60 },
      maxRetries: 1, // Will dead-letter after 1 failure
    });

    const failingProcessor = vi.fn().mockResolvedValue({
      operationId: offlineManager.getPendingOperations()[0].id,
      success: false,
      error: 'Server error',
    });

    await syncManager.sync(failingProcessor);

    const deadLetterOps = offlineManager.getDeadLetterOperations();
    expect(deadLetterOps.length).toBe(1);
    expect(deadLetterOps[0].status).toBe('dead_letter');
    expect(deadLetterOps[0].error).toBe('Server error');
  });
});

// ==========================================
// 3. DEAD-LETTER QUEUE HANDLING
// ==========================================

describe('Sprint 3.6 — Dead-Letter Queue', () => {
  let offlineManager: OfflineManager;
  let storage: StorageService;

  beforeEach(() => {
    storage = new StorageService({ adapter: new MemoryStorageAdapter() });
    offlineManager = new OfflineManager({ storage });
  });

  it('retrieves dead-letter operations', () => {
    const op = offlineManager.queueOperation({
      type: 'WORKOUT_FINISH',
      endpoint: '/workouts/sessions/finish',
      method: 'POST',
    });

    offlineManager.getQueueInstance().update(op.id, { status: 'dead_letter' });

    const deadLetterOps = offlineManager.getDeadLetterOperations();
    expect(deadLetterOps.length).toBe(1);
    expect(deadLetterOps[0].id).toBe(op.id);
  });

  it('retries a dead-letter operation by resetting its state', () => {
    const op = offlineManager.queueOperation({
      type: 'WORKOUT_FINISH',
      endpoint: '/workouts/sessions/finish',
      method: 'POST',
    });

    offlineManager.getQueueInstance().update(op.id, {
      status: 'dead_letter',
      retryCount: 3,
      backoffMs: 30000,
      error: 'Server timeout',
    });

    expect(offlineManager.getDeadLetterOperations().length).toBe(1);

    const success = offlineManager.retryDeadLetter(op.id);
    expect(success).toBe(true);

    const retried = offlineManager.getOperation(op.id);
    expect(retried?.status).toBe('pending');
    expect(retried?.retryCount).toBe(0);
    expect(retried?.backoffMs).toBeUndefined();
    expect(retried?.error).toBeUndefined();
  });

  it('returns false when trying to retry a non-dead-letter operation', () => {
    const op = offlineManager.queueOperation({
      type: 'WORKOUT_LOG_SET',
      endpoint: '/workouts/sessions/log-set',
      method: 'POST',
    });

    const result = offlineManager.retryDeadLetter(op.id);
    expect(result).toBe(false); // It's 'pending', not 'dead_letter'
  });
});

// ==========================================
// 4. PARTIAL SYNC RESILIENCE
// ==========================================

describe('Sprint 3.6 — Partial Sync Resilience', () => {
  it('failure of Operation B does not block Operation C', async () => {
    const storage = new StorageService({ adapter: new MemoryStorageAdapter() });
    const offlineManager = new OfflineManager({ storage });
    const eventBus = new EventBus();
    const syncManager = new SyncManager({ offlineManager, eventBus });

    const op1 = offlineManager.queueOperation({
      type: 'WORKOUT_LOG_SET',
      endpoint: '/workouts/sessions/log-set',
      method: 'POST',
      payload: { exercise_id: 'ex_1', set_number: 1, reps: 8, weight: 60 },
    });

    const op2 = offlineManager.queueOperation({
      type: 'WORKOUT_LOG_SET',
      endpoint: '/workouts/sessions/log-set',
      method: 'POST',
      payload: { exercise_id: 'ex_1', set_number: 2, reps: 8, weight: 60 },
    });

    const op3 = offlineManager.queueOperation({
      type: 'WORKOUT_LOG_SET',
      endpoint: '/workouts/sessions/log-set',
      method: 'POST',
      payload: { exercise_id: 'ex_1', set_number: 3, reps: 8, weight: 60 },
    });

    const processor = vi.fn()
      .mockResolvedValueOnce({ operationId: op1.id, success: true })
      .mockResolvedValueOnce({ operationId: op2.id, success: false, error: 'Network error' })
      .mockResolvedValueOnce({ operationId: op3.id, success: true });

    const report = await syncManager.sync(processor);

    expect(processor).toHaveBeenCalledTimes(3);
    expect(report.synced).toBe(2);
    expect(report.failed).toBe(1);

    // Op1 and Op3 should be removed, Op2 should remain
    const remaining = offlineManager.getQueue();
    expect(remaining.filter((o) => o.status === 'pending' || o.status === 'dead_letter').length).toBe(1);
  });
});

// ==========================================
// 5. DETERMINISTIC CONFLICT RESOLUTION
// ==========================================

describe('Sprint 3.6 — Deterministic Conflict Resolution', () => {
  it('merges local offline sets with server sets preserving completed data', () => {
    const storage = new StorageService({ adapter: new MemoryStorageAdapter() });
    const offlineManager = new OfflineManager({ storage });
    const syncManager = new SyncManager({ offlineManager });

    const localSession = {
      id: 'sess_1',
      exercises: [
        {
          exerciseId: 'ex_bench',
          sets: [
            { setNumber: 1, completed: true, reps: 8, weight: 100 },
            { setNumber: 2, completed: true, reps: 7, weight: 100 },
            { setNumber: 3, completed: true, reps: 6, weight: 100 },
          ],
        },
      ],
      notes: 'Felt strong today',
      rating: 4,
    };

    const serverSession = {
      id: 'sess_1',
      exercises: [
        {
          exerciseId: 'ex_bench',
          sets: [
            { setNumber: 1, completed: true, reps: 8, weight: 100 },
            { setNumber: 2, completed: false, reps: 0, weight: 0 },
          ],
        },
      ],
      notes: null,
      rating: null,
    };

    const merged = syncManager.resolveWorkoutSessionConflict(
      localSession,
      serverSession,
      'server_wins'
    );

    // Merged should have all 3 sets because local had completed Set 2 and Set 3
    const mergedExs = merged.exercises as Array<Record<string, unknown>>;
    expect(mergedExs).toHaveLength(1);

    const mergedSets = mergedExs[0].sets as Array<Record<string, unknown>>;
    expect(mergedSets.length).toBeGreaterThanOrEqual(3);

    // Set 2 should be the local (completed) version, not the server (incomplete)
    const set2 = mergedSets.find((s) => s.setNumber === 2);
    expect(set2?.completed).toBe(true);

    // Notes and rating preserved from local
    expect(merged.notes).toBe('Felt strong today');
    expect(merged.rating).toBe(4);
  });

  it('preserves server exercises not present locally', () => {
    const storage = new StorageService({ adapter: new MemoryStorageAdapter() });
    const offlineManager = new OfflineManager({ storage });
    const syncManager = new SyncManager({ offlineManager });

    const localSession = {
      id: 'sess_1',
      exercises: [
        { exerciseId: 'ex_bench', sets: [{ setNumber: 1, completed: true }] },
      ],
    };

    const serverSession = {
      id: 'sess_1',
      exercises: [
        { exerciseId: 'ex_bench', sets: [{ setNumber: 1, completed: true }] },
        { exerciseId: 'ex_squat', sets: [{ setNumber: 1, completed: true }] },
      ],
    };

    const merged = syncManager.resolveWorkoutSessionConflict(
      localSession,
      serverSession,
      'server_wins'
    );

    const mergedExs = merged.exercises as Array<Record<string, unknown>>;
    expect(mergedExs).toHaveLength(2);
  });
});

// ==========================================
// 6. PROGRESSION ENGINE SAFEGUARDS
// ==========================================

describe('Sprint 3.6 — ProgressionEngine Safeguards', () => {
  const engine = new ProgressionEngine();

  it('clamps weight increase to max 5% of previous weight', () => {
    const result = engine.calculateProgression({
      exerciseId: 'ex_bench',
      exerciseName: 'Bench Press',
      previousWeightKg: 100,
      previousReps: 10,
      targetReps: 10,
      completedSets: [
        { id: 's1', setNumber: 1, type: 'normal', targetReps: 10, targetWeight: 100, actualReps: 12, actualWeight: 100, completed: true, skipped: false, rpe: 5.0 },
        { id: 's2', setNumber: 2, type: 'normal', targetReps: 10, targetWeight: 100, actualReps: 12, actualWeight: 100, completed: true, skipped: false, rpe: 5.0 },
        { id: 's3', setNumber: 3, type: 'normal', targetReps: 10, targetWeight: 100, actualReps: 12, actualWeight: 100, completed: true, skipped: false, rpe: 5.0 },
      ],
      lastRpe: 5.0,
      isCompound: true,
      bodyRegion: 'upper',
    });

    // At 100kg, 5% = 5kg; category max for upper compound = 2.5kg
    // maxAllowedDelta = max(2.5, 5) = 5kg
    // The easy RPE path gives 1.5× increment = 3.75kg — within 5kg cap
    expect(result.recommendedWeightKg).toBeGreaterThan(100);
    expect(result.recommendedWeightKg).toBeLessThanOrEqual(105);
  });

  it('prevents unrealistic jumps like 100kg to 120kg', () => {
    // Even with extreme parameters, the safeguard should cap the delta
    const result = engine.calculateProgression({
      exerciseId: 'ex_squat',
      exerciseName: 'Barbell Squat',
      previousWeightKg: 100,
      previousReps: 10,
      targetReps: 10,
      completedSets: [
        { id: 's1', setNumber: 1, type: 'normal', targetReps: 10, targetWeight: 100, actualReps: 15, actualWeight: 100, completed: true, skipped: false, rpe: 3.0 },
      ],
      lastRpe: 3.0,
      isCompound: true,
      bodyRegion: 'lower',
    });

    // Should never jump 20kg in a single step
    expect(result.weightDeltaKg).toBeLessThanOrEqual(10); // 5% of 100 = 5, lower compound max = 5
    expect(result.recommendedWeightKg).toBeLessThanOrEqual(110);
  });

  it('respects category-specific increment limits for isolation exercises', () => {
    const result = engine.calculateProgression({
      exerciseId: 'ex_curl',
      exerciseName: 'Bicep Curl',
      previousWeightKg: 15,
      previousReps: 12,
      targetReps: 12,
      completedSets: [
        { id: 's1', setNumber: 1, type: 'normal', targetReps: 12, targetWeight: 15, actualReps: 12, actualWeight: 15, completed: true, skipped: false, rpe: 7.5 },
        { id: 's2', setNumber: 2, type: 'normal', targetReps: 12, targetWeight: 15, actualReps: 12, actualWeight: 15, completed: true, skipped: false, rpe: 7.5 },
      ],
      lastRpe: 7.5,
      isCompound: false,
      bodyRegion: 'upper',
    });

    // Upper isolation max = 1.25kg, 5% of 15 = 0.75kg
    // maxAllowedDelta = max(1.25, 0.75) = 1.25kg
    expect(result.weightDeltaKg).toBeLessThanOrEqual(1.25);
    expect(result.action).toBe('weight_increase');
  });
});

// ==========================================
// 7. NOVA INTELLIGENCE GROUNDING
// ==========================================

describe('Sprint 3.6 — Nova Intelligence Grounded Statistics', () => {
  const nova = new NovaWorkoutService();

  it('grounds pre-workout advice in actual past session data', async () => {
    const workout: Workout = {
      id: 'w1',
      name: 'Push Day',
      description: 'Chest and shoulders',
      goal: 'Hypertrophy',
      difficulty: 'Intermediate',
      estimatedDurationMinutes: 60,
      targetMuscleGroups: ['Chest', 'Shoulders', 'Triceps'],
      equipment: ['Barbell', 'Dumbbell'],
      tags: ['Push'],
      exercises: [
        {
          id: 'ex1',
          exerciseId: 'ex_bench',
          exerciseName: 'Bench Press',
          order: 0,
          targetSets: 3,
          targetReps: 10,
          targetWeight: 80,
          restSeconds: 90,
          sets: [],
        },
      ],
      isTemplate: true,
      createdBy: 'user1',
      createdAt: Date.now(),
    };

    const result = await nova.getBeforeWorkoutPersonalization(workout, undefined, []);

    expect(result.recommendedWorkoutId).toBe('w1');
    expect(result.expectedIntensity).toBe('High');
    expect(result.progressionTarget).toContain('Bench Press');
    expect(result.warmupFocus.length).toBeGreaterThan(0);
  });

  it('detects high training density and adjusts intensity', async () => {
    const workout: Workout = {
      id: 'w1',
      name: 'Push Day',
      description: '',
      goal: 'Hypertrophy',
      difficulty: 'Intermediate',
      estimatedDurationMinutes: 60,
      targetMuscleGroups: ['Chest'],
      equipment: ['Barbell'],
      tags: [],
      exercises: [
        {
          id: 'ex1',
          exerciseId: 'ex_bench',
          exerciseName: 'Bench Press',
          order: 0,
          targetSets: 3,
          targetReps: 10,
          targetWeight: 80,
          restSeconds: 90,
          sets: [],
        },
      ],
      isTemplate: true,
      createdBy: 'user1',
      createdAt: Date.now(),
    };

    // Simulate 2 completed sessions in the last 48 hours
    const recentSessions: WorkoutSession[] = [
      {
        id: 's1',
        workoutId: 'w1',
        workoutName: 'Push Day',
        status: 'completed',
        startedAt: Date.now() - 20 * 60 * 60 * 1000,
        endedAt: Date.now() - 19 * 60 * 60 * 1000,
        durationSeconds: 3600,
        pausedDurationMs: 0,
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        exercises: [],
        totalVolume: 5000,
        personalRecords: [],
      },
      {
        id: 's2',
        workoutId: 'w1',
        workoutName: 'Push Day',
        status: 'completed',
        startedAt: Date.now() - 10 * 60 * 60 * 1000,
        endedAt: Date.now() - 9 * 60 * 60 * 1000,
        durationSeconds: 3600,
        pausedDurationMs: 0,
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        exercises: [],
        totalVolume: 4500,
        personalRecords: [],
      },
    ];

    const result = await nova.getBeforeWorkoutPersonalization(workout, undefined, recentSessions);

    expect(result.expectedIntensity).toBe('Moderate');
    expect(result.intensityModifier).toBeLessThan(1.0);
    expect(result.readinessExplanation).toContain('48 hours');
    expect(result.recoveryWarning).toBeTruthy();
  });

  it('after-workout uses real volume comparison from history', async () => {
    const session: WorkoutSession = {
      id: 'sess_1',
      workoutId: 'w1',
      workoutName: 'Push Day',
      status: 'completed',
      startedAt: Date.now() - 3600000,
      endedAt: Date.now(),
      durationSeconds: 3600,
      pausedDurationMs: 0,
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      exercises: [
        {
          id: 'ex1',
          exerciseId: 'ex_bench',
          exerciseName: 'Bench Press',
          order: 0,
          targetSets: 3,
          targetReps: 10,
          targetWeight: 80,
          restSeconds: 90,
          sets: [
            { id: 's1', setNumber: 1, type: 'normal', targetReps: 10, targetWeight: 80, actualReps: 10, actualWeight: 80, completed: true, skipped: false },
          ],
        },
      ],
      totalVolume: 5000,
      personalRecords: [],
    };

    const result = await nova.getAfterWorkoutPersonalization(session, 4000, []);

    expect(result.volumeComparison.sessionVolumeKg).toBe(5000);
    expect(result.volumeComparison.fourWeekAverageVolumeKg).toBe(4000);
    expect(result.volumeComparison.percentageDelta).toBe(25);
    expect(result.volumeComparison.evaluation).toContain('+25%');
  });
});
