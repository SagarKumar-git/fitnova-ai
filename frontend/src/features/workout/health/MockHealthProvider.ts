import type { IHealthProvider, ProviderLifecycleState } from './IHealthProvider.ts';
import type { ComprehensiveHealthDataset } from './healthTypes.ts';
import { ConfidenceCalibrationEngine } from '../intelligence/ConfidenceCalibrationEngine.ts';

export class MockHealthProvider implements IHealthProvider {
  readonly providerName = 'mock_wearable';
  private calibrationEngine = new ConfidenceCalibrationEngine();
  
  private _state: ProviderLifecycleState = 'unavailable';
  private listeners: Set<(state: ProviderLifecycleState) => void> = new Set();

  private realTimeListeners: Set<(dataset: Partial<ComprehensiveHealthDataset>) => void> = new Set();

  get state(): ProviderLifecycleState {
    return this._state;
  }

  private setState(newState: ProviderLifecycleState) {
    this._state = newState;
    this.listeners.forEach((l) => l(newState));
  }

  onStateChange(listener: (state: ProviderLifecycleState) => void): void {
    this.listeners.add(listener);
  }

  offStateChange(listener: (state: ProviderLifecycleState) => void): void {
    this.listeners.delete(listener);
  }

  onRealTimeData(listener: (dataset: Partial<ComprehensiveHealthDataset>) => void): void {
    this.realTimeListeners.add(listener);
  }

  offRealTimeData(listener: (dataset: Partial<ComprehensiveHealthDataset>) => void): void {
    this.realTimeListeners.delete(listener);
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async connect(): Promise<void> {
    if (this._state === 'connected') return;
    this.setState('connecting');
    // simulate connection delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    this.setState('connected');
  }

  async disconnect(): Promise<void> {
    this.setState('unavailable');
  }

  async getComprehensiveDataset(): Promise<ComprehensiveHealthDataset> {
    const now = Date.now();
    // Simulate data captured 1 hour ago (fresh)
    const capturedAt = now - 3600000;
    
    return {
      hrv: this.calibrationEngine.normalizeSignal(62, capturedAt, this.providerName, 0.95),
      restingHeartRate: this.calibrationEngine.normalizeSignal(58, capturedAt, this.providerName, 0.95),
      sleepDuration: this.calibrationEngine.normalizeSignal(7.5, capturedAt - 7200000, this.providerName, 0.90),
      sleepQuality: this.calibrationEngine.normalizeSignal(88, capturedAt - 7200000, this.providerName, 0.85),
      recoveryScore: this.calibrationEngine.normalizeSignal(86, capturedAt, this.providerName, 0.90),
      soreness: this.calibrationEngine.normalizeSignal(3, capturedAt, 'user_input', 0.80),
      fatigue: this.calibrationEngine.normalizeSignal(4, capturedAt, 'user_input', 0.80),
      trainingLoad: this.calibrationEngine.normalizeSignal(1.1, capturedAt, this.providerName, 0.85),
      acuteChronicWorkload: this.calibrationEngine.normalizeSignal(1.05, capturedAt, this.providerName, 0.85),
      heartRate: this.calibrationEngine.normalizeSignal(60, now - 300000, this.providerName, 0.98),
      workoutRecoveryTime: this.calibrationEngine.normalizeSignal(24, capturedAt, this.providerName, 0.80),
    };
  }
}
