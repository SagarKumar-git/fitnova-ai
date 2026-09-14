/**
 * FitNova AI — Workout Service
 * Enterprise-grade orchestrator connecting Domain Rules, Repositories,
 * EventBus, Storage, Analytics, Telemetry, and Notifications.
 * ZERO React/UI code.
 */

import type { IWorkoutRepository } from '../repositories/IWorkoutRepository.ts';
import type {
  Workout,
  Exercise,
  WorkoutSession,
  WorkoutExercise,
  WorkoutSet,
  WorkoutHistoryEntry,
  PersonalRecord,
  WorkoutStats,
  WorkoutRecommendation,
} from '../models/index.ts';
import type {
  ExerciseFilter,
  WorkoutFilter,
  StartSessionParams,
  LogSetParams,
  FinishSessionParams,
  CancelSessionParams,
  WorkoutHistoryQuery,
} from '../types/contracts.ts';
import {
  calculateTotalWorkoutVolume,
  calculateSessionDuration,
  isSetValid,
  detectPersonalRecords,
} from '../utils/workoutRules.ts';
import {
  ValidationError,
} from '../../../platform/errors/index.ts';
import type { EventBus } from '../../../platform/events/EventBus.ts';
import type { AnalyticsService } from '../../../platform/analytics/AnalyticsService.ts';
import type { NotificationService } from '../../../platform/notifications/NotificationService.ts';
import type { TelemetryService } from '../../../platform/telemetry/TelemetryService.ts';
import type { Logger } from '../../../platform/logging/Logger.ts';
import type { OfflineManager } from '../../../platform/offline/OfflineManager.ts';
import type { SyncManager } from '../../../platform/sync/SyncManager.ts';

export interface WorkoutServiceDependencies {
  repository: IWorkoutRepository;
  eventBus?: EventBus;
  analytics?: AnalyticsService;
  notifications?: NotificationService;
  telemetry?: TelemetryService;
  logger?: Logger;
  offlineManager?: OfflineManager;
  syncManager?: SyncManager;
}

export class WorkoutService {
  private readonly repository: IWorkoutRepository;
  private readonly eventBus?: EventBus;
  private readonly analytics?: AnalyticsService;
  private readonly notifications?: NotificationService;
  private readonly telemetry?: TelemetryService;
  private readonly logger?: Logger;
  private readonly offlineManager?: OfflineManager;
  private readonly syncManager?: SyncManager;

  constructor(deps: WorkoutServiceDependencies) {
    this.repository = deps.repository;
    this.eventBus = deps.eventBus;
    this.analytics = deps.analytics;
    this.notifications = deps.notifications;
    this.telemetry = deps.telemetry;
    this.logger = deps.logger;
    this.offlineManager = deps.offlineManager;
    this.syncManager = deps.syncManager;

    if (this.eventBus && this.syncManager && this.offlineManager) {
      this.eventBus.subscribe('NETWORK_ONLINE', async () => {
        if ((this.offlineManager?.getPendingCount() ?? 0) > 0) {
          const report = await this.syncManager?.sync();
          if (report && report.synced > 0) {
            this.notifications?.notify({
              type: 'system',
              title: 'Workout Synchronized',
              message: `${report.synced} offline workout update(s) synced to cloud.`,
              durationMs: 3000,
            });
          }
        }
      });
    }
  }

  // --------------------------------------------------------------------------
  // Catalog & Queries
  // --------------------------------------------------------------------------

  async getWorkouts(filter?: WorkoutFilter): Promise<Workout[]> {
    const start = performance.now();
    try {
      const workouts = await this.repository.getWorkouts(filter);
      this.telemetry?.recordLatency('API_LATENCY', 'WorkoutService', performance.now() - start, {
        operation: 'getWorkouts',
      });
      return workouts;
    } catch (err) {
      this.logger?.error('Failed to get workouts', { error: String(err) });
      throw err;
    }
  }

  async getWorkoutDetails(id: string): Promise<Workout | null> {
    return this.repository.getWorkoutById(id);
  }

