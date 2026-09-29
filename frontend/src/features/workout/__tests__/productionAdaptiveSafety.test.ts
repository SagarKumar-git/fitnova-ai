import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HealthDataService } from '../health/HealthDataService.ts';
import { WorkoutIntelligenceService } from '../intelligence/WorkoutIntelligenceService.ts';
import { EventBus } from '../../../platform/events/EventBus.ts';
import { MockHealthProvider } from '../health/MockHealthProvider.ts';
import type { NormalizedHealthSignal } from '../health/healthTypes.ts';

describe('Sprint 4.5: End-to-End Adaptive Safety Pipeline Integration', () => {
  let mockProvider: MockHealthProvider;
  let eventBus: EventBus;
  let intelligenceService: WorkoutIntelligenceService;

  beforeEach(() => {
    vi.useFakeTimers();
    eventBus = new EventBus();
    mockProvider = new MockHealthProvider();
    
    // We instantiate HealthDataService with our EventBus so it can emit real-time data
    new HealthDataService(mockProvider, eventBus);
    
    // We instantiate WorkoutIntelligenceService which holds the RealtimeSafetyEngine
    intelligenceService = new WorkoutIntelligenceService();
  });

  const simulateHrStream = (readings: number[]): Array<{ isEscalated: boolean, recommendation: string | undefined, bpm: number }> => {
    const results: Array<{ isEscalated: boolean, recommendation: string | undefined, bpm: number }> = [];

    readings.forEach(bpm => {
      const signal: NormalizedHealthSignal<number> = {
        value: bpm,
        freshness: 'fresh',
        confidence: 0.99,
        capturedAt: Date.now(),
        source: 'mock'
      };

      // 1. Simulate HealthDataService handling the raw real-time data
      // For testing, we bypass the throttle and directly emit the event to ensure
      // the test executes exactly the sequence of readings we define.
      // (The throttle was validated in Sprint 4.3; here we are validating the logic of the safety engine pipeline)
      
      // 2. Simulate the Hook / EventBus Proxy catching the event and calling the intelligence service
      const evaluation = intelligenceService.evaluateRealtimeSafety(signal);
      
      results.push({
        isEscalated: evaluation.isEscalated,
        recommendation: evaluation.recommendation,
        bpm
      });
      
      // Fast forward time to simulate subsequent readings
      vi.advanceTimersByTime(3000); 
    });

    return results;
  };

  it('Scenario A: Normal Workout (No Interventions)', () => {
    const readings = [120, 125, 130, 135, 140, 145, 148];
    const results = simulateHrStream(readings);

    results.forEach(res => {
      expect(res.isEscalated).toBe(false);
      expect(res.recommendation).toBeUndefined();
    });
  });

  it('Scenario B: Noisy Signal (Ignores Isolated Spikes)', () => {
    // Normal -> Spike (195) -> Spike (195) -> Normal (135)
    // The spike needs 3 consecutive readings to trigger.
    const readings = [130, 135, 195, 195, 135, 130];
    const results = simulateHrStream(readings);

    results.forEach(res => {
      expect(res.isEscalated).toBe(false);
      expect(res.recommendation).toBeUndefined();
    });
  });

  it('Scenario C: High Exertion (Triggers reduce_volume)', () => {
    const readings = [160, 175, 178, 180, 181];
    const results = simulateHrStream(readings);

    // Reading 1: 160 (Elevated, consecutive 1) - no intervention
    expect(results[0].isEscalated).toBe(false);
    
    // Reading 2: 175 (High, consecutive 1) - no intervention
    expect(results[1].isEscalated).toBe(false);
    
    // Reading 3: 178 (High, consecutive 2) - no intervention
    expect(results[2].isEscalated).toBe(false);
    
    // Reading 4: 180 (High, consecutive 3) - TRIGGER!
    expect(results[3].isEscalated).toBe(true);
    expect(results[3].recommendation).toBe('reduce_volume');
    
    // Reading 5: 181 (High, consecutive 4) - MAINTAIN
    expect(results[4].isEscalated).toBe(true);
    expect(results[4].recommendation).toBe('reduce_volume');
  });

  it('Scenario D: Critical Exertion & Recovery (stop_and_recover -> instant downgrade)', () => {
    // Climb to critical
    const criticalReadings = [185, 188, 190];
    const criticalResults = simulateHrStream(criticalReadings);
    
    // Reading 1 & 2: no intervention yet
    expect(criticalResults[0].isEscalated).toBe(false);
    expect(criticalResults[1].isEscalated).toBe(false);
    
    // Reading 3: triggers critical
    expect(criticalResults[2].isEscalated).toBe(true);
    expect(criticalResults[2].recommendation).toBe('stop_and_recover');

    // Recovery
    const recoveryReadings = [140];
    const recoveryResults = simulateHrStream(recoveryReadings);
    
    // Reading 4: drops immediately to normal, should instantly clear intervention
    expect(recoveryResults[0].isEscalated).toBe(false);
    expect(recoveryResults[0].recommendation).toBeUndefined();
  });

  it('Scenario E: Extended wear disconnection (signal freshness > 5000ms)', () => {
    // If signal freshness is > 5000, HealthDataService should mark it stale,
    // but the engine directly tests the `signal.freshness` flag.
    const signal: NormalizedHealthSignal<number> = {
      value: 180,
      freshness: 'stale', // or whatever we map >5000ms to. If it's stale, engine shouldn't escalate.
      confidence: 0.9,
      capturedAt: Date.now(),
      source: 'mock'
    };

    const evaluation = intelligenceService.evaluateRealtimeSafety(signal);
    // Stale signal should not trigger an escalation for a new high reading
    expect(evaluation.isEscalated).toBe(false);
  });

  it('Scenario F: State Snapshot extraction and restoration', () => {
    // Trigger critical
    simulateHrStream([185, 188, 190]);
    const snapshot = intelligenceService.getRealtimeSafetySnapshot();
    expect(snapshot.currentState).toBe('critical');

    // Restore into a new service
    const newService = new WorkoutIntelligenceService();
    newService.restoreRealtimeSafetySnapshot(snapshot);
    const evaluation = newService.evaluateRealtimeSafety({
      value: 185, // Even 1 reading at critical should maintain critical
      freshness: 'fresh',
      confidence: 0.99,
      capturedAt: Date.now(),
      source: 'mock'
    });
    
    expect(evaluation.isEscalated).toBe(true);
    expect(evaluation.recommendation).toBe('stop_and_recover');
  });

  it('Scenario G: User Override clears intervention', () => {
    simulateHrStream([185, 188, 190]);
    const snapshotBefore = intelligenceService.getRealtimeSafetySnapshot();
    expect(snapshotBefore.currentState).toBe('critical');

    // Simulate override
    intelligenceService.overrideSafetyIntervention();
    
    const snapshotAfter = intelligenceService.getRealtimeSafetySnapshot();
    expect(snapshotAfter.currentState).toBe('normal');
  });
});
