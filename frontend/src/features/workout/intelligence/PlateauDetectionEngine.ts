/**
 * FitNova AI — Workout Plateau Detection Engine
 * Pure TypeScript engine identifying stalled strength progression, volume plateaus,
 * repeated failures at identical loads, and high-RPE stagnation.
 * Zero UI/React code.
 */

import type { PlateauAnalysis, PlateauIntervention } from './types.ts';

export interface ExerciseSessionLog {
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
  setsCount: number;
  totalVolumeKg: number;
  averageRpe: number;
  targetReps?: number;
  date?: string;
}

export class PlateauDetectionEngine {
  /**
   * Evaluates historical performance for a specific exercise to detect plateaus.
   * Requires at least 3 sessions for accurate trend detection.
   */
  detectExercisePlateau(
    exerciseId: string,
    exerciseName: string,
    history: ExerciseSessionLog[]
  ): PlateauAnalysis {
    // If fewer than 3 sessions, insufficient data to establish a plateau
    if (!history || history.length < 3) {
      return {
        isPlateaued: false,
        exerciseId,
        exerciseName,
        sessionsStagnant: history?.length ?? 0,
        stalledMetric: 'none',
        averageRpe: history?.[history.length - 1]?.averageRpe ?? 8.0,
        intervention: 'maintain current load',
        rationale: 'Insufficient session history to determine adaptation trends (minimum 3 sessions required).',
        confidence: 0.7,
      };
    }

    // Take the last 3 to 5 sessions
    const recentLogs = history.slice(-5);
    const windowSize = recentLogs.length;

    const weights = recentLogs.map((l) => l.weightKg);
    const reps = recentLogs.map((l) => l.reps);
    const volumes = recentLogs.map((l) => l.totalVolumeKg);
    const rpes = recentLogs.map((l) => l.averageRpe ?? 8.0);

    const latestRpe = rpes[rpes.length - 1];
    const avgRecentRpe = Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10;

    // Check Condition 1: Repeated failure at the same weight (missed targets)
    const repeatedFailures = recentLogs.filter(
      (l) => l.targetReps !== undefined && l.reps < l.targetReps
    ).length;
    const isRepeatedFailure = repeatedFailures >= 2 && weights[weights.length - 1] === weights[weights.length - 2];

    // Check Condition 2: Stalled Strength (same weight & same or lower reps for 3+ sessions)
    const last3Weights = weights.slice(-3);
    const last3Reps = reps.slice(-3);
    const isWeightStagnant = last3Weights.every((w) => w === last3Weights[0]);
    const isRepsStagnant = last3Reps.every((r) => r <= last3Reps[0]);
    const isStrengthStalled = isWeightStagnant && isRepsStagnant;

    // Check Condition 3: Stalled Volume (volume not increasing over 3 sessions)
    const last3Volumes = volumes.slice(-3);
    const isVolumeFlatOrDecreasing =
      last3Volumes[2] <= last3Volumes[0] && last3Volumes[1] <= last3Volumes[0] * 1.02;

    // Check Condition 4: Excessive RPE without performance gain
    const isExcessiveRpe = avgRecentRpe >= 9.0 && isStrengthStalled;

    let isPlateaued = false;
    let stalledMetric: 'strength' | 'volume' | 'reps' | 'rpe_exhaustion' | 'none' = 'none';
    let intervention: PlateauIntervention = 'maintain current load';
    let rationale = '';
    let confidence = 0.85;

    if (isRepeatedFailure && avgRecentRpe >= 9.0) {
      isPlateaued = true;
      stalledMetric = 'reps';
      intervention = windowSize >= 4 ? 'deload' : 'reduce volume';
      rationale = `Target reps missed across consecutive sessions at ${weights[weights.length - 1]}kg with high exertion (avg RPE ${avgRecentRpe}). Fatigue has surpassed adaptive capacity.`;
      confidence = 0.94;
    } else if (isExcessiveRpe) {
      isPlateaued = true;
      stalledMetric = 'rpe_exhaustion';
      intervention = windowSize >= 4 ? 'change exercise' : 'deload';
      rationale = `Effort has escalated to near-maximum (avg RPE ${avgRecentRpe}) without strength progression across ${windowSize} sessions. Neurological resensitization needed.`;
      confidence = 0.95;
    } else if (isStrengthStalled && windowSize >= 4) {
      isPlateaued = true;
      stalledMetric = 'strength';
      intervention = 'change exercise';
      rationale = `Load and repetitions have stalled at ${weights[weights.length - 1]}kg for ${windowSize} consecutive sessions. Swap to a biomechanically compatible variation to stimulate new adaptation.`;
      confidence = 0.92;
    } else if (isStrengthStalled) {
      isPlateaued = true;
      stalledMetric = 'strength';
      intervention = 'change rep range';
      rationale = `Strength output is flat at ${weights[weights.length - 1]}kg for 3 sessions. Shift to a complementary rep range (e.g. 5-6 reps for strength or 10-12 for hypertrophy) to unlock progress.`;
      confidence = 0.9;
    } else if (isVolumeFlatOrDecreasing && !isStrengthStalled) {
      isPlateaued = true;
      stalledMetric = 'volume';
      intervention = 'increase reps';
      rationale = `Total training volume has leveled off. Keep working weight steady and aim to add +1 to +2 repetitions per set.`;
      confidence = 0.88;
    } else {
      isPlateaued = false;
      stalledMetric = 'none';
      intervention = 'maintain current load';
      rationale = `Performance is tracking normally. Steady adaptation observed across the last ${windowSize} sessions.`;
      confidence = 0.92;
    }

    return {
      isPlateaued,
      exerciseId,
      exerciseName,
      sessionsStagnant: isPlateaued ? windowSize : 0,
      stalledMetric,
      averageRpe: latestRpe,
      intervention,
      rationale,
      confidence,
    };
  }

  /**
   * Scans a set of exercises and returns only those that have hit an active plateau.
   */
  detectMultiplePlateaus(
    exercisesHistory: Record<string, { name: string; history: ExerciseSessionLog[] }>
  ): PlateauAnalysis[] {
    const plateaus: PlateauAnalysis[] = [];

    for (const [exerciseId, data] of Object.entries(exercisesHistory)) {
      const analysis = this.detectExercisePlateau(exerciseId, data.name, data.history);
      if (analysis.isPlateaued) {
        plateaus.push(analysis);
      }
    }

    return plateaus;
  }
}