  async getExercises(filter?: ExerciseFilter): Promise<Exercise[]> {
    return this.repository.getExercises(filter);
  }

  async getExerciseDetails(id: string): Promise<Exercise | null> {
    return this.repository.getExerciseById(id);
  }

  async getRecommendedWorkouts(): Promise<WorkoutRecommendation[]> {
    return this.repository.getRecommendations();
  }

  async getWorkoutHistory(query?: WorkoutHistoryQuery): Promise<WorkoutHistoryEntry[]> {
    return this.repository.getWorkoutHistory(query);
  }

  async getPersonalRecords(exerciseId?: string): Promise<PersonalRecord[]> {
    return this.repository.getPersonalRecords(exerciseId);
  }

  async getWorkoutStats(): Promise<WorkoutStats> {
    return this.repository.getWorkoutStats();
  }

  async getActiveSession(): Promise<WorkoutSession | null> {
    return this.repository.getActiveSession();
  }

  // --------------------------------------------------------------------------
  // Session Lifecycle
  // --------------------------------------------------------------------------

  async startWorkout(params: StartSessionParams): Promise<WorkoutSession> {
    const workout = await this.repository.getWorkoutById(params.workoutId);
    if (!workout) {
      throw new ValidationError(`Workout with id "${params.workoutId}" not found`);
    }

    const activeSession = await this.repository.getActiveSession();
    if (activeSession && (activeSession.status === 'active' || activeSession.status === 'paused')) {
      throw new ValidationError(
        'An active workout session is already in progress. Please complete or cancel it first.'
      );
    }

    // Deep clone exercises and sets
    const sessionExercises: WorkoutExercise[] = workout.exercises.map((ex, exIdx) => ({
      ...ex,
      sets: ex.sets.map((s, sIdx) => ({
        ...s,
        id: `s_${Date.now()}_${exIdx}_${sIdx}`,
        actualReps: undefined,
        actualWeight: undefined,
        completed: false,
        skipped: false,
      })),
    }));

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newSession: WorkoutSession = {
      id: sessionId,
      workoutId: workout.id,
      workoutName: workout.name,
      status: 'active',
      startedAt: Date.now(),
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      exercises: sessionExercises,
      totalVolume: 0,
      durationSeconds: 0,
      pausedDurationMs: 0,
      personalRecords: [],
      notes: params.notes,
    };

    await this.repository.saveActiveSession(newSession);

    // EventBus emission
    this.eventBus?.emit('WORKOUT_STARTED', {
      workoutId: workout.id,
      sessionId,
      templateId: params.templateId,
      timestamp: newSession.startedAt,
    });

    // Analytics
    this.analytics?.track('WORKOUT_STARTED', {
      workoutId: workout.id,
      workoutName: workout.name,
      exercisesCount: sessionExercises.length,
    });

    // Notification
    this.notifications?.notify({
      type: 'workout',
      title: 'Workout Started',
      message: `Started ${workout.name}. Crush your workout!`,
      durationMs: 3000,
    });

    this.logger?.info('Workout session started', { sessionId, workoutId: workout.id });
    return newSession;
  }

  async pauseWorkout(sessionId: string): Promise<WorkoutSession> {
    const session = await this.requireActiveSession(sessionId);
    if (session.status !== 'active') {
      throw new ValidationError(`Cannot pause workout in "${session.status}" state`);
    }

    session.status = 'paused';
    session.lastPausedAt = Date.now();
    await this.repository.updateWorkoutSession(session);

    this.eventBus?.emit('WORKOUT_PAUSED', {
      workoutId: session.workoutId,
      sessionId,
      timestamp: session.lastPausedAt,
    });

    this.logger?.info('Workout session paused', { sessionId });
    return session;
  }

