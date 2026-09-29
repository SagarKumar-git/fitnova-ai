/**
 * FitNova AI — useRecoveryMetrics Hook
 * React hook exposing composite recovery score, readiness state, and intensity recommendations.
 */

import { useState, useEffect, useMemo } from 'react';
import { useStorage, useEventBus, useAnalytics } from '../../../platform/container/PlatformContext.tsx';
import { HealthRepository } from '../repositories/HealthRepository.ts';
import { HealthDataService } from '../services/HealthDataService.ts';
import type { RecoveryMetrics } from '../models/RecoveryMetrics.ts';

export function useRecoveryMetrics() {
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

  const [metrics, setMetrics] = useState<RecoveryMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    service
      .getLatestRecoveryMetrics()
      .then((m) => {
        if (mounted) {
          setMetrics(m);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });

    const unsubscribe = eventBus.subscribe('RECOVERY_SCORE_UPDATED', () => {
      service.getLatestRecoveryMetrics().then((m) => {
        if (mounted) setMetrics(m);
      });
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [service, eventBus]);

  return {
    metrics,
    isLoading,
  };
}
