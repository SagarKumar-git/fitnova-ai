import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebBluetoothHealthProvider } from '../WebBluetoothHealthProvider.ts';
import { HealthDataService } from '../HealthDataService.ts';
import { WorkoutIntelligenceService } from '../../intelligence/WorkoutIntelligenceService.ts';
import { EventBus } from '../../../../platform/events/EventBus.ts';
import type { ProviderLifecycleState } from '../IHealthProvider.ts';

// Helper to construct simulated GATT Heart Rate Measurement payload
function makeHrBuffer(bpm: number, is16Bit = false): Uint8Array {
  if (is16Bit) {
    const buf = new Uint8Array(3);
    buf[0] = 0x01; // flag: 16-bit HR
    buf[1] = bpm & 0xff;
    buf[2] = (bpm >> 8) & 0xff;
    return buf;
  }
  const buf = new Uint8Array(2);
  buf[0] = 0x00; // flag: 8-bit HR
  buf[1] = bpm & 0xff;
  return buf;
}

function createMockBluetoothRig() {
  const deviceListeners: Record<string, Function[]> = {};
  const charListeners: Record<string, Function[]> = {};

  const characteristic = {
    value: null as DataView | null,
    startNotifications: vi.fn().mockResolvedValue(undefined),
    stopNotifications: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn((type: string, fn: Function) => {
      charListeners[type] = charListeners[type] || [];
      charListeners[type].push(fn);
    }),
    removeEventListener: vi.fn((type: string, fn: Function) => {
      if (charListeners[type]) {
        charListeners[type] = charListeners[type].filter((l) => l !== fn);
      }
    }),
    simulateValue(buffer: Uint8Array) {
      characteristic.value = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      const callbacks = [...(charListeners['characteristicvaluechanged'] || [])];
      callbacks.forEach((fn) => fn({ target: characteristic }));
    },
    getListenerCount(type: string) {
      return (charListeners[type] || []).length;
    },
  };

  const service = {
    getCharacteristic: vi.fn().mockResolvedValue(characteristic),
  };

  const gattServer = {
    getPrimaryService: vi.fn().mockResolvedValue(service),
  };

  const gatt = {
    connected: true,
    connect: vi.fn().mockResolvedValue(gattServer),
    disconnect: vi.fn(() => {
      gatt.connected = false;
      const callbacks = [...(deviceListeners['gattserverdisconnected'] || [])];
      callbacks.forEach((fn) => fn());
    }),
  };

  const device = {
    gatt,
    addEventListener: vi.fn((type: string, fn: Function) => {
      deviceListeners[type] = deviceListeners[type] || [];
      deviceListeners[type].push(fn);
    }),
    removeEventListener: vi.fn((type: string, fn: Function) => {
      if (deviceListeners[type]) {
        deviceListeners[type] = deviceListeners[type].filter((l) => l !== fn);
      }
    }),
    simulateHardwareDisconnect() {
      gatt.connected = false;
      const callbacks = [...(deviceListeners['gattserverdisconnected'] || [])];
      callbacks.forEach((fn) => fn());
    },
    getListenerCount(type: string) {
      return (deviceListeners[type] || []).length;
    },
  };

  return { device, gatt, gattServer, service, characteristic };
}

