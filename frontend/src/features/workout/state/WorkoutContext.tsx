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
  finishWorkout: (notes?: string, rating?: number) => Promise<void>;
  cancelWorkout: (reason?: string) => Promise<void>;
  startRestTimer: (seconds: number) => void;
  stopRestTimer: () => void;
  refreshActiveSession: () => Promise<void>;
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
    });
  }, [repository, eventBus, analytics, notifications, telemetry, platform]);

  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState<number>(0);
  const [isRestTimerActive, setIsRestTimerActive] = useState<boolean>(false);

  // Restore active session on mount
  const refreshActiveSession = useCallback(async () => {
    try {
      const session = await service.getActiveSession();
      setActiveSession(session);
    } catch (err) {
      logger.error('Failed to restore active workout session', { error: String(err) });
    } finally {
      setIsLoading(false);
    }
  }, [service]);

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

  // Elapsed Session Time Interval
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'active') return;

    const interval = setInterval(() => {
      setActiveSession((prev) => {
        if (!prev || prev.status !== 'active') return prev;
        const now = Date.now();
        const durationSeconds = Math.max(
          0,
          Math.round((now - prev.startedAt - prev.pausedDurationMs) / 1000)
        );
        return { ...prev, durationSeconds };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession?.status, activeSession?.startedAt, activeSession?.pausedDurationMs]);

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
      const session = await service.startWorkout({ workoutId, notes });
      setActiveSession(session);
      return session;
    },
    [service]
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
    },
    [activeSession, service, startRestTimer]
  );

  const skipSet = useCallback(
    async (exerciseId: string, setId: string) => {
      if (!activeSession) return;
      const updated = await service.skipSet(activeSession.id, exerciseId, setId);
      setActiveSession({ ...updated });
    },
    [activeSession, service]
  );

  const finishWorkout = useCallback(
    async (notes?: string, rating?: number) => {
      if (!activeSession) return;
      await service.finishWorkout({ sessionId: activeSession.id, notes, rating });
      setActiveSession(null);
      stopRestTimer();
    },
    [activeSession, service, stopRestTimer]
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

  const value = useMemo<WorkoutContextValue>(
    () => ({
      activeSession,
      isLoading,
      restSecondsRemaining,
      isRestTimerActive,
      service,
      startWorkout,
      pauseWorkout,
      resumeWorkout,
      completeSet,
      skipSet,
      finishWorkout,
      cancelWorkout,
      startRestTimer,
      stopRestTimer,
      refreshActiveSession,
    }),
    [
      activeSession,
      isLoading,
      restSecondsRemaining,
      isRestTimerActive,
      service,
      startWorkout,
      pauseWorkout,
      resumeWorkout,
      completeSet,
      skipSet,
      finishWorkout,
      cancelWorkout,
      startRestTimer,
      stopRestTimer,
      refreshActiveSession,
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
