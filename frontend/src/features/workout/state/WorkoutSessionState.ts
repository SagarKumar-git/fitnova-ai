/**
 * FitNova AI — Workout Session State Machine
 * Deterministic transition rules and validation for live workout execution.
 */

import type { SessionStatus } from '../types/enums.ts';
import { ValidationError } from '../../../platform/errors/index.ts';

const VALID_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  idle: ['preparing', 'active'],
  preparing: ['active', 'cancelled'],
  active: ['paused', 'completed', 'cancelled'],
  paused: ['active', 'completed', 'cancelled'],
  completed: [], // Terminal
  cancelled: [], // Terminal
};

/**
 * Checks whether a proposed session state transition is valid.
 */
export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  if (from === to) return true;
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Asserts that a proposed session transition is valid, throwing ValidationError if not.
 */
export function assertValidTransition(from: SessionStatus, to: SessionStatus): void {
  if (!canTransition(from, to)) {
    throw new ValidationError(
      `Invalid workout session transition: Cannot transition from "${from}" to "${to}".`
    );
  }
}