  async resumeWorkout(sessionId: string): Promise<WorkoutSession> {
    const session = await this.requireActiveSession(sessionId);
    if (session.status !== 'paused') {
      throw new ValidationError(`Cannot resume workout in "${session.status}" state`);
    }

    if (session.lastPausedAt) {
      session.pausedDurationMs += Date.now() - session.lastPausedAt;
      session.lastPausedAt = undefined;
    }

    session.status = 'active';
    await this.repository.updateWorkoutSession(session);

    this.eventBus?.emit('WORKOUT_RESUMED', {
      workoutId: session.workoutId,
      sessionId,
      timestamp: Date.now(),
    });

    this.logger?.info('Workout session resumed', { sessionId });
    return session;
  }

  async completeSet(params: LogSetParams): Promise<{
    session: WorkoutSession;
    set: WorkoutSet;
    newPRs: PersonalRecord[];
  }> {
    const session = await this.requireActiveSession(params.sessionId);
    if (session.status !== 'active') {
      throw new ValidationError(`Cannot log set while workout is "${session.status}"`);
    }

    const exercise = session.exercises.find((e) => e.exerciseId === params.exerciseId);
    if (!exercise) {
      throw new ValidationError(`Exercise "${params.exerciseId}" not found in current session`);
    }

    const set = exercise.sets.find((s) => s.id === params.setId);
    if (!set) {
      throw new ValidationError(`Set "${params.setId}" not found in exercise`);
    }

    if (!isSetValid({ actualReps: params.reps, actualWeight: params.weight, rpe: params.rpe })) {
      throw new ValidationError('Invalid set data: Reps must be 1-150 and weight >= 0kg');
    }

    set.actualReps = params.reps;
    set.actualWeight = params.weight;
    set.rpe = params.rpe;
    if (params.type) set.type = params.type;
    set.completed = true;
    set.completedAt = Date.now();
    set.skipped = false;

    // Recalculate total volume
    session.totalVolume = calculateTotalWorkoutVolume(session.exercises);
    session.durationSeconds = calculateSessionDuration(
      session.startedAt,
      Date.now(),
      session.pausedDurationMs
    );

    // Detect PRs
    const existingPRs = await this.repository.getPersonalRecords();
    const newPRs = detectPersonalRecords(session, existingPRs);

    for (const pr of newPRs) {
      if (!session.personalRecords.some((p) => p.id === pr.id)) {
        session.personalRecords.push(pr);

        this.eventBus?.emit('PERSONAL_RECORD_ACHIEVED', {
          workoutId: session.workoutId,
          sessionId: session.id,
          exerciseId: pr.exerciseId,
          exerciseName: pr.exerciseName,
          metric: pr.metric,
          value: pr.value,
          previousValue: pr.previousValue,
          timestamp: Date.now(),
        });

        this.notifications?.notify({
          type: 'achievement',
          title: 'New Personal Record!',
          message: `${pr.exerciseName}: ${pr.value}kg (${pr.metric.toUpperCase()})`,
          durationMs: 4000,
        });
      }
    }

    try {
      await this.repository.updateWorkoutSession(session);
    } catch {
      this.offlineManager?.queueOperation({
        type: 'WORKOUT_LOG_SET',
        endpoint: '/workouts/sessions/log-set',
        method: 'POST',
        payload: {
          exercise_id: params.exerciseId,
          set_number: set.setNumber,
          reps: params.reps,
          weight: params.weight,
          rpe: params.rpe,
        },
      });
    }

    // Emit SET_COMPLETED
    this.eventBus?.emit('SET_COMPLETED', {
      workoutId: session.workoutId,
      sessionId: session.id,
      exerciseId: params.exerciseId,
      setId: params.setId,
      setNumber: set.setNumber,
      reps: params.reps,
      weight: params.weight,
      rpe: params.rpe,
      timestamp: Date.now(),
    });

    // Check if exercise completed
    const allSetsInExerciseCompleted = exercise.sets.every((s) => s.completed || s.skipped);
    if (allSetsInExerciseCompleted) {
      this.eventBus?.emit('EXERCISE_COMPLETED', {
        workoutId: session.workoutId,
        sessionId: session.id,
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        setsCompleted: exercise.sets.filter((s) => s.completed).length,
        timestamp: Date.now(),
      });
    }

    this.analytics?.track('SET_COMPLETED', {
      workoutId: session.workoutId,
      exerciseId: params.exerciseId,
      reps: params.reps,
      weight: params.weight,
    });

    return { session, set, newPRs };
  }

