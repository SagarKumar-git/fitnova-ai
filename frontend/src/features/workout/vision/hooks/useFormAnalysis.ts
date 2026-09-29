/**
 * FitNova AI — useFormAnalysis Hook
 * React hook connecting live camera frame capture with FormAnalysisService.
 * Handles camera lifecycle, permission states, and real-time form scoring.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useEventBus, useAnalytics } from '../../../../platform/container/PlatformContext.tsx';
import { FormAnalysisService } from '../services/FormAnalysisService.ts';
import { MockVisionProvider } from '../providers/MockVisionProvider.ts';
import type { FormAssessment } from '../models/FormAssessment.ts';
import type { VisionCameraPermissionStatus } from '../providers/VisionProvider.ts';

export interface UseFormAnalysisOptions {
  exerciseId?: string;
  exerciseName?: string;
  autoStart?: boolean;
}

export function useFormAnalysis(options: UseFormAnalysisOptions = {}) {
  const { exerciseId = 'ex_squat', exerciseName = 'Barbell Back Squat', autoStart = false } = options;

  const eventBus = useEventBus();
  const analytics = useAnalytics();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const provider = useMemo(() => new MockVisionProvider(), []);
  const service = useMemo(
    () =>
      new FormAnalysisService({
        provider,
        eventBus,
        analytics,
        debounceMs: 500,
      }),
    [provider, eventBus, analytics]
  );

  const [permissionStatus, setPermissionStatus] =
    useState<VisionCameraPermissionStatus>('permission_required');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [assessment, setAssessment] = useState<FormAssessment | null>(null);

  // Sync exercise name with service
  useEffect(() => {
    service.setCurrentExercise(exerciseId, exerciseName);
  }, [service, exerciseId, exerciseName]);

  const startAnalysis = useCallback(async () => {
    try {
      const status = await provider.getPermissionStatus();
      if (status === 'denied' || status === 'unavailable') {
        setPermissionStatus(status);
        return;
      }

      await service.startAnalysis(videoRef.current || undefined);
      setIsAnalyzing(true);
      setPermissionStatus('analyzing');
    } catch {
      setPermissionStatus('unavailable');
      setIsAnalyzing(false);
    }
  }, [service, provider]);

  const stopAnalysis = useCallback(async () => {
    try {
      await service.stopAnalysis();
    } finally {
      setIsAnalyzing(false);
      setPermissionStatus('granted');
    }
  }, [service]);

  const toggleAnalysis = useCallback(async () => {
    if (isAnalyzing) {
      await stopAnalysis();
    } else {
      await startAnalysis();
    }
  }, [isAnalyzing, startAnalysis, stopAnalysis]);

  useEffect(() => {
    if (autoStart) {
      startAnalysis();
    }

    const unsubUpdated = eventBus.subscribe('FORM_ANALYSIS_UPDATED', (payload) => {
      const latest = service.getLatestAssessment();
      if (latest && latest.exerciseId === payload.exerciseId) {
        setAssessment(latest);
      }
    });

    return () => {
      unsubUpdated();
      if (isAnalyzing) {
        service.stopAnalysis();
      }
    };
  }, [autoStart, startAnalysis, eventBus, service, isAnalyzing]);

  return {
    videoRef,
    isAnalyzing,
    permissionStatus,
    assessment,
    startAnalysis,
    stopAnalysis,
    toggleAnalysis,
    service,
    provider,
  };
}
