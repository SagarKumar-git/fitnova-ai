/**
 * FitNova AI — useNovaWorkoutCoach Hook
 * Coordinates Nova's real-time states and contextual coaching feedback
 * during active workout sessions via EventBus and local state transitions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useEventBus } from '../../../platform/container/PlatformContext.tsx';
import type {
  SetCompletedPayload,
  PersonalRecordAchievedPayload,
  ExerciseCompletedPayload,
  WorkoutCompletedPayload,
} from '../../../platform/types/events.ts';

export type NovaWorkoutState =
  | 'idle'
  | 'coaching'
  | 'thinking'
  | 'celebrating'
  | 'warning'
  | 'recovery'
  | 'listening'
  | 'intervention'
  | 'observing';

export interface UseNovaWorkoutCoachOptions {
  initialState?: NovaWorkoutState;
  isResting?: boolean;
}

export interface UseNovaWorkoutCoachReturn {
  state: NovaWorkoutState;
  message: string;
  subMessage?: string;
  setState: (state: NovaWorkoutState) => void;
  setMessage: (msg: string, sub?: string) => void;
  triggerThinking: (msg?: string) => void;
  triggerListening: () => void;
  resetToIdle: () => void;
}

export function useNovaWorkoutCoach(
  options: UseNovaWorkoutCoachOptions = {}
): UseNovaWorkoutCoachReturn {
  const { initialState = 'idle', isResting = false } = options;
  const eventBus = useEventBus();

  const [state, setState] = useState<NovaWorkoutState>(initialState);
  const [message, setMessageState] = useState<string>(
    'Nova is tracking your mechanics and progressive overload.'
  );
  const [subMessage, setSubMessage] = useState<string | undefined>(
    'Execute each rep with locked-in form and explosive intent.'
  );

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const setMessage = useCallback((msg: string, sub?: string) => {
    setMessageState(msg);
    setSubMessage(sub);
  }, []);

  const triggerThinking = useCallback((msg = 'Analyzing performance data...') => {
    clearTimer();
    setState('thinking');
    setMessageState(msg);
  }, [clearTimer]);

  const triggerListening = useCallback(() => {
    clearTimer();
    setState('listening');
    setMessageState('Listening for voice cue or adjustment command...');
    setSubMessage('Speak clearly to adjust load, timer, or log reps.');
  }, [clearTimer]);

  const resetToIdle = useCallback(() => {
    clearTimer();
    setState('idle');
    setMessageState('Nova is ready for your next set.');
    setSubMessage(undefined);
  }, [clearTimer]);

  // Sync rest state
  useEffect(() => {
    if (isResting) {
      clearTimer();
      setState('recovery');
      setMessageState('Recovery interval in progress. Focus on controlled nasal breathing.');
      setSubMessage('Allow cardiovascular and ATP levels to reset.');
    }
  }, [isResting, clearTimer]);

  // Subscribe to platform workout events
  useEffect(() => {
    const unsubSetCompleted = eventBus.subscribe(
      'SET_COMPLETED',
      (payload: SetCompletedPayload) => {
        clearTimer();
        const rpe = payload.rpe ?? 8.0;

        // High fatigue / limit reached
        if (rpe >= 9.5) {
          setState('warning');
          setMessageState(
            `High exertion detected (RPE ${rpe}). Take an extended rest to ensure maximum force production on your next effort.`
          );
          setSubMessage('Cellular ATP depleted. Deep diaphragmatic breathing recommended.');
        } else if (rpe <= 6.5) {
          setState('coaching');
          setMessageState(
            `Felt explosive! RPE ${rpe} indicates high power reserve. Consider adding +2.5kg on your next set.`
          );
          setSubMessage('Overload threshold available.');
        } else {
          setState('coaching');
          setMessageState(
            `Dialed-in set: ${payload.weight}kg × ${payload.reps} reps (RPE ${rpe}). Maintain this trajectory!`
          );
          setSubMessage('Motor patterns look clean and stable.');
        }

        // Return to recovery or idle after 6 seconds
        timeoutRef.current = setTimeout(() => {
          setState(isResting ? 'recovery' : 'idle');
        }, 6000);
      }
    );

    const unsubPRAchieved = eventBus.subscribe(
      'PERSONAL_RECORD_ACHIEVED',
      (payload: PersonalRecordAchievedPayload) => {
        clearTimer();
        setState('celebrating');
        setMessageState(
          `🏆 NEW PR! ${payload.exerciseName}: ${payload.value}kg (${payload.metric.toUpperCase()})!`
        );
        setSubMessage("That's your strongest performance yet. Incredible execution!");

        timeoutRef.current = setTimeout(() => {
          setState(isResting ? 'recovery' : 'idle');
        }, 8000);
      }
    );

    const unsubExerciseCompleted = eventBus.subscribe(
      'EXERCISE_COMPLETED',
      (payload: ExerciseCompletedPayload) => {
        clearTimer();
        setState('coaching');
        setMessageState(
          `Completed all ${payload.setsCompleted} sets of ${payload.exerciseName}! Transitioning to your next movement.`
        );
        setSubMessage('Log your notes or grab water before beginning the next sequence.');

        timeoutRef.current = setTimeout(() => {
          setState(isResting ? 'recovery' : 'idle');
        }, 6000);
      }
    );

    const unsubWorkoutCompleted = eventBus.subscribe(
      'WORKOUT_COMPLETED',
      (payload: WorkoutCompletedPayload) => {
        clearTimer();
        setState('celebrating');
        setMessageState(
          `Phenomenal effort! You moved ${(payload.totalVolume || 0).toLocaleString()}kg across ${payload.totalSets || 0} sets.`
        );
        setSubMessage('Workout complete. Your muscle protein synthesis window is now open!');
      }
    );

    return () => {
      clearTimer();
      unsubSetCompleted();
      unsubPRAchieved();
      unsubExerciseCompleted();
      unsubWorkoutCompleted();
    };
  }, [eventBus, isResting, clearTimer]);

  return {
    state,
    message,
    subMessage,
    setState,
    setMessage,
    triggerThinking,
    triggerListening,
    resetToIdle,
  };
}
