/**
 * FitNova AI — Sleep Stage Domain Model
 * Tracks individual sleep phase intervals (deep, REM, light, awake).
 * Zero UI/React dependencies.
 */

import type { SleepStageType } from '../types/healthEnums.ts';

export interface SleepStage {
  stage: SleepStageType;
  startTime: number;
  endTime: number;
  durationMinutes: number;
}