describe('Sprint 4.6: Real Wearable & Real-Time Device Validation Suite', () => {
  let originalNavigator: any;

  beforeEach(() => {
    vi.useFakeTimers();
    originalNavigator = globalThis.navigator;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.navigator = originalNavigator;
  });

  // ============================================================================
  // Task 2: Validate complete provider lifecycle: unavailable -> connecting -> connected -> syncing -> error
  // ============================================================================
  describe('Task 2: Provider Lifecycle Transitions', () => {
    it('progresses through unavailable -> connecting -> connected -> syncing -> connected', async () => {
      const rig = createMockBluetoothRig();
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          bluetooth: {
            requestDevice: vi.fn().mockResolvedValue(rig.device),
          },
        },
        writable: true,
        configurable: true,
      });

      const provider = new WebBluetoothHealthProvider();
      const lifecycleStates: ProviderLifecycleState[] = [];
      provider.onStateChange((state) => lifecycleStates.push(state));

      expect(provider.state).toBe('unavailable');

      const connectPromise = provider.connect();
      expect(provider.state).toBe('connecting');
      await connectPromise;
      expect(provider.state).toBe('connected');

      // Sync lifecycle
      const datasetPromise = provider.getComprehensiveDataset();
      const dataset = await datasetPromise;
      expect(dataset).toBeDefined();
      expect(provider.state).toBe('connected');

      expect(lifecycleStates).toEqual(['connecting', 'connected', 'syncing', 'connected']);
    });
  });

  // ============================================================================
  // Task 3: Bluetooth permission denial and graceful error handling
  // ============================================================================
  describe('Task 3: Permission Denial & Graceful Error Handling', () => {
    it('handles permission denial (user cancelled / rejected requestDevice) cleanly', async () => {
      const notFoundError = new Error('User cancelled the requestDevice() chooser');
      notFoundError.name = 'NotFoundError';

      Object.defineProperty(globalThis, 'navigator', {
        value: {
          bluetooth: {
            requestDevice: vi.fn().mockRejectedValue(notFoundError),
          },
        },
        writable: true,
        configurable: true,
      });

      const provider = new WebBluetoothHealthProvider();
      const states: ProviderLifecycleState[] = [];
      provider.onStateChange((s) => states.push(s));

      await expect(provider.connect()).rejects.toThrow('User cancelled');
      expect(provider.state).toBe('error');
      expect(states).toEqual(['connecting', 'error']);
    });

    it('handles browser without Web Bluetooth API gracefully', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      const provider = new WebBluetoothHealthProvider();
      await expect(provider.connect()).rejects.toThrow('Web Bluetooth is not available in this browser.');
      expect(provider.state).toBe('error');
    });
  });

  // ============================================================================
  // Task 4: Connection failure and reconnection
  // ============================================================================
  describe('Task 4: Connection Failure and Reconnection', () => {
    it('cleans up state after GATT connection failure and succeeds on subsequent reconnection', async () => {
      const rig1 = createMockBluetoothRig();
      rig1.gatt.connect.mockRejectedValueOnce(new Error('GATT connection failed (device out of range)'));

      const rig2 = createMockBluetoothRig();

      let callCount = 0;
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          bluetooth: {
            requestDevice: vi.fn().mockImplementation(() => {
              callCount++;
              return Promise.resolve(callCount === 1 ? rig1.device : rig2.device);
            }),
          },
        },
        writable: true,
        configurable: true,
      });

      const provider = new WebBluetoothHealthProvider();

      // First attempt: fails at GATT connect
      await expect(provider.connect()).rejects.toThrow('GATT connection failed');
      expect(provider.state).toBe('error');

      // Verify rig1 had listeners removed
      expect(rig1.device.getListenerCount('gattserverdisconnected')).toBe(0);

      // Second attempt: succeeds
      await provider.connect();
      expect(provider.state).toBe('connected');
      expect(rig2.device.getListenerCount('gattserverdisconnected')).toBe(1);
      expect(rig2.characteristic.getListenerCount('characteristicvaluechanged')).toBe(1);
    });
  });

  // ============================================================================
  // Task 5: Disconnect during an active workout
  // ============================================================================
  describe('Task 5: Disconnect during Active Workout', () => {
    it('dispatches disconnected status and unavailable HR signal when device disconnects mid-workout', async () => {
      const rig = createMockBluetoothRig();
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          bluetooth: {
            requestDevice: vi.fn().mockResolvedValue(rig.device),
          },
        },
        writable: true,
        configurable: true,
      });

      const eventBus = new EventBus();
      const provider = new WebBluetoothHealthProvider();
      const healthDataService = new HealthDataService(provider, eventBus);

      const hrEvents: any[] = [];
      const stateEvents: any[] = [];

      eventBus.subscribe('REALTIME_HEART_RATE_UPDATED', (payload) => { hrEvents.push(payload); });
      eventBus.subscribe('HEALTH_PROVIDER_STATE_CHANGED', (payload) => { stateEvents.push(payload); });

      await healthDataService.connect();

      // Transmit active heart rate reading (140 BPM)
      rig.characteristic.simulateValue(makeHrBuffer(140));

      expect(hrEvents.length).toBe(1);
      expect(hrEvents[0].heartRate.value).toBe(140);
      expect(hrEvents[0].heartRate.freshness).toBe('fresh');

      // Simulate hardware disconnect during workout
      rig.device.simulateHardwareDisconnect();

      expect(provider.state).toBe('disconnected');
      expect(stateEvents).toContainEqual(
        expect.objectContaining({ state: 'disconnected', provider: 'web_bluetooth_hr' })
      );

      // Verify that disconnected state caused an unavailable signal to be emitted
      const lastHrEvent = hrEvents[hrEvents.length - 1];
      expect(lastHrEvent.heartRate.freshness).toBe('unavailable');
      expect(lastHrEvent.heartRate.confidence).toBe(0);
      expect(lastHrEvent.heartRate.value).toBe(0);
    });
  });

  // ============================================================================
  // Task 6: Repeated connect/disconnect cycles and memory leak audit
  // ============================================================================
  describe('Task 6: Repeated Connect/Disconnect Cycles & Memory Leak Audit', () => {
    it('completely tears down all listeners across repeated connect/disconnect cycles without leaks', async () => {
      const rig = createMockBluetoothRig();
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          bluetooth: {
            requestDevice: vi.fn().mockResolvedValue(rig.device),
          },
        },
        writable: true,
        configurable: true,
      });

      const provider = new WebBluetoothHealthProvider();

      // Perform 5 successive connect / disconnect cycles
      for (let i = 0; i < 5; i++) {
        await provider.connect();
        expect(provider.state).toBe('connected');
        expect(rig.device.getListenerCount('gattserverdisconnected')).toBe(1);
        expect(rig.characteristic.getListenerCount('characteristicvaluechanged')).toBe(1);

        await provider.disconnect();
        expect(provider.state).toBe('disconnected');
        expect(rig.device.getListenerCount('gattserverdisconnected')).toBe(0);
        expect(rig.characteristic.getListenerCount('characteristicvaluechanged')).toBe(0);
      }
    });
  });

  // ============================================================================
  // Task 7: Heart-rate filtering (below 30 BPM rejected, above 220 BPM rejected, valid values accepted)
  // ============================================================================
  describe('Task 7: Physiological Heart-Rate Filtering', () => {
    it('rejects values below 30 BPM, rejects values above 220 BPM, and accepts valid values', async () => {
      const rig = createMockBluetoothRig();
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          bluetooth: {
            requestDevice: vi.fn().mockResolvedValue(rig.device),
          },
        },
        writable: true,
        configurable: true,
      });

      const provider = new WebBluetoothHealthProvider();
      await provider.connect();

      const receivedBpm: number[] = [];
      provider.onRealTimeData((dataset) => {
        if (dataset.heartRate?.value) {
          receivedBpm.push(dataset.heartRate.value);
        }
      });

      // 1. Below 30 BPM rejected
      rig.characteristic.simulateValue(makeHrBuffer(0));
      rig.characteristic.simulateValue(makeHrBuffer(15));
      rig.characteristic.simulateValue(makeHrBuffer(29));
      expect(receivedBpm).toEqual([]);

      // 2. Exact lower boundary: 30 BPM accepted
      rig.characteristic.simulateValue(makeHrBuffer(30));
      expect(receivedBpm).toEqual([30]);

      // 3. Normal values accepted
      rig.characteristic.simulateValue(makeHrBuffer(72));
      rig.characteristic.simulateValue(makeHrBuffer(145));
      expect(receivedBpm).toEqual([30, 72, 145]);

      // 4. Exact upper boundary: 220 BPM accepted
      rig.characteristic.simulateValue(makeHrBuffer(220));
      expect(receivedBpm).toEqual([30, 72, 145, 220]);

      // 5. Above 220 BPM rejected
      rig.characteristic.simulateValue(makeHrBuffer(221));
      rig.characteristic.simulateValue(makeHrBuffer(240));
      rig.characteristic.simulateValue(makeHrBuffer(255));
      expect(receivedBpm).toEqual([30, 72, 145, 220]);

      // 6. 16-bit HR measurement parsing (e.g. 165 BPM in 16-bit representation)
      rig.characteristic.simulateValue(makeHrBuffer(165, /* is16Bit= */ true));
      expect(receivedBpm).toEqual([30, 72, 145, 220, 165]);

      // 7. Malformed / truncated buffer ignored without crashing
      rig.characteristic.simulateValue(new Uint8Array([0x00])); // only 1 byte
      expect(receivedBpm.length).toBe(5);
    });
  });

  // ============================================================================
  // Task 8: 3-Second Real-Time Telemetry Throttle
  // ============================================================================
  describe('Task 8: 3-Second Real-Time Telemetry Throttle', () => {
    it('throttles rapid biometric readings so only 1 event is emitted per 3000ms window', async () => {
      const rig = createMockBluetoothRig();
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          bluetooth: {
            requestDevice: vi.fn().mockResolvedValue(rig.device),
          },
        },
        writable: true,
        configurable: true,
      });

      const eventBus = new EventBus();
      const provider = new WebBluetoothHealthProvider();
      const healthDataService = new HealthDataService(provider, eventBus);
      await healthDataService.connect();

      const emittedEvents: any[] = [];
      eventBus.subscribe('REALTIME_HEART_RATE_UPDATED', (payload) => { emittedEvents.push(payload); });

      // Reading 1 at t = 0ms: emits immediately
      rig.characteristic.simulateValue(makeHrBuffer(120));
      expect(emittedEvents.length).toBe(1);
      expect(emittedEvents[0].heartRate.value).toBe(120);

      // Rapid readings at t = 500ms, 1000ms, 1500ms, 2500ms: must be throttled
      vi.advanceTimersByTime(500);
      rig.characteristic.simulateValue(makeHrBuffer(125));

      vi.advanceTimersByTime(500);
      rig.characteristic.simulateValue(makeHrBuffer(128));

      vi.advanceTimersByTime(500);
      rig.characteristic.simulateValue(makeHrBuffer(130));

      vi.advanceTimersByTime(1000); // total 2500ms elapsed
      rig.characteristic.simulateValue(makeHrBuffer(132));

      expect(emittedEvents.length).toBe(1); // still only the first reading

      // Reading at t = 3000ms (>= 3s window): should emit
      vi.advanceTimersByTime(500); // total 3000ms elapsed
      rig.characteristic.simulateValue(makeHrBuffer(135));

      expect(emittedEvents.length).toBe(2);
      expect(emittedEvents[1].heartRate.value).toBe(135);
    });
  });

  // ============================================================================
  // Task 9: EventBus REALTIME_HEART_RATE_UPDATED payloads
  // ============================================================================
  describe('Task 9: EventBus Payload Structure Validation', () => {
    it('produces strictly validated NormalizedHealthSignal and timestamp payloads', async () => {
      const rig = createMockBluetoothRig();
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          bluetooth: {
            requestDevice: vi.fn().mockResolvedValue(rig.device),
          },
        },
        writable: true,
        configurable: true,
      });

      const eventBus = new EventBus();
      const provider = new WebBluetoothHealthProvider();
      const healthDataService = new HealthDataService(provider, eventBus);
      await healthDataService.connect();

      let emittedPayload: any = null;
      eventBus.subscribe('REALTIME_HEART_RATE_UPDATED', (payload) => {
        emittedPayload = payload;
      });

      const now = Date.now();
      rig.characteristic.simulateValue(makeHrBuffer(138));

      expect(emittedPayload).not.toBeNull();
      expect(emittedPayload.timestamp).toBeGreaterThanOrEqual(now);
      expect(emittedPayload.heartRate).toEqual({
        value: 138,
        capturedAt: expect.any(Number),
        source: 'web_bluetooth_hr',
        freshness: 'fresh',
        confidence: 0.99,
      });
    });
  });

  // ============================================================================
  // Tasks 10 & 11: RealtimeSafetyEngine Integration
  // - normal HR -> no intervention
  // - noisy spike -> no false intervention
  // - sustained high HR -> reduce_volume
  // - sustained critical HR -> stop_and_recover
  // - recovery -> intervention clears correctly
  // ============================================================================
  describe('Tasks 10 & 11: RealtimeSafetyEngine Wearable Integration Pipeline', () => {
    let rig: ReturnType<typeof createMockBluetoothRig>;
    let provider: WebBluetoothHealthProvider;
    let eventBus: EventBus;
    let healthDataService: HealthDataService;
    let intelligenceService: WorkoutIntelligenceService;
    let latestSafetyEvaluation: any = null;
    let safetyEvents: { event: string; payload: any }[] = [];

    beforeEach(async () => {
      rig = createMockBluetoothRig();
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          bluetooth: {
            requestDevice: vi.fn().mockResolvedValue(rig.device),
          },
        },
        writable: true,
        configurable: true,
      });

      eventBus = new EventBus();
      provider = new WebBluetoothHealthProvider();
      healthDataService = new HealthDataService(provider, eventBus);
      intelligenceService = new WorkoutIntelligenceService({}, eventBus, 'test_session_sprint46');

      safetyEvents = [];
      eventBus.subscribe('SAFETY_ZONE_TRANSITIONED', (p) => { safetyEvents.push({ event: 'SAFETY_ZONE_TRANSITIONED', payload: p }); });
      eventBus.subscribe('SAFETY_INTERVENTION_TRIGGERED', (p) => { safetyEvents.push({ event: 'SAFETY_INTERVENTION_TRIGGERED', payload: p }); });
      eventBus.subscribe('SAFETY_INTERVENTION_CLEARED', (p) => { safetyEvents.push({ event: 'SAFETY_INTERVENTION_CLEARED', payload: p }); });
      eventBus.subscribe('HIGH_HR_SUSTAINED', (p) => { safetyEvents.push({ event: 'HIGH_HR_SUSTAINED', payload: p }); });
      eventBus.subscribe('CRITICAL_HR_SUSTAINED', (p) => { safetyEvents.push({ event: 'CRITICAL_HR_SUSTAINED', payload: p }); });

      // Wire real-time HR events into intelligenceService (mirroring useAdaptiveWorkout hook architecture)
      eventBus.subscribe('REALTIME_HEART_RATE_UPDATED', (payload: any) => {
        latestSafetyEvaluation = intelligenceService.evaluateRealtimeSafety(payload.heartRate);
      });

      await healthDataService.connect();
    });

    const feedHrReading = (bpm: number) => {
      rig.characteristic.simulateValue(makeHrBuffer(bpm));
      vi.advanceTimersByTime(3000); // advance past 3s throttle for each reading
    };

    it('Scenario 1: Normal HR (<150 BPM) results in zero safety interventions', () => {
      [120, 128, 135, 142, 148].forEach(feedHrReading);

      expect(latestSafetyEvaluation.state).toBe('normal');
      expect(latestSafetyEvaluation.isEscalated).toBe(false);
      expect(latestSafetyEvaluation.recommendation).toBeUndefined();
      expect(safetyEvents.filter((e) => e.event === 'SAFETY_INTERVENTION_TRIGGERED')).toHaveLength(0);
    });

    it('Scenario 2: Noisy transient spikes (isolated high/critical readings) do NOT trigger false interventions', () => {
      // Normal baseline (3 readings to transition from initial unavailable to normal)
      feedHrReading(130);
      feedHrReading(130);
      feedHrReading(132);
      expect(latestSafetyEvaluation.state).toBe('normal');

      // Isolated spike 1: 195 BPM (critical)
      feedHrReading(195);
      expect(latestSafetyEvaluation.isEscalated).toBe(false);

      // Back to normal
      feedHrReading(130);
      expect(latestSafetyEvaluation.state).toBe('normal');
      expect(latestSafetyEvaluation.isEscalated).toBe(false);

      // Double spike: 178 BPM for 2 readings (requires 3 to escalate)
      feedHrReading(178);
      feedHrReading(178);
      expect(latestSafetyEvaluation.isEscalated).toBe(false);

      // Drops back to normal
      feedHrReading(135);
      expect(latestSafetyEvaluation.state).toBe('normal');
      expect(latestSafetyEvaluation.isEscalated).toBe(false);
      expect(safetyEvents.filter((e) => e.event === 'SAFETY_INTERVENTION_TRIGGERED')).toHaveLength(0);
    });

    it('Scenario 3: Sustained high HR (170-184 BPM for 3 readings) triggers reduce_volume', () => {
      // Baseline
      feedHrReading(140);

      // High readings: 175 BPM
      feedHrReading(175); // reading 1
      expect(latestSafetyEvaluation.isEscalated).toBe(false);

      feedHrReading(176); // reading 2
      expect(latestSafetyEvaluation.isEscalated).toBe(false);

      feedHrReading(178); // reading 3 -> ESCALATES!
      expect(latestSafetyEvaluation.state).toBe('high');
      expect(latestSafetyEvaluation.isEscalated).toBe(true);
      expect(latestSafetyEvaluation.recommendation).toBe('reduce_volume');

      expect(safetyEvents.some((e) => e.event === 'HIGH_HR_SUSTAINED')).toBe(true);
      expect(safetyEvents.some((e) => e.event === 'SAFETY_INTERVENTION_TRIGGERED' && e.payload.intervention === 'reduce_volume')).toBe(true);
    });

    it('Scenario 4: Sustained critical HR (>=185 BPM for 3 readings) triggers stop_and_recover', () => {
      // Baseline
      feedHrReading(145);

      // Critical readings: 192 BPM
      feedHrReading(190); // reading 1
      expect(latestSafetyEvaluation.isEscalated).toBe(false);

      feedHrReading(192); // reading 2
      expect(latestSafetyEvaluation.isEscalated).toBe(false);

      feedHrReading(194); // reading 3 -> CRITICAL ESCALATION!
      expect(latestSafetyEvaluation.state).toBe('critical');
      expect(latestSafetyEvaluation.isEscalated).toBe(true);
      expect(latestSafetyEvaluation.recommendation).toBe('stop_and_recover');

      expect(safetyEvents.some((e) => e.event === 'CRITICAL_HR_SUSTAINED')).toBe(true);
      expect(safetyEvents.some((e) => e.event === 'SAFETY_INTERVENTION_TRIGGERED' && e.payload.intervention === 'stop_and_recover')).toBe(true);
    });

    it('Scenario 5: Recovery instantly clears intervention without waiting for debounce', () => {
      // Escalate to critical
      feedHrReading(190);
      feedHrReading(190);
      feedHrReading(190);
      expect(latestSafetyEvaluation.isEscalated).toBe(true);
      expect(latestSafetyEvaluation.recommendation).toBe('stop_and_recover');

      // Athlete rests, HR immediately drops to safe zone (130 BPM)
      feedHrReading(130);

      // Intervention clears immediately!
      expect(latestSafetyEvaluation.state).toBe('normal');
      expect(latestSafetyEvaluation.isEscalated).toBe(false);
      expect(latestSafetyEvaluation.recommendation).toBeUndefined();

      expect(safetyEvents.some((e) => e.event === 'SAFETY_INTERVENTION_CLEARED')).toBe(true);
    });
  });
});
