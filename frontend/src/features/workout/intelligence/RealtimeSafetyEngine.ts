import type { NormalizedHealthSignal } from '../health/healthTypes.ts';
import type { EventBus } from '../../../platform/events/EventBus.ts';

export type HeartRateSafetyState = 'normal' | 'elevated' | 'high' | 'critical' | 'unavailable';

export interface HeartRateSafetyEvaluation {
  state: HeartRateSafetyState;
  currentBpm: number | null;
  isEscalated: boolean;
  recommendation?: 'reduce_volume' | 'stop_and_recover';
}

export interface RealtimeSafetySnapshot {
  currentState: HeartRateSafetyState;
  consecutiveReadings: number;
  pendingState: HeartRateSafetyState | null;
  isCurrentlyEscalated: boolean;
}

export class RealtimeSafetyEngine {
  private readonly CONSECUTIVE_READINGS_REQUIRED = 3;
  
  private currentState: HeartRateSafetyState = 'unavailable';
  private consecutiveReadings: number = 0;
  private pendingState: HeartRateSafetyState | null = null;
  private isCurrentlyEscalated: boolean = false;
  private eventBus?: EventBus;
  private sessionId?: string;

  constructor(eventBus?: EventBus, sessionId?: string) {
    this.eventBus = eventBus;
    this.sessionId = sessionId;
  }

  public getStateSnapshot(): RealtimeSafetySnapshot {
    return {
      currentState: this.currentState,
      consecutiveReadings: this.consecutiveReadings,
      pendingState: this.pendingState,
      isCurrentlyEscalated: this.isCurrentlyEscalated
    };
  }

  public restoreState(snapshot: RealtimeSafetySnapshot | null | undefined): void {
    if (!snapshot) return;
    this.currentState = snapshot.currentState ?? 'unavailable';
    this.consecutiveReadings = snapshot.consecutiveReadings ?? 0;
    this.pendingState = snapshot.pendingState ?? null;
    this.isCurrentlyEscalated = snapshot.isCurrentlyEscalated ?? false;
  }

  public evaluateRealtimeHeartRate(hrSignal: NormalizedHealthSignal<number>): HeartRateSafetyEvaluation {
    if (hrSignal.freshness === 'unavailable' || hrSignal.freshness === 'stale') {
      this.transitionTo('unavailable');
      return this.buildEvaluation(null);
    }

    const bpm = hrSignal.value;
    const detectedState = this.determineState(bpm);

    if (detectedState === this.currentState) {
      this.pendingState = null;
      this.consecutiveReadings = 0;
    } else {
      if (this.pendingState === detectedState) {
        this.consecutiveReadings++;
        if (this.consecutiveReadings >= this.CONSECUTIVE_READINGS_REQUIRED) {
          if (detectedState === 'high' && this.eventBus && this.sessionId) {
            this.eventBus.emit('HIGH_HR_SUSTAINED', {
              sessionId: this.sessionId,
              bpm,
              consecutiveReadings: this.consecutiveReadings,
              timestamp: Date.now()
            });
          } else if (detectedState === 'critical' && this.eventBus && this.sessionId) {
            this.eventBus.emit('CRITICAL_HR_SUSTAINED', {
              sessionId: this.sessionId,
              bpm,
              consecutiveReadings: this.consecutiveReadings,
              timestamp: Date.now()
            });
          }
          this.transitionTo(detectedState);
        }
      } else {
        this.pendingState = detectedState;
        this.consecutiveReadings = 1;
        
        // Instant downgrade for safety: if heart rate drops to normal, we don't wait 3 readings to downgrade.
        // We want interventions to clear fast if the user is safe.
        // We instantly transition down, but require debouncing to transition UP.
        if (this.isLowerSeverity(detectedState, this.currentState)) {
           this.transitionTo(detectedState);
        }
      }
    }

    return this.buildEvaluation(bpm);
  }

  private determineState(bpm: number): HeartRateSafetyState {
    if (bpm < 150) return 'normal';
    if (bpm >= 150 && bpm <= 169) return 'elevated';
    if (bpm >= 170 && bpm <= 184) return 'high';
    return 'critical';
  }

  private isLowerSeverity(newState: HeartRateSafetyState, oldState: HeartRateSafetyState): boolean {
    const severity: Record<HeartRateSafetyState, number> = {
      'unavailable': 0,
      'normal': 1,
      'elevated': 2,
      'high': 3,
      'critical': 4
    };
    return severity[newState] < severity[oldState];
  }

  private transitionTo(newState: HeartRateSafetyState) {
    if (this.currentState !== newState && this.eventBus && this.sessionId) {
      this.eventBus.emit('SAFETY_ZONE_TRANSITIONED', {
        sessionId: this.sessionId,
        previousZone: this.currentState,
        newZone: newState,
        timestamp: Date.now()
      });
    }

    const wasEscalated = this.isCurrentlyEscalated;
    this.currentState = newState;
    this.pendingState = null;
    this.consecutiveReadings = 0;

    if (newState === 'high' || newState === 'critical') {
      this.isCurrentlyEscalated = true;
      if (!wasEscalated || newState === 'critical') {
        const intervention = newState === 'critical' ? 'stop_and_recover' : 'reduce_volume';
        if (this.eventBus && this.sessionId) {
          this.eventBus.emit('SAFETY_INTERVENTION_TRIGGERED', {
            sessionId: this.sessionId,
            zone: newState,
            intervention,
            timestamp: Date.now()
          });
        }
      }
    } else {
      this.isCurrentlyEscalated = false;
      if (wasEscalated && this.eventBus && this.sessionId) {
        this.eventBus.emit('SAFETY_INTERVENTION_CLEARED', {
          sessionId: this.sessionId,
          timestamp: Date.now()
        });
      }
    }
  }

  public overrideSafetyIntervention() {
    if (this.isCurrentlyEscalated) {
      this.isCurrentlyEscalated = false;
      this.currentState = 'normal';
      this.pendingState = null;
      this.consecutiveReadings = 0;
      
      if (this.eventBus && this.sessionId) {
        this.eventBus.emit('SAFETY_RECOMMENDATION_OVERRIDDEN', {
          sessionId: this.sessionId,
          intervention: 'reduce_weight', // or pass as param
          timestamp: Date.now()
        });
      }
    }
  }

  private buildEvaluation(bpm: number | null): HeartRateSafetyEvaluation {
    let recommendation: 'reduce_volume' | 'stop_and_recover' | undefined;
    
    if (this.isCurrentlyEscalated) {
      if (this.currentState === 'critical') {
        recommendation = 'stop_and_recover';
      } else if (this.currentState === 'high') {
        recommendation = 'reduce_volume';
      }
    }

    return {
      state: this.currentState,
      currentBpm: bpm,
      isEscalated: this.isCurrentlyEscalated,
      recommendation,
    };
  }
}
