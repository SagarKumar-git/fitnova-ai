import * as React from 'react';
import type { DashboardData } from '../types';
import { MockDashboardService } from '../services/MockDashboardService';

interface DashboardContextState {
  data: DashboardData | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}
export const DashboardContext = React.createContext<DashboardContextState | undefined>(undefined);

export const DashboardProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const service = React.useMemo(() => new MockDashboardService(), []);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await service.getDashboardData();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  React.useEffect(() => { refresh(); }, [refresh]);

  return (
    <DashboardContext.Provider value={{ data, isLoading, error, refresh }}>
      {children}
    </DashboardContext.Provider>
  );
};
