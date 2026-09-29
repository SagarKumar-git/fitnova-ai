/**
 * FitNova AI — useHealthData Hook
 * React hook providing reactive health dataset, sync status, and manual refresh.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStorage, useEventBus, useAnalytics } from '../../../platform/container/PlatformContext.tsx';
import { HealthRepository } from '../repositories/HealthRepository.ts';
import { HealthDataService } from '../services/HealthDataService.ts';
import type { NormalizedHealthDataset } from '../types/healthContracts.ts';
import type { HealthProviderStatus } from '../types/healthEnums.ts';

export function useHealthData() {
  const storage = useStorage();
  const eventBus = useEventBus();
  const analytics = useAnalytics();

  const repository = useMemo(() => new HealthRepository({ storage }), [storage]);
  const service = useMemo(
    () =>
      new HealthDataService({
        repository,
        eventBus,
        analytics,
      }),
    [repository, eventBus, analytics]
  );

  const [dataset, setDataset] = useState<NormalizedHealthDataset | null>(null);
  const [status, setStatus] = useState<HealthProviderStatus>('syncing');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const sync = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await service.syncHealthData();
      setDataset(data);
      setStatus(data.providerStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync health data');
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  useEffect(() => {
    let mounted = true;

    service
      .getHealthDataset()
      .then((data) => {
        if (mounted) {
          setDataset(data);
          setStatus(data.providerStatus);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Error loading health data');
          setIsLoading(false);
        }
      });

    // Listen to background sync updates
    const unsubscribe = eventBus.subscribe('HEALTH_DATA_UPDATED', () => {
      service.getHealthDataset().then((d) => {
        if (mounted) setDataset(d);
      });
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [service, eventBus]);

  return {
    dataset,
    status,
    isLoading,
    error,
    sync,
    service,
  };
}
