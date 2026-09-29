/**
 * FitNova AI — Workout Context & Provider
 * React State container providing active workout session management and rest timers.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { WorkoutSession } from '../models/WorkoutSession.ts';
import type { Exercise } from '../models/Exercise.ts';
import { WorkoutService } from '../services/WorkoutService.ts';
import type { IWorkoutRepository } from '../repositories/IWorkoutRepository.ts';
import {
  usePlatform,
  useStorage,
  useEventBus,
  useNotificationService,
  useAnalytics,
  useTelemetry,
} from '../../../platform/container/PlatformContext.tsx';
import { logger } from '../../../utils/logger.ts';

export interface WorkoutContextValue {
  activeSession: WorkoutSession | null;
  isLoading: boolean;
  restSecondsRemaining: number;
  isRestTimerActive: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'pending';
  service: WorkoutService;
  startWorkout: (workoutId: string, notes?: string) => Promise<WorkoutSession>;
  pauseWorkout: () => Promise<void>;
  resumeWorkout: () => Promise<void>;
  completeSet: (
    exerciseId: string,
    setId: string,
    reps: number,
    weight: number,
    rpe?: number
  ) => Promise<void>;
  skipSet: (exerciseId: string, setId: string) => Promise<void>;
  substituteExercise: (
    originalExerciseId: string,
    substituteExercise: Exercise
  ) => Promise<void>;
  finishWorkout: (notes?: string, rating?: number) => Promise<void>;
  cancelWorkout: (reason?: string) => Promise<void>;
  startRestTimer: (seconds: number) => void;
  stopRestTimer: () => void;
  refreshActiveSession: () => Promise<void>;
  syncPendingOperations: () => Promise<number>;
  setCurrentExerciseProgress: (exerciseIndex: number, setIndex?: number) => Promise<void>;
  discardSession: () => Promise<void>;
}

import { createWorkoutRepository } from '../repositories/repositoryFactory.ts';

export const WorkoutContext = createContext<WorkoutContextValue | undefined>(undefined);

export interface WorkoutProviderProps {
  children: ReactNode;
  repository?: IWorkoutRepository;
}

export const WorkoutProvider: React.FC<WorkoutProviderProps> = ({
  children,
  repository: injectedRepository,
}) => {
  const platform = usePlatform();
  const storage = useStorage();
  const eventBus = useEventBus();
  const notifications = useNotificationService();
  const analytics = useAnalytics();
  const telemetry = useTelemetry();

  const repository = useMemo(() => {
    return (
      injectedRepository ??
      createWorkoutRepository({
        apiClient: platform.apiClient,
        storageService: storage,
      })
    );
  }, [injectedRepository, platform.apiClient, storage]);

  const service = useMemo(() => {
    return new WorkoutService({
      repository,
      eventBus,
      analytics,
      notifications,
      telemetry,
      logger: platform.logger ?? logger,
      offlineManager: platform.offline,
      syncManager: platform.sync,
      apiClient: platform.apiClient,
    });
  }, [repository, eventBus, analytics, notifications, telemetry, platform]);

  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState<number>(0);
  const [isRestTimerActive, setIsRestTimerActive] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'pending'>(() => {
    if (platform.offline && !platform.offline.isOnline()) return 'offline';
    if (platform.offline && platform.offline.getPendingCount() > 0) return 'pending';
    return 'synced';
  });

  useEffect(() => {
    const unsubOnline = eventBus.subscribe('NETWORK_ONLINE', async () => {
      const pendingCount = platform.offline?.getPendingCount() ?? 0;
      if (pendingCount > 0) {
        setSyncStatus('syncing');
        setActiveSession((prev) =>
          prev && (prev.status === 'offline' || prev.status === 'syncing')
            ? { ...prev, status: 'syncing' }
            : prev
        );
        try {
          const synced = await service.syncPendingOperations();
          setSyncStatus('synced');
          setActiveSession((prev) => {
            if (!prev) return prev;
            if (prev.status === 'syncing' || prev.status === 'offline') {
              service.setSessionActive(prev.id).catch(() => {});
              return { ...prev, status: 'active' };
            }
            return prev;
          });
          if (synced > 0) {
            notifications.notify({
              type: 'system',
              title: 'Workout Synchronized',
              message: `Successfully synchronized ${synced} offline workout update(s).`,
              durationMs: 3000,
            });
          }
        } catch {
          setSyncStatus(pendingCount > 0 ? 'pending' : 'synced');
          setActiveSession((prev) => {
            if (prev && prev.status === 'syncing') {
              service.setSessionOffline(prev.id).catch(() => {});
              return { ...prev, status: 'offline' };
            }
            return prev;
          });
        }
      } else {
        setSyncStatus('synced');
        setActiveSession((prev) => {
          if (!prev) return prev;
          if (prev.status === 'offline') {
            service.setSessionActive(prev.id).catch(() => {});
            return { ...prev, status: 'active' };
          }
          return prev;
        });
      }
    });

    const unsubOffline = eventBus.subscribe('NETWORK_OFFLINE', () => {
      setSyncStatus('offline');
      setActiveSession((prev) => {
        if (!prev) return prev;
        if (prev.status === 'active' || prev.status === 'syncing' || prev.status === 'recovered') {
          service.setSessionOffline(prev.id).catch(() => {});
          return { ...prev, status: 'offline' };
        }
        return prev;
      });
      notifications.notify({
        type: 'info',
        title: 'Offline Mode',
        message: 'Network offline. All workout sets will continue saving locally on your device.',
        durationMs: 3500,
      });
    });

    const unsubSyncStart = eventBus.subscribe('SYNC_STARTED', () => {
      setSyncStatus('syncing');
    });
    const unsubSyncComplete = eventBus.subscribe('SYNC_COMPLETED', () => {
      setSyncStatus('synced');
    });
    const unsubSyncFail = eventBus.subscribe('SYNC_FAILED', () => {
      setSyncStatus((platform.offline?.getPendingCount() ?? 0) > 0 ? 'pending' : 'synced');
    });

    return () => {
      unsubOnline();
      unsubOffline();
      unsubSyncStart();
      unsubSyncComplete();
      unsubSyncFail();
    };
  }, [eventBus, platform.offline, service, notifications]);

  // Restore active session on mount with recovery verification
  const refreshActiveSession = useCallback(async () => {
    try {
      const session = await service.recoverSession();
      if (session) {
        setActiveSession(session);
        if (session.status === 'recovered') {
          notifications.notify({
            type: 'workout',
            title: 'Workout Session Recovered',
            message: `Restored ${session.workoutName} from device storage. You can continue logging sets or finish your workout.`,
            durationMs: 5000,
          });
        }
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      logger.error('Failed to restore active workout session', { error: String(err) });
      eventBus.emit('WORKOUT_FAILURE', {
        action: 'restore_active_session',
        error: err instanceof Error ? err.message : String(err),
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
    }
  }, [service, notifications]);

  useEffect(() => {
    refreshActiveSession();
  }, [refreshActiveSession]);

  // Rest Timer Interval
  useEffect(() => {
    if (!isRestTimerActive || restSecondsRemaining <= 0) {
      if (restSecondsRemaining <= 0 && isRestTimerActive) {
        setIsRestTimerActive(false);
        notifications.notify({
          type: 'workout',
          title: 'Rest Time Complete',
          message: 'Ready for your next set!',
          durationMs: 3000,
        });
      }
      return;
    }

    const timer = setInterval(() => {
      setRestSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isRestTimerActive, restSecondsRemaining, notifications]);

  // Wall-Clock Elapsed Session Time Interval
  useEffect(() => {
    if (!activeSession) return;
    const isRunning =
      activeSession.status === 'active' ||
      activeSession.status === 'recovered' ||
      activeSession.status === 'offline' ||
      activeSession.status === 'syncing';
    if (!isRunning) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    const startTimer = () => {
      if (interval || (typeof document !== 'undefined' && document.hidden)) return;
      interval = setInterval(() => {
        setActiveSession((prev) => {
          if (!prev) return prev;
          const running =
            prev.status === 'active' ||
            prev.status === 'recovered' ||
            prev.status === 'offline' ||
            prev.status === 'syncing';
          if (!running) return prev;
          const now = Date.now();
          const durationSeconds = Math.max(
            0,
            Math.round((now - prev.startedAt - prev.pausedDurationMs) / 1000)
          );
          if (prev.durationSeconds === durationSeconds) return prev;
          return { ...prev, durationSeconds };
        });
      }, 1000);
    };

    const stopTimer = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    startTimer();

    const handleVisibility = () => {
      if (document.hidden) {
        stopTimer();
      } else {
        startTimer();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      stopTimer();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [activeSession?.status, activeSession?.startedAt, activeSession?.pausedDurationMs]);

  // Tab Visibility & Focus Reconciliation
  useEffect(() => {
    const reconcileDuration = () => {
      setActiveSession((prev) => {
        if (!prev) return prev;
        const running =
          prev.status === 'active' ||
          prev.status === 'recovered' ||
          prev.status === 'offline' ||
          prev.status === 'syncing';
        if (!running) return prev;
        const now = Date.now();
        const durationSeconds = Math.max(
          0,
          Math.round((now - prev.startedAt - prev.pausedDurationMs) / 1000)
        );
        service.persistSessionProgress(prev.id, prev.currentExerciseIndex, prev.currentSetIndex).catch(() => {});
        return { ...prev, durationSeconds };
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (activeSession) {
          service
            .persistSessionProgress(activeSession.id, activeSession.currentExerciseIndex, activeSession.currentSetIndex)
            .catch(() => {});
        }
      } else if (document.visibilityState === 'visible') {
        reconcileDuration();
      }
    };

    const handleFocus = () => {
      reconcileDuration();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [activeSession, service]);

  const startRestTimer = useCallback((seconds: number) => {
    setRestSecondsRemaining(seconds);
    setIsRestTimerActive(true);
  }, []);

  const stopRestTimer = useCallback(() => {
    setIsRestTimerActive(false);
    setRestSecondsRemaining(0);
  }, []);

  const startWorkout = useCallback(
    async (workoutId: string, notes?: string) => {
      try {
        const session = await service.startWorkout({ workoutId, notes });
        setActiveSession(session);
        return session;
      } catch (err) {
        eventBus.emit('WORKOUT_FAILURE', {
          workoutId,
          action: 'start_workout',
          error: err instanceof Error ? err.message : String(err),
          timestamp: Date.now(),
        });
        throw err;
      }
    },
    [service, eventBus]
  );

  const pauseWorkout = useCallback(async () => {
    if (!activeSession) return;
    const updated = await service.pauseWorkout(activeSession.id);
    setActiveSession(updated);
  }, [activeSession, service]);

  const resumeWorkout = useCallback(async () => {
    if (!activeSession) return;
    const updated = await service.resumeWorkout(activeSession.id);
    setActiveSession(updated);
  }, [activeSession, service]);

  const completeSet = useCallback(
    async (
      exerciseId: string,
      setId: string,
      reps: number,
      weight: number,
      rpe?: number
    ) => {
      if (!activeSession) return;
      try {
        const { session } = await service.completeSet({
          sessionId: activeSession.id,
          exerciseId,
          setId,
          reps,
          weight,
          rpe,
        });
        setActiveSession({ ...session });

        // Automatically trigger rest timer from exercise config if available
        const exercise = session.exercises.find((e) => e.exerciseId === exerciseId);
        if (exercise && exercise.restSeconds > 0) {
          startRestTimer(exercise.restSeconds);
        }
      } catch (err) {
        eventBus.emit('WORKOUT_FAILURE', {
          sessionId: activeSession.id,
          workoutId: activeSession.workoutId,
          action: 'complete_set',
          error: err instanceof Error ? err.message : String(err),
          timestamp: Date.now(),
        });
        throw err;
      }
    },
    [activeSession, service, startRestTimer, eventBus]
  );

  const skipSet = useCallback(
    async (exerciseId: string, setId: string) => {
      if (!activeSession) return;
      const updated = await service.skipSet(activeSession.id, exerciseId, setId);
      setActiveSession({ ...updated });
    },
    [activeSession, service]
  );

  const substituteExercise = useCallback(
    async (originalExerciseId: string, substituteExercise: Exercise) => {
      if (!activeSession) return;
      const updated = await service.substituteExercise({
        sessionId: activeSession.id,
        originalExerciseId,
        substituteExercise,
      });
      setActiveSession({ ...updated });
    },
    [activeSession, service]
  );

  const finishWorkout = useCallback(
    async (notes?: string, rating?: number) => {
      if (!activeSession) return;
      try {
        await service.finishWorkout({ sessionId: activeSession.id, notes, rating });
        setActiveSession(null);
        stopRestTimer();
      } catch (err) {
        eventBus.emit('WORKOUT_FAILURE', {
          sessionId: activeSession.id,
          workoutId: activeSession.workoutId,
          action: 'finish_workout',
          error: err instanceof Error ? err.message : String(err),
          timestamp: Date.now(),
        });
        throw err;
      }
    },
    [activeSession, service, stopRestTimer, eventBus]
  );

  const cancelWorkout = useCallback(
    async (reason?: string) => {
      if (!activeSession) return;
      await service.cancelWorkout({ sessionId: activeSession.id, reason });
      setActiveSession(null);
      stopRestTimer();
    },
    [activeSession, service, stopRestTimer]
  );

  const discardSession = useCallback(async () => {
    await service.discardActiveSession();
    setActiveSession(null);
    stopRestTimer();
  }, [service, stopRestTimer]);

  const syncPendingOperations = useCallback(async () => {
    return service.syncPendingOperations();
  }, [service]);

  const setCurrentExerciseProgress = useCallback(
    async (exerciseIndex: number, setIndex?: number) => {
      if (!activeSession) return;
      const updated = await service.persistSessionProgress(activeSession.id, exerciseIndex, setIndex);
      setActiveSession({ ...updated });
    },
    [activeSession, service]
  );

  const value = useMemo<WorkoutContextValue>(
    () => ({
      activeSession,
      isLoading,
      restSecondsRemaining,
      isRestTimerActive,
      syncStatus,
      service,
      startWorkout,
      pauseWorkout,
      resumeWorkout,
      completeSet,
      skipSet,
      substituteExercise,
      finishWorkout,
      cancelWorkout,
      startRestTimer,
      stopRestTimer,
      refreshActiveSession,
      syncPendingOperations,
      setCurrentExerciseProgress,
      discardSession,
    }),
    [
      activeSession,
      isLoading,
      restSecondsRemaining,
      isRestTimerActive,
      syncStatus,
      service,
      startWorkout,
      pauseWorkout,
      resumeWorkout,
      completeSet,
      skipSet,
      substituteExercise,
      finishWorkout,
      cancelWorkout,
      startRestTimer,
      stopRestTimer,
      refreshActiveSession,
      syncPendingOperations,
      setCurrentExerciseProgress,
      discardSession,
    ]
  );

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkout(): WorkoutContextValue {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout must be used within a <WorkoutProvider>');
  }
  return context;
}
