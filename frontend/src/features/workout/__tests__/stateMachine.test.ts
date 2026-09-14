/**
 * FitNova AI — Workout Session State Machine Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { canTransition, assertValidTransition } from '../state/WorkoutSessionState.ts';
import { ValidationError } from '../../../platform/errors/index.ts';

describe('Workout OS — Session State Machine', () => {
  it('permits all valid lifecycle transitions', () => {
    // Normal flow: idle -> active -> completed
    expect(canTransition('idle', 'active')).toBe(true);
    expect(canTransition('active', 'completed')).toBe(true);

    // Flow with preparation: idle -> preparing -> active
    expect(canTransition('idle', 'preparing')).toBe(true);
    expect(canTransition('preparing', 'active')).toBe(true);

    // Flow with pause/resume: active <-> paused
    expect(canTransition('active', 'paused')).toBe(true);
    expect(canTransition('paused', 'active')).toBe(true);

    // Early finish or cancellation from paused
    expect(canTransition('paused', 'completed')).toBe(true);
    expect(canTransition('paused', 'cancelled')).toBe(true);

    // Cancellation
    expect(canTransition('active', 'cancelled')).toBe(true);
    expect(canTransition('preparing', 'cancelled')).toBe(true);

    // Identity transition
    expect(canTransition('active', 'active')).toBe(true);
  });

  it('prohibits illegal state transitions and terminal mutations', () => {
    // Cannot skip into finished from idle
    expect(canTransition('idle', 'completed')).toBe(false);
    expect(canTransition('idle', 'paused')).toBe(false);

    // Terminal states cannot transition out
    expect(canTransition('completed', 'active')).toBe(false);
    expect(canTransition('completed', 'idle')).toBe(false);
    expect(canTransition('cancelled', 'active')).toBe(false);
    expect(canTransition('cancelled', 'idle')).toBe(false);
  });

  it('throws ValidationError with descriptive message when assertValidTransition fails', () => {
    expect(() => assertValidTransition('completed', 'active')).toThrow(ValidationError);
    expect(() => assertValidTransition('idle', 'paused')).toThrow(
      'Invalid workout session transition: Cannot transition from "idle" to "paused".'
    );
    expect(() => assertValidTransition('active', 'paused')).not.toThrow();
  });
});
