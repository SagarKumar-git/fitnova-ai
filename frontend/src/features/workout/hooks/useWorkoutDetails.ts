/**
 * FitNova AI — useWorkoutDetails Hook
 * Fetches an individual workout routine by ID.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Workout } from '../models/Workout.ts';
import { useWorkout } from '../state/WorkoutContext.tsx';

export interface UseWorkoutDetailsResult {
  workout: Workout | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useWorkoutDetails(id: string | null | undefined): UseWorkoutDetailsResult {
  const { service } = useWorkout();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!id) {
      setWorkout(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await service.getWorkoutDetails(id);
      setWorkout(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [service, id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return { workout, isLoading, error, refetch: fetchDetails };
}
