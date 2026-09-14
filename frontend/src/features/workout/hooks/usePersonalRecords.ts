/**
 * FitNova AI — usePersonalRecords Hook
 * Retrieves user personal records across exercises.
 */

import { useState, useEffect, useCallback } from 'react';
import type { PersonalRecord } from '../models/PersonalRecord.ts';
import { useWorkout } from '../state/WorkoutContext.tsx';

export interface UsePersonalRecordsResult {
  personalRecords: PersonalRecord[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePersonalRecords(exerciseId?: string): UsePersonalRecordsResult {
  const { service } = useWorkout();
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPRs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await service.getPersonalRecords(exerciseId);
      setPersonalRecords(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [service, exerciseId]);

  useEffect(() => {
    fetchPRs();
  }, [fetchPRs]);

  return { personalRecords, isLoading, error, refetch: fetchPRs };
}
