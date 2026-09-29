/**
 * FitNova AI — Sprint 3.8 useAdaptiveWorkout Hook
 * Reacts to real-time workout events (SET_COMPLETED, FORM_ANALYSIS_UPDATED,
 * FORM_WARNING_DETECTED, RECOVERY_SCORE_UPDATED, PERSONAL_RECORD_ACHIEVED)
 * and generates debounced, prioritized adaptive recommendations.
 * Avoids recommendation spam through cooldown, dedup, and priority queuing.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useEventBus } from '../../../platform/container/PlatformContext.tsx';
import type {
  SetCompletedPayload,
  FormAnalysisUpdatedPayload,
  FormWarningDetectedPayload,
  RecoveryScoreUpdatedPayload,
  PersonalRecordAchievedPayload,
} from '../../../platform/types/events.ts';
import type {
  AdaptiveRecommendationEvent,
  AdaptiveRecommendationPriority,
  AdaptiveRecommendationType,
  AdaptiveTrainingInput,
} from '../intelligence/types/adaptiveTraining.ts';
import { ADAPTIVE_SAFETY_LIMITS } from '../intelligence/types/adaptiveTraining.ts';
import { WorkoutIntelligenceService } from '../intelligence/WorkoutIntelligenceService.ts';
import type { DataFreshnessState } from '../health/healthTypes.ts';
import type { ProviderLifecycleState } from '../health/IHealthProvider.ts';
import type { HeartRateSafetyState, RealtimeSafetySnapshot } from '../intelligence/RealtimeSafetyEngine.ts';
import { StorageService } from '../../../platform/storage/StorageService.ts';
import { WORKOUT_CACHE_POLICIES } from '../cache/WorkoutCachePolicy.ts';

export type AdaptiveSafetyUiState =
  | 'monitoring'
  | 'heart_rate_elevated'
  | 'reduce_intensity'
  | 'stop_and_recover'
  | 'wearable_disconnected'
  | 'biometric_data_stale'
  | 'monitoring_restored';

export interface PersistedSafetyState {
  currentSafetyZone: HeartRateSafetyState;
  activeIntervention?: 'reduce_volume' | 'stop_and_recover';
  interventionTimestamp?: number;
  providerStatus: ProviderLifecycleState;
  freshnessState: DataFreshnessState;
  sessionId: string;
}

export interface UseAdaptiveWorkoutOptions {
  enabled?: boolean;
  cooldownMs?: number;
  sessionId?: string;
}

export interface UseAdaptiveWorkoutReturn {
  currentRecommendation: AdaptiveRecommendationEvent | null;
  recommendationHistory: AdaptiveRecommendationEvent[];
  currentHeartRate: number | null;
  heartRateFreshness: DataFreshnessState;
  providerState: ProviderLifecycleState;
  safetyState: AdaptiveSafetyUiState;
  acceptRecommendation: () => void;
  rejectRecommendation: () => void;
  dismissRecommendation: () => void;
  overrideIntervention: () => void;
}

let recommendationCounter = 0;

export function useAdaptiveWorkout(
  options: UseAdaptiveWorkoutOptions = {}
): UseAdaptiveWorkoutReturn {
  const { enabled = true, cooldownMs = ADAPTIVE_SAFETY_LIMITS.RECOMMENDATION_COOLDOWN_MS, sessionId: propSessionId } = options;
  const eventBus = useEventBus();

  const [currentRecommendation, setCurrentRecommendation] = useState<AdaptiveRecommendationEvent | null>(null);
  const [recommendationHistory, setRecommendationHistory] = useState<AdaptiveRecommendationEvent[]>([]);
  const [currentHeartRate, setCurrentHeartRate] = useState<number | null>(null);
  const [heartRateFreshness, setHeartRateFreshness] = useState<DataFreshnessState>('unavailable');
  const [providerState, setProviderState] = useState<ProviderLifecycleState>('connected');
  const [safetyState, setSafetyState] = useState<AdaptiveSafetyUiState>('monitoring');

  const lastRecommendationTime = useRef<number>(0);
  const lastRecommendationKey = useRef<string>('');
  const formWarningCount = useRef<number>(0);
  const recentFormIssues = useRef<string[]>([]);
  const recentRpeValues = useRef<number[]>([]);
  const latestFormScore = useRef<number>(100);
  const latestRecoveryScore = useRef<number>(100);
  const sessionId = useRef<string>(propSessionId ?? `session_${Date.now()}`);
  
  const intelligenceService = useMemo(() => new WorkoutIntelligenceService(undefined, eventBus, sessionId.current), [eventBus]);
  const storageService = useMemo(() => new StorageService(), []);
  const lastPersistedSafetyRef = useRef<{
    safetyZone: HeartRateSafetyState;
    recommendation?: 'reduce_volume' | 'stop_and_recover';
    providerStatus: ProviderLifecycleState;
    freshness: DataFreshnessState;
    timestamp: number;
  }>({
    safetyZone: 'normal',
    providerStatus: 'connected',
    freshness: 'unavailable',
    timestamp: 0,
  });

  // Restore active safety state on mount
  useEffect(() => {
    const saved = storageService.getJSON<PersistedSafetyState>(WORKOUT_CACHE_POLICIES.ACTIVE_SAFETY_STATE.key);
    if (saved) {
      setHeartRateFreshness(saved.freshnessState);
      setProviderState(saved.providerStatus);
      if (saved.currentSafetyZone === 'critical') {
        setSafetyState('stop_and_recover');
      } else if (saved.currentSafetyZone === 'high') {
        setSafetyState('reduce_intensity');
      } else if (saved.currentSafetyZone === 'elevated') {
        setSafetyState('heart_rate_elevated');
      } else if (saved.providerStatus === 'disconnected' || saved.providerStatus === 'unavailable') {
        setSafetyState('wearable_disconnected');
      } else if (saved.freshnessState === 'stale') {
        setSafetyState('biometric_data_stale');
      } else {
        setSafetyState('monitoring');
      }

      const snapshot: RealtimeSafetySnapshot = {
        currentState: saved.currentSafetyZone,
        consecutiveReadings: 0,
        pendingState: null,
        isCurrentlyEscalated: Boolean(saved.activeIntervention),
      };
      intelligenceService.restoreRealtimeSafetySnapshot(snapshot);
    }
  }, [intelligenceService, storageService]);

  const createRecommendation = useCallback((
    type: AdaptiveRecommendationType,
    priority: AdaptiveRecommendationPriority,
    exerciseId: string,
    exerciseName: string,
    currentValue: number,
    recommendedValue: number,
    unit: 'kg' | 'reps' | 'seconds' | 'sets',
    reason: string,
    confidenceScore: number
  ): AdaptiveRecommendationEvent | null => {
    const now = Date.now();

    // Cooldown check
    if (now - lastRecommendationTime.current < cooldownMs) {
      return null;
    }

    // Duplicate suppression
    const key = `${type}:${exerciseId}:${recommendedValue}`;
    if (key === lastRecommendationKey.current) {
      return null;
    }

    lastRecommendationTime.current = now;
    lastRecommendationKey.current = key;

    return {
      id: `rec_${++recommendationCounter}_${now}`,
      type,
      priority,
      exerciseId,
      exerciseName,
      currentValue,
      recommendedValue,
      unit,
      reason,
      confidenceScore,
      timestamp: now,
      dismissed: false,
      accepted: false,
    };
  }, [cooldownMs]);

  const pushRecommendation = useCallback((rec: AdaptiveRecommendationEvent | null) => {
    if (!rec) return;
    setCurrentRecommendation(rec);
    setRecommendationHistory((prev) => [...prev, rec]);
  }, []);

  // --- Event Handlers ---

  useEffect(() => {
    if (!enabled || !eventBus) return;

    const unsubs: Array<() => void> = [];

    // Helper to evaluate AdaptiveTrainingEngine
    const evaluateAndPush = (exerciseId: string, exerciseName: string, weight: number) => {
      const input: AdaptiveTrainingInput = {
        recoveryScore: latestRecoveryScore.current,
        hrvStatus: 'optimal',
        restingHeartRateDelta: 0,
        sleepQuality: 'optimal', // placeholder, would be from health context
        muscleSoreness: 3,
        systemicFatigue: 3,
        wearableAvailable: true,
        recoveryDataFreshness: { timestamp: Date.now(), ageMs: 0, state: 'fresh' },
        currentTimestamp: Date.now(),
        performance: {
          recentRpeHistory: [...recentRpeValues.current],
          missedRepsCount: 0,
          personalRecordsLast7Days: 0,
          averageCompletionRate: 1.0,
          consecutiveWorkoutDays: 1,
          weeklyWorkoutCount: 3,
          targetWeeklyWorkouts: 4,
        },
        formQuality: {
          averageFormScore: latestFormScore.current,
          recentWarningCount: formWarningCount.current,
          repeatedIssues: [...recentFormIssues.current],
        }
      };

      const decision = intelligenceService.evaluateAdaptiveDecision(input);
           // Rule 2: Stale health data cannot increase workout intensity
      const isHrStale = heartRateFreshness === 'stale' || heartRateFreshness === 'unavailable';
      if (isHrStale && decision.recommendedAction === 'increase_intensity') {
        return;
      }
      const adjustedConfidence = isHrStale ? Math.min(decision.confidenceScore, 0.3) : decision.confidenceScore;

      if (decision.recommendedAction === 'reduce_intensity' || decision.recommendedAction === 'reduce_volume') {
        const type: AdaptiveRecommendationType = decision.recommendedAction === 'reduce_intensity' ? 'reduce_weight' : 'reduce_volume';
        const priority: AdaptiveRecommendationPriority = formWarningCount.current >= 2 ? 'form' : 'recovery';
        const reducedWeight = Math.round(weight * (1 + decision.weightAdjustmentPercent) * 2) / 2;
        
        pushRecommendation(createRecommendation(
          type,
          priority,
          exerciseId,
          exerciseName,
          weight,
          reducedWeight,
          'kg',
          decision.reasons[0] || 'Nova recommends an adjustment based on live performance.',
          adjustedConfidence
        ));
      }
    };

    // SET_COMPLETED → check RPE for overexertion or easy progression
    unsubs.push(
      eventBus.subscribe('SET_COMPLETED', (payload: SetCompletedPayload) => {
        if (payload.rpe !== undefined) {
          recentRpeValues.current.push(payload.rpe);
          if (recentRpeValues.current.length > 6) {
            recentRpeValues.current.shift();
          }

          evaluateAndPush(payload.exerciseId, payload.exerciseId, payload.weight);
        }
      })
    );

    // FORM_ANALYSIS_UPDATED → track form quality
    unsubs.push(
      eventBus.subscribe('FORM_ANALYSIS_UPDATED', (payload: FormAnalysisUpdatedPayload) => {
        latestFormScore.current = payload.formScore;
      })
    );

    // FORM_WARNING_DETECTED → recommend load reduction if repeated
    unsubs.push(
      eventBus.subscribe('FORM_WARNING_DETECTED', (payload: FormWarningDetectedPayload) => {
        formWarningCount.current++;
        if (!recentFormIssues.current.includes(payload.issue)) {
          recentFormIssues.current.push(payload.issue);
        }

        if (formWarningCount.current >= 2 && payload.severity === 'high') {
          evaluateAndPush(payload.exerciseId, payload.exerciseName, 0); // weight will be deferred
        }
      })
    );

    // RECOVERY_SCORE_UPDATED → update baseline
    unsubs.push(
      eventBus.subscribe('RECOVERY_SCORE_UPDATED', (payload: RecoveryScoreUpdatedPayload) => {
        latestRecoveryScore.current = payload.recoveryScore;
      })
    );

    // PERSONAL_RECORD_ACHIEVED → positive feedback (no adjustment spam)
    unsubs.push(
      eventBus.subscribe('PERSONAL_RECORD_ACHIEVED', (_payload: PersonalRecordAchievedPayload) => {
        // PRs are positive signals — no intervention needed
        // Reset form warning count as performance is clearly strong
        formWarningCount.current = 0;
      })
    );

    // HEALTH_PROVIDER_STATE_CHANGED → wearable connectivity
    unsubs.push(
      eventBus.subscribe('HEALTH_PROVIDER_STATE_CHANGED', (payload: { state: string; provider?: string }) => {
        const typedState = payload.state as ProviderLifecycleState;
        setProviderState(typedState);
        if (typedState === 'disconnected' || typedState === 'unavailable' || typedState === 'error') {
          setCurrentHeartRate(null);
          setHeartRateFreshness('unavailable');
          setSafetyState('wearable_disconnected');
        } else if (typedState === 'connected') {
          setSafetyState('monitoring_restored');
        }
      })
    );

    // REALTIME_HEART_RATE_UPDATED → live biometrics
    unsubs.push(
      eventBus.subscribe('REALTIME_HEART_RATE_UPDATED', (payload: { heartRate: import('../health/healthTypes.ts').NormalizedHealthSignal<number> }) => {
        const { heartRate } = payload;
        setCurrentHeartRate((prev) => (prev === heartRate.value ? prev : heartRate.value));
        setHeartRateFreshness((prev) => (prev === heartRate.freshness ? prev : heartRate.freshness));

        if (heartRate.freshness === 'stale') {
          setSafetyState('biometric_data_stale');
        } else if (heartRate.freshness === 'unavailable') {
          setSafetyState('wearable_disconnected');
        }

        // Active Adaptive Safety via RealtimeSafetyEngine
        const evaluation = intelligenceService.evaluateRealtimeSafety(heartRate);

        if (evaluation.state === 'critical') {
          setSafetyState('stop_and_recover');
        } else if (evaluation.state === 'high') {
          setSafetyState('reduce_intensity');
        } else if (evaluation.state === 'elevated') {
          setSafetyState('heart_rate_elevated');
        } else if (evaluation.state === 'normal' && heartRate.freshness === 'fresh') {
          setSafetyState('monitoring');
        }

        // Persist safety state efficiently: only on state transition or periodic 30s heartbeat
        const lastP = lastPersistedSafetyRef.current;
        const now = Date.now();
        const hasZoneChanged = lastP.safetyZone !== evaluation.state;
        const hasRecChanged = lastP.recommendation !== evaluation.recommendation;
        const hasFreshnessChanged = lastP.freshness !== heartRate.freshness;
        const hasProviderChanged = lastP.providerStatus !== providerState;
        const isTimeForPeriodicBackup = now - lastP.timestamp > 30000;

        if (hasZoneChanged || hasRecChanged || hasFreshnessChanged || hasProviderChanged || isTimeForPeriodicBackup) {
          lastPersistedSafetyRef.current = {
            safetyZone: evaluation.state,
            recommendation: evaluation.recommendation,
            providerStatus: providerState,
            freshness: heartRate.freshness,
            timestamp: now,
          };

          const persistedState: PersistedSafetyState = {
            currentSafetyZone: evaluation.state,
            activeIntervention: evaluation.recommendation,
            interventionTimestamp: evaluation.isEscalated ? now : undefined,
            providerStatus: providerState,
            freshnessState: heartRate.freshness,
            sessionId: sessionId.current,
          };

          storageService.setJSON(WORKOUT_CACHE_POLICIES.ACTIVE_SAFETY_STATE.key, persistedState, {
            ttlMs: WORKOUT_CACHE_POLICIES.ACTIVE_SAFETY_STATE.ttlMs,
            version: WORKOUT_CACHE_POLICIES.ACTIVE_SAFETY_STATE.version,
          });
        }

        if (evaluation.isEscalated && evaluation.recommendation) {
          let reason = '';
          if (evaluation.recommendation === 'stop_and_recover') {
             reason = 'Heart rate is in a critical zone. Stop and recover immediately.';
          } else if (evaluation.recommendation === 'reduce_volume') {
             reason = 'Heart rate is sustained in high zone. Reducing workload.';
          }

          pushRecommendation(createRecommendation(
            evaluation.recommendation,
            'recovery',
            'global',
            'Workout',
            heartRate.value,
            0,
            'sets',
            reason,
            0.99
          ));
        }
      })
    );

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [enabled, eventBus, createRecommendation, pushRecommendation, heartRateFreshness, providerState, intelligenceService, storageService]);

  // --- User Actions ---

  const acceptRecommendation = useCallback(() => {
    if (!currentRecommendation || !eventBus) return;

    setCurrentRecommendation((prev) => prev ? { ...prev, accepted: true } : null);
    setRecommendationHistory((prev) =>
      prev.map((r) => r.id === currentRecommendation.id ? { ...r, accepted: true } : r)
    );

    eventBus.emit('ADAPTIVE_RECOMMENDATION_ACCEPTED', {
      recommendationId: currentRecommendation.id,
      type: currentRecommendation.type,
      exerciseId: currentRecommendation.exerciseId,
      exerciseName: currentRecommendation.exerciseName,
      originalValue: currentRecommendation.currentValue,
      acceptedValue: currentRecommendation.recommendedValue,
      unit: currentRecommendation.unit,
      timestamp: Date.now(),
    });

    setCurrentRecommendation(null);
  }, [currentRecommendation, eventBus]);

  const rejectRecommendation = useCallback(() => {
    if (!currentRecommendation || !eventBus) return;

    setRecommendationHistory((prev) =>
      prev.map((r) => r.id === currentRecommendation.id ? { ...r, dismissed: true } : r)
    );

    eventBus.emit('ADAPTIVE_RECOMMENDATION_REJECTED', {
      recommendationId: currentRecommendation.id,
      type: currentRecommendation.type,
      exerciseId: currentRecommendation.exerciseId,
      exerciseName: currentRecommendation.exerciseName,
      timestamp: Date.now(),
    });

    setCurrentRecommendation(null);
  }, [currentRecommendation, eventBus]);

  const dismissRecommendation = useCallback(() => {
    setCurrentRecommendation(null);
  }, []);

  const overrideIntervention = useCallback(() => {
    intelligenceService.overrideSafetyIntervention();
    setSafetyState('monitoring');
    const persistedState: PersistedSafetyState = {
      currentSafetyZone: 'normal',
      activeIntervention: undefined,
      providerStatus: providerState,
      freshnessState: heartRateFreshness,
      sessionId: sessionId.current,
    };
    storageService.setJSON(WORKOUT_CACHE_POLICIES.ACTIVE_SAFETY_STATE.key, persistedState, {
      ttlMs: WORKOUT_CACHE_POLICIES.ACTIVE_SAFETY_STATE.ttlMs,
      version: WORKOUT_CACHE_POLICIES.ACTIVE_SAFETY_STATE.version,
    });
  }, [intelligenceService, providerState, heartRateFreshness, storageService]);

  return {
    currentRecommendation,
    recommendationHistory,
    currentHeartRate,
    heartRateFreshness,
    providerState,
    safetyState,
    acceptRecommendation,
    rejectRecommendation,
    dismissRecommendation,
    overrideIntervention,
  };
}
