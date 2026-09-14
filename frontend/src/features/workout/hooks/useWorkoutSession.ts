/**
 * FitNova AI — useWorkoutSession Hook
 * Provides direct ergonomic access to active session controls and state.
 */

import { useWorkout, type WorkoutContextValue } from '../state/WorkoutContext.tsx';

export function useWorkoutSession(): WorkoutContextValue {
  return useWorkout();
}
