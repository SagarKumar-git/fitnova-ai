/**
 * FitNova AI — Workout OS Cache Policy
 * Strongly-typed cache policy definitions for Workout OS entities.
 * Enforces TTLs, versions, reactive invalidation triggers, and local-first durability.
 * ZERO any types.
 */

export interface CachePolicyItem {
  key: string;
  version: number;
  ttlMs: number;
  invalidationEvents: string[];
  description: string;
  staleWhileRevalidate: boolean;
}

export const WORKOUT_CACHE_POLICIES = {
  EXERCISE_CATALOG: {
    key: 'fitnova:cache:exercises',
    version: 1,
    ttlMs: 24 * 60 * 60 * 1000, // 24 hours
    invalidationEvents: ['EXERCISE_MUTATED'],
    description: 'Catalog of standard and custom exercises',
    staleWhileRevalidate: true,
  },
  WORKOUT_TEMPLATES: {
    key: 'fitnova:cache:workouts',
    version: 1,
    ttlMs: 60 * 60 * 1000, // 1 hour
    invalidationEvents: ['TEMPLATE_MUTATED', 'WORKOUT_COMPLETED'],
    description: 'Custom and system workout routine templates',
    staleWhileRevalidate: true,
  },
  RECENT_HISTORY: {
    key: 'fitnova:cache:history',
    version: 1,
    ttlMs: 15 * 60 * 1000, // 15 minutes
    invalidationEvents: ['WORKOUT_COMPLETED', 'SESSION_DELETED'],
    description: 'Completed workout session history list',
    staleWhileRevalidate: true,
  },
  PERSONAL_RECORDS: {
    key: 'fitnova:cache:prs',
    version: 1,
    ttlMs: 30 * 60 * 1000, // 30 minutes
    invalidationEvents: ['PERSONAL_RECORD_ACHIEVED', 'WORKOUT_COMPLETED'],
    description: 'All-time personal records per exercise',
    staleWhileRevalidate: true,
  },
  ANALYTICS_SUMMARIES: {
    key: 'workout:analytics:unified',
    version: 1,
    ttlMs: 5 * 60 * 1000, // 5 minutes
    invalidationEvents: ['WORKOUT_COMPLETED'],
    description: 'Volume totals, strength progression, and muscle recovery scores',
    staleWhileRevalidate: false,
  },
  ACTIVE_WORKOUT_SESSION: {
    key: 'fitnova:workout:active_session',
    version: 1,
    ttlMs: Infinity, // Permanent local durability until finished/cancelled
    invalidationEvents: ['WORKOUT_COMPLETED', 'WORKOUT_CANCELLED'],
    description: 'Real-time optimistic live session state — NEVER replaced by stale cache',
    staleWhileRevalidate: false,
  },
  // Sprint 3.8 — Adaptive Training
  ADAPTIVE_DECISIONS: {
    key: 'fitnova:cache:adaptive_decisions',
    version: 1,
    ttlMs: 2 * 60 * 60 * 1000, // 2 hours before stale
    invalidationEvents: ['ADAPTIVE_DECISION_UPDATED', 'WORKOUT_COMPLETED', 'HEALTH_SYNC_COMPLETED_DETAILS'],
    description: 'Cached adaptive training decisions for offline support',
    staleWhileRevalidate: true,
  },
  // Sprint 4.6 — Safety Observability
  ACTIVE_SAFETY_STATE: {
    key: 'fitnova:workout:active_safety_state',
    version: 1,
    ttlMs: Infinity, // Permanent local durability until workout ends
    invalidationEvents: ['WORKOUT_COMPLETED', 'WORKOUT_CANCELLED'],
    description: 'Live safety zone and active interventions',
    staleWhileRevalidate: false,
  },
} as const satisfies Record<string, CachePolicyItem>;

export interface CacheEnvelope<T> {
  data: T;
  version: number;
  cachedAt: number;
  ttlMs: number;
}

import type { AdaptiveTrainingDecision } from '../intelligence/types/adaptiveTraining.ts';
import type { DataFreshness } from '../../health/types/healthContracts.ts';

export class WorkoutCacheManager {
  static createEnvelope<T>(data: T, policy: CachePolicyItem): CacheEnvelope<T> {
    return {
      data,
      version: policy.version,
      cachedAt: Date.now(),
      ttlMs: policy.ttlMs,
    };
  }

  static isEnvelopeFresh<T>(envelope: CacheEnvelope<T> | null | undefined): boolean {
    if (!envelope) return false;
    if (envelope.ttlMs === Infinity) return true;
    return Date.now() - envelope.cachedAt < envelope.ttlMs;
  }

  // Sprint 3.8 — Adaptive Decision Caching
  
  static getDecisionFreshness(envelope: CacheEnvelope<AdaptiveTrainingDecision> | null | undefined): DataFreshness {
    if (!envelope) {
      return { timestamp: 0, ageMs: Infinity, state: 'unavailable' };
    }
    
    const ageMs = Date.now() - envelope.cachedAt;
    
    // For adaptive decisions, we match the health data freshness thresholds
    let state: import('../../health/types/healthContracts.ts').DataFreshnessState;
    if (ageMs < 2 * 60 * 60 * 1000) {
      state = 'fresh';
    } else if (ageMs < 8 * 60 * 60 * 1000) {
      state = 'aging';
    } else if (ageMs < 24 * 60 * 60 * 1000) {
      state = 'stale';
    } else {
      state = 'unavailable';
    }
    
    return { timestamp: envelope.cachedAt, ageMs, state };
  }
}
