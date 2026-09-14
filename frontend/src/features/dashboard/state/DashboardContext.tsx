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

    const unsubWorkout = eventBus.subscribe('WORKOUT_COMPLETED', () => {
      refresh();
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

    return () => {
      unsubWater();
      unsubMeal();
      unsubWorkoutStarted();
      unsubWorkout();
      unsubPR();
      unsubProfile();
      unsubOnline();
      unsubSync();
    };
  }, [eventBus, refresh]);

  return (
    <DashboardContext.Provider value={{ data, intelligence, isLoading, error, refresh }}>
      {children}
    </DashboardContext.Provider>
  );
};
