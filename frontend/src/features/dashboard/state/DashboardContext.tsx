import * as React from 'react';
import type { DashboardData } from '../types';
import { MockDashboardService } from '../services/MockDashboardService';
import { DashboardIntelligenceEngine } from '../intelligence/DashboardIntelligenceEngine';
import type { DashboardIntelligence } from '../intelligence/types';
import { useEventBus } from '../../../platform/container/PlatformContext.tsx';

interface DashboardContextState {
  data: DashboardData | null;
  intelligence: DashboardIntelligence | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export const DashboardContext = React.createContext<DashboardContextState | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [intelligence, setIntelligence] = React.useState<DashboardIntelligence | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const service = React.useMemo(() => new MockDashboardService(), []);
  const intelligenceEngine = React.useMemo(() => new DashboardIntelligenceEngine(), []);
  const eventBus = useEventBus();

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await service.getDashboardData();
      const intel = intelligenceEngine.getIntelligence();
      setData(result);
      setIntelligence(intel);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [service, intelligenceEngine]);

  // Initial fetch
  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // Reactive subscription to EventBus for automated data recalculation
  React.useEffect(() => {
    const unsubWater = eventBus.subscribe('WATER_LOGGED', () => {
      refresh();
    });

    const unsubMeal = eventBus.subscribe('MEAL_LOGGED', () => {
      refresh();
    });

    const unsubWorkoutStarted = eventBus.subscribe('WORKOUT_STARTED', () => {
      refresh();
    });

    const unsubWorkout = eventBus.subscribe('WORKOUT_COMPLETED', (payload) => {
      setData((prev) => {
        if (!prev) return prev;
        const currentStats = prev.workoutStats || {
          weeklyVolumeKg: 12500,
          workoutStreak: 3,
          totalWorkouts: 14,
          personalRecordsCount: 4,
          muscleDistribution: { Chest: 35, Back: 25, Legs: 25, Shoulders: 15 },
        };

        const newVolume = currentStats.weeklyVolumeKg + (payload.totalVolume || 0);
        const newStreak = currentStats.workoutStreak + 1;
        const newPrCount = currentStats.personalRecordsCount + (payload.personalRecordsCount || 0);

        // Update muscle distribution dynamically
        const workoutNameLower = (payload.workoutName || '').toLowerCase();
        const updatedDistribution = { ...currentStats.muscleDistribution };
        if (workoutNameLower.includes('push') || workoutNameLower.includes('chest')) {
          updatedDistribution['Chest'] = (updatedDistribution['Chest'] || 0) + 15;
          updatedDistribution['Shoulders'] = (updatedDistribution['Shoulders'] || 0) + 10;
        } else if (workoutNameLower.includes('pull') || workoutNameLower.includes('back')) {
          updatedDistribution['Back'] = (updatedDistribution['Back'] || 0) + 20;
        } else if (workoutNameLower.includes('leg') || workoutNameLower.includes('squat')) {
          updatedDistribution['Legs'] = (updatedDistribution['Legs'] || 0) + 25;
        }

        // Post-workout readiness adjustment: drops temporarily due to immediate fatigue
        const newReadiness = Math.max(55, Math.min(100, Math.round(prev.user.readiness - 14)));
        const newRecovery = 'Active Recovery (Post-Workout)';

        // Update Nova insight
        const newNovaInsight = `Excellent effort! You moved ${Math.round(payload.totalVolume)}kg total volume in ${payload.workoutName || 'your workout'}. Recovery protocols initiated: hydrate and target 30g protein.`;

        // Update mission tasks
        const updatedTasks = prev.mission.tasks.map((task) =>
          task.toLowerCase().includes('workout') ? `✓ ${task} (Completed)` : task
        );

        const newConsistencyScore = Math.min(100, Math.max(50, Math.round(newStreak * 12 + 50)));

        return {
          ...prev,
          user: {
            ...prev.user,
            readiness: newReadiness,
            recovery: newRecovery,
          },
          nova: {
            ...prev.nova,
            insight: newNovaInsight,
            energy: 'Recovering',
          },
          mission: {
            ...prev.mission,
            tasks: updatedTasks,
          },
          workoutStats: {
            weeklyVolumeKg: newVolume,
            workoutStreak: newStreak,
            totalWorkouts: currentStats.totalWorkouts + 1,
            personalRecordsCount: newPrCount,
            muscleDistribution: updatedDistribution,
            lastWorkoutCompletedAt: payload.timestamp,
            consistencyScore: newConsistencyScore,
          },
          upcoming: prev.upcoming.filter((u) => u.type !== 'workout'),
        };
      });
    });

    const unsubPR = eventBus.subscribe('PERSONAL_RECORD_ACHIEVED', () => {
      refresh();
    });

    const unsubProfile = eventBus.subscribe('PROFILE_UPDATED', () => {
      refresh();
    });

    const unsubOnline = eventBus.subscribe('NETWORK_ONLINE', () => {
      refresh();
    });

    const unsubSync = eventBus.subscribe('SYNC_COMPLETED', () => {
      refresh();
    });

    const unsubRecovery = eventBus.subscribe('RECOVERY_SCORE_UPDATED', (payload) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          user: {
            ...prev.user,
            readiness: payload.recoveryScore,
            recovery: payload.readinessState.replace('_', ' '),
          },
          nova: {
            ...prev.nova,
            insight: `Physiological readiness is ${payload.recoveryScore}/100. ${
              payload.recommendedIntensity === 'full'
                ? 'Prime day for heavy compound progression.'
                : 'Consider scaling volume to optimize muscular adaptation.'
            }`,
          },
        };
      });
    });

    const unsubHealth = eventBus.subscribe('HEALTH_DATA_UPDATED', () => {
      refresh();
    });

    return () => {
      unsubWater();
      unsubMeal();
      unsubWorkoutStarted();
      unsubWorkout();
      unsubPR();
      unsubProfile();
      unsubOnline();
      unsubSync();
      unsubRecovery();
      unsubHealth();
    };
  }, [eventBus, refresh]);

  return (
    <DashboardContext.Provider value={{ data, intelligence, isLoading, error, refresh }}>
      {children}
    </DashboardContext.Provider>
  );
};
