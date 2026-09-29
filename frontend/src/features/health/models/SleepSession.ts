/**
 * FitNova AI — Sleep Session Domain Model
 * Tracks comprehensive sleep architecture, duration, efficiency, and sleep debt.
 * Zero UI/React dependencies.
 */

import type { SleepStage } from './SleepStage.ts';

export interface SleepSession {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: number;
  endTime: number;
  totalDurationMinutes: number;
  timeAsleepMinutes: number;
  timeAwakeMinutes: number;
  deepMinutes: number;
  remMinutes: number;
  lightMinutes: number;
  efficiencyPct: number; // 0 to 100
  latencyMinutes?: number;
  sleepScore?: number; // 0 to 100
  stages: SleepStage[];
  source: string;
}
