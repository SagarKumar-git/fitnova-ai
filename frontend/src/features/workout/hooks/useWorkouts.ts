/**
 * FitNova AI — useWorkouts Hook
 * Retrieves catalog workouts with optional filter, loading, and error states.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Workout } from '../models/Workout.ts';
import type { WorkoutFilter } from '../types/contracts.ts';
import { useWorkout } from '../state/WorkoutContext.tsx';

export interface UseWorkoutsResult {
  workouts: Workout[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useWorkouts(filter?: WorkoutFilter): UseWorkoutsResult {
  const { service } = useWorkout();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWorkouts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await service.getWorkouts(filter);
      setWorkouts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [service, filter]);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  return { workouts, isLoading, error, refetch: fetchWorkouts };
}
