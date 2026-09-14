/**
 * FitNova AI — WorkoutService Integration & Platform Wiring Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkoutService } from '../services/WorkoutService.ts';
import { MockWorkoutRepository } from '../repositories/MockWorkoutRepository.ts';
import { EventBus } from '../../../platform/events/EventBus.ts';
import { AnalyticsService } from '../../../platform/analytics/AnalyticsService.ts';
import { NotificationService } from '../../../platform/notifications/NotificationService.ts';
import { TelemetryService } from '../../../platform/telemetry/TelemetryService.ts';
import { StorageService } from '../../../platform/storage/StorageService.ts';
import { MemoryStorageAdapter } from '../../../platform/storage/MemoryStorageAdapter.ts';
import { ValidationError } from '../../../platform/errors/index.ts';

describe('Workout OS — WorkoutService Orchestration', () => {
  let repository: MockWorkoutRepository;
  let eventBus: EventBus;
  let analytics: AnalyticsService;
  let notifications: NotificationService;
  let telemetry: TelemetryService;
  let storage: StorageService;
  let service: WorkoutService;

  beforeEach(() => {
    storage = new StorageService({ adapter: new MemoryStorageAdapter() });
    repository = new MockWorkoutRepository({ storageService: storage });
    eventBus = new EventBus();
    analytics = new AnalyticsService({ enabled: true });
    notifications = new NotificationService();
    telemetry = new TelemetryService({ enabled: true });

    service = new WorkoutService({
      repository,
      eventBus,
      analytics,
      notifications,
      telemetry,
    });
  });

  it('starts a workout session and emits WORKOUT_STARTED to EventBus', async () => {
    const startedSpy = vi.fn();
    eventBus.subscribe('WORKOUT_STARTED', startedSpy);

    const session = await service.startWorkout({
      workoutId: 'workout_push_strength',
      notes: 'Morning push session',
    });

    expect(session.status).toBe('active');
    expect(session.workoutName).toBe('Push Strength Routine');
    expect(session.exercises.length).toBeGreaterThan(0);
    expect(startedSpy).toHaveBeenCalledTimes(1);
    expect(startedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        workoutId: 'workout_push_strength',
        sessionId: session.id,
      })
    );

    // Active session stored in repository
    const active = await service.getActiveSession();
    expect(active?.id).toBe(session.id);
  });

  it('prevents starting a second workout when an active session is in progress', async () => {
    await service.startWorkout({ workoutId: 'workout_push_strength' });

    await expect(
      service.startWorkout({ workoutId: 'workout_pull_hypertrophy' })
    ).rejects.toThrow(ValidationError);
  });

  it('handles pause and resume transitions and accumulates paused duration', async () => {
    const pausedSpy = vi.fn();
    const resumedSpy = vi.fn();
    eventBus.subscribe('WORKOUT_PAUSED', pausedSpy);
    eventBus.subscribe('WORKOUT_RESUMED', resumedSpy);

    const session = await service.startWorkout({ workoutId: 'workout_push_strength' });

    // Pause
    const paused = await service.pauseWorkout(session.id);
    expect(paused.status).toBe('paused');
    expect(paused.lastPausedAt).toBeDefined();
    expect(pausedSpy).toHaveBeenCalledTimes(1);

    // Resume
    const resumed = await service.resumeWorkout(session.id);
    expect(resumed.status).toBe('active');
    expect(resumed.lastPausedAt).toBeUndefined();
    expect(resumedSpy).toHaveBeenCalledTimes(1);
  });

  it('completes sets, updates total volume, detects PRs, and emits SET_COMPLETED', async () => {
    const setCompletedSpy = vi.fn();
    const prSpy = vi.fn();
    eventBus.subscribe('SET_COMPLETED', setCompletedSpy);
    eventBus.subscribe('PERSONAL_RECORD_ACHIEVED', prSpy);

    const session = await service.startWorkout({ workoutId: 'workout_push_strength' });
    const firstExercise = session.exercises[0];
    const firstSet = firstExercise.sets[0];

    // Log set with high weight (120kg x 5 reps -> 1RM ~ 140kg, exceeding baseline 93.3kg PR)
    const { session: updatedSession, set, newPRs } = await service.completeSet({
      sessionId: session.id,
      exerciseId: firstExercise.exerciseId,
      setId: firstSet.id,
      reps: 5,
      weight: 120,
      rpe: 9,
    });

    expect(set.completed).toBe(true);
    expect(set.actualReps).toBe(5);
    expect(set.actualWeight).toBe(120);
    expect(updatedSession.totalVolume).toBe(600); // 120 * 5 = 600

    expect(setCompletedSpy).toHaveBeenCalledTimes(1);
    expect(setCompletedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        exerciseId: firstExercise.exerciseId,
        reps: 5,
        weight: 120,
      })
    );

    // New PR detected and emitted
    expect(newPRs.length).toBeGreaterThan(0);
    expect(prSpy).toHaveBeenCalled();
  });

  it('finishes workout session, clears active storage, saves history, and emits WORKOUT_COMPLETED', async () => {
    const completedSpy = vi.fn();
    eventBus.subscribe('WORKOUT_COMPLETED', completedSpy);

    const session = await service.startWorkout({ workoutId: 'workout_push_strength' });

    // Log one set
    const firstExercise = session.exercises[0];
    await service.completeSet({
      sessionId: session.id,
      exerciseId: firstExercise.exerciseId,
      setId: firstExercise.sets[0].id,
      reps: 5,
      weight: 80,
    });

    const { session: finishedSession, historyEntry } = await service.finishWorkout({
      sessionId: session.id,
      notes: 'Crushed it!',
      rating: 5,
    });

    expect(finishedSession.status).toBe('completed');
    expect(finishedSession.endedAt).toBeDefined();
    expect(historyEntry).toBeDefined();
    expect(historyEntry.totalVolume).toBe(400);

    // Active session cleared
    expect(await service.getActiveSession()).toBeNull();

    // EventBus emission
    expect(completedSpy).toHaveBeenCalledTimes(1);
    expect(completedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        workoutId: 'workout_push_strength',
        sessionId: session.id,
      })
    );
  });

  it('cancels active workout session and emits WORKOUT_CANCELLED', async () => {
    const cancelledSpy = vi.fn();
    eventBus.subscribe('WORKOUT_CANCELLED', cancelledSpy);

    const session = await service.startWorkout({ workoutId: 'workout_push_strength' });
    await service.cancelWorkout({ sessionId: session.id, reason: 'Had an emergency' });

    expect(await service.getActiveSession()).toBeNull();
    expect(cancelledSpy).toHaveBeenCalledTimes(1);
    expect(cancelledSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        workoutId: 'workout_push_strength',
        sessionId: session.id,
        reason: 'Had an emergency',
      })
    );
  });

  it('ensures completed sets survive reload / offline conditions', async () => {
    // 1. Start workout and complete a set
    const session = await service.startWorkout({ workoutId: 'workout_push_strength' });
    const firstEx = session.exercises[0];
    const firstSet = firstEx.sets[0];

    await service.completeSet({
      sessionId: session.id,
      exerciseId: firstEx.exerciseId,
      setId: firstSet.id,
      reps: 8,
      weight: 80,
    });

    // 2. Simulate complete browser restart by creating a new repository and service instance with same storage
    const reloadedRepo = new MockWorkoutRepository({ storageService: storage });
    const reloadedService = new WorkoutService({ repository: reloadedRepo });

    const activeSession = await reloadedService.getActiveSession();
    expect(activeSession).not.toBeNull();
    expect(activeSession?.id).toBe(session.id);

    const reloadedFirstEx = activeSession?.exercises.find((e) => e.exerciseId === firstEx.exerciseId);
    const reloadedSet = reloadedFirstEx?.sets.find((s) => s.id === firstSet.id);

    expect(reloadedSet?.completed).toBe(true);
    expect(reloadedSet?.actualReps).toBe(8);
    expect(reloadedSet?.actualWeight).toBe(80);
    expect(activeSession?.totalVolume).toBe(640);
  });
});
