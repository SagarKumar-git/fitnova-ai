/**
 * FitNova AI — useWorkoutHistory Hook
 * Retrieves user's past workout logs and performance progression.
 */

import { useState, useEffect, useCallback } from 'react';
import type { WorkoutHistoryEntry } from '../models/WorkoutHistory.ts';
import type { WorkoutHistoryQuery } from '../types/contracts.ts';
import { useWorkout } from '../state/WorkoutContext.tsx';

export interface UseWorkoutHistoryResult {
  history: WorkoutHistoryEntry[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useWorkoutHistory(query?: WorkoutHistoryQuery): UseWorkoutHistoryResult {
  const { service } = useWorkout();
  const [history, setHistory] = useState<WorkoutHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await service.getWorkoutHistory(query);
      setHistory(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [service, query]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, isLoading, error, refetch: fetchHistory };
}
