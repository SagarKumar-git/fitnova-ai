/**
 * FitNova AI — Workout Event Dispatchers
 * Clean helpers to emit strongly typed events over the platform EventBus.
 */

import type { EventBus } from '../../../platform/events/EventBus.ts';
import type {
  WorkoutStartedPayload,
  WorkoutPausedPayload,
  WorkoutResumedPayload,
  WorkoutCompletedPayload,
  WorkoutCancelledPayload,
  ExerciseCompletedPayload,
  SetCompletedPayload,
  PersonalRecordAchievedPayload,
} from '../../../platform/types/events.ts';

export class WorkoutEventDispatcher {
  private readonly eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  workoutStarted(payload: WorkoutStartedPayload): void {
    this.eventBus.emit('WORKOUT_STARTED', payload);
  }

  workoutPaused(payload: WorkoutPausedPayload): void {
    this.eventBus.emit('WORKOUT_PAUSED', payload);
  }

  workoutResumed(payload: WorkoutResumedPayload): void {
    this.eventBus.emit('WORKOUT_RESUMED', payload);
  }

  workoutCompleted(payload: WorkoutCompletedPayload): void {
    this.eventBus.emit('WORKOUT_COMPLETED', payload);
  }

  workoutCancelled(payload: WorkoutCancelledPayload): void {
    this.eventBus.emit('WORKOUT_CANCELLED', payload);
  }

  exerciseCompleted(payload: ExerciseCompletedPayload): void {
    this.eventBus.emit('EXERCISE_COMPLETED', payload);
  }

  setCompleted(payload: SetCompletedPayload): void {
    this.eventBus.emit('SET_COMPLETED', payload);
  }

  personalRecordAchieved(payload: PersonalRecordAchievedPayload): void {
    this.eventBus.emit('PERSONAL_RECORD_ACHIEVED', payload);
  }
}