  async skipSet(sessionId: string, exerciseId: string, setId: string): Promise<WorkoutSession> {
    const session = await this.requireActiveSession(sessionId);
    const exercise = session.exercises.find((e) => e.exerciseId === exerciseId);
    if (!exercise) throw new ValidationError('Exercise not found');
    const set = exercise.sets.find((s) => s.id === setId);
    if (!set) throw new ValidationError('Set not found');

    set.skipped = true;
    set.completed = false;
    await this.repository.updateWorkoutSession(session);
    return session;
  }

  async finishWorkout(params: FinishSessionParams): Promise<{
    session: WorkoutSession;
    historyEntry: WorkoutHistoryEntry;
  }> {
    const session = await this.requireActiveSession(params.sessionId);
    if (session.status !== 'active' && session.status !== 'paused') {
      throw new ValidationError(`Cannot finish workout in "${session.status}" state`);
    }

    session.status = 'completed';
    session.endedAt = Date.now();
    session.durationSeconds = calculateSessionDuration(
      session.startedAt,
      session.endedAt,
      session.pausedDurationMs
    );
    session.totalVolume = calculateTotalWorkoutVolume(session.exercises);
    if (params.notes) session.notes = params.notes;
    if (params.rating) session.rating = params.rating;

    // Save session to history repository
    await this.repository.saveWorkoutSession(session);
    await this.repository.clearActiveSession();

    const totalSets = session.exercises.reduce((sum, e) => sum + e.sets.length, 0);
    const completedSets = session.exercises.reduce(
      (sum, e) => sum + e.sets.filter((s) => s.completed).length,
      0
    );
    const caloriesBurned = Math.round(session.durationSeconds * 0.12);

    // Emit WORKOUT_COMPLETED
    this.eventBus?.emit('WORKOUT_COMPLETED', {
      workoutId: session.workoutId,
      workoutName: session.workoutName,
      sessionId: session.id,
      durationSeconds: session.durationSeconds,
      totalVolume: session.totalVolume,
      totalSets,
      completedSets,
      caloriesBurned,
      personalRecordsCount: session.personalRecords.length,
      timestamp: session.endedAt,
    });

    this.analytics?.track('WORKOUT_COMPLETED', {
      workoutId: session.workoutId,
      durationSeconds: session.durationSeconds,
      totalVolume: session.totalVolume,
      prsCount: session.personalRecords.length,
    });

    this.notifications?.notify({
      type: 'workout',
      title: 'Workout Completed!',
      message: `Completed ${session.workoutName}. Total Volume: ${session.totalVolume} kg. Great job!`,
      durationMs: 4000,
    });

    const [latestHistory] = await this.repository.getWorkoutHistory({ limit: 1 });
    return { session, historyEntry: latestHistory };
  }

  async cancelWorkout(params: CancelSessionParams): Promise<void> {
    const session = await this.repository.getActiveSession();
    if (!session || session.id !== params.sessionId) {
      return;
    }

    session.status = 'cancelled';
    session.endedAt = Date.now();
    await this.repository.clearActiveSession();

    this.eventBus?.emit('WORKOUT_CANCELLED', {
      workoutId: session.workoutId,
      sessionId: session.id,
      reason: params.reason,
      timestamp: session.endedAt,
    });

    this.analytics?.track('WORKOUT_CANCELLED', {
      workoutId: session.workoutId,
      reason: params.reason,
    });

    this.notifications?.notify({
      type: 'info',
      title: 'Workout Cancelled',
      message: `Workout "${session.workoutName}" was cancelled.`,
      durationMs: 2500,
    });

    this.logger?.info('Workout session cancelled', { sessionId: params.sessionId });
  }

  private async requireActiveSession(sessionId: string): Promise<WorkoutSession> {
    const session = await this.repository.getActiveSession();
    if (!session || session.id !== sessionId) {
      throw new ValidationError(`No active session found with id "${sessionId}"`);
    }
    return session;
  }
}
