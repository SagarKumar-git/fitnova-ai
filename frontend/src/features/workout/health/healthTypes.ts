export type DataFreshnessState = 'fresh' | 'aging' | 'stale' | 'unavailable';

export interface NormalizedHealthSignal<T = number> {
  value: T;
  capturedAt: number;
  source: string;
  freshness: DataFreshnessState;
  confidence: number; // 0.0 to 1.0
}

export const REALTIME_HR_MAX_AGE_MS = 5000;

export interface ComprehensiveHealthDataset {
  hrv: NormalizedHealthSignal<number>;
  restingHeartRate: NormalizedHealthSignal<number>;
  sleepDuration: NormalizedHealthSignal<number>;
  sleepQuality: NormalizedHealthSignal<number>;
  recoveryScore: NormalizedHealthSignal<number>;
  soreness: NormalizedHealthSignal<number>;
  fatigue: NormalizedHealthSignal<number>;
  trainingLoad: NormalizedHealthSignal<number>;
  acuteChronicWorkload: NormalizedHealthSignal<number>;
  heartRate: NormalizedHealthSignal<number>;
  workoutRecoveryTime: NormalizedHealthSignal<number>;
}
