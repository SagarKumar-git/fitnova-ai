/**
 * FitNova AI — Progression Engine Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { ProgressionEngine } from '../intelligence/ProgressionEngine.ts';
import type { WorkoutSet } from '../models/index.ts';

describe('Workout OS — ProgressionEngine', () => {
  const engine = new ProgressionEngine();

  it('recommends maintain baseline when no completed sets are available', () => {
    const rec = engine.calculateProgression({
      exerciseId: 'ex_bench',
      exerciseName: 'Barbell Bench Press',
      previousWeightKg: 80,
      previousReps: 8,
      targetReps: 8,
      completedSets: [],
      isCompound: true,
    });

    expect(rec.action).toBe('maintain');
    expect(rec.recommendedWeightKg).toBe(80);
    expect(rec.recommendedReps).toBe(8);
    expect(rec.weightDeltaKg).toBe(0);
    expect(rec.repsDelta).toBe(0);
  });

  it('triggers progressive overload weight increase when all target reps are met cleanly (2-for-2 rule)', () => {
    const sets: WorkoutSet[] = [
      {
        id: 's1',
        setNumber: 1,
        type: 'normal',
        targetReps: 8,
        actualReps: 8,
        targetWeight: 80,
        actualWeight: 80,
        rpe: 8.0,
        completed: true,
        skipped: false,
      },
      {
        id: 's2',
        setNumber: 2,
        type: 'normal',
        targetReps: 8,
        actualReps: 8,
        targetWeight: 80,
        actualWeight: 80,
        rpe: 8.5,
        completed: true,
        skipped: false,
      },
      {
        id: 's3',
        setNumber: 3,
        type: 'normal',
        targetReps: 8,
        actualReps: 8,
        targetWeight: 80,
        actualWeight: 80,
        rpe: 8.5,
        completed: true,
        skipped: false,
      },
    ];

    const rec = engine.calculateProgression({
      exerciseId: 'ex_bench',
      exerciseName: 'Barbell Bench Press',
      previousWeightKg: 80,
      previousReps: 8,
      targetReps: 8,
      completedSets: sets,
      lastRpe: 8.5,
      isCompound: true,
    });

    expect(rec.action).toBe('weight_increase');
    expect(rec.weightDeltaKg).toBe(2.5); // Upper body compound increment
    expect(rec.recommendedWeightKg).toBe(82.5);
    expect(rec.confidence).toBeGreaterThan(0.9);
  });

  it('applies a larger overload jump when sets moved effortlessly (low RPE <= 7.0)', () => {
    const sets: WorkoutSet[] = [
      {
        id: 's1',
        setNumber: 1,
        type: 'normal',
        targetReps: 8,
        actualReps: 10,
        targetWeight: 80,
        actualWeight: 80,
        rpe: 6.5,
        completed: true,
        skipped: false,
      },
      {
        id: 's2',
        setNumber: 2,
        type: 'normal',
        targetReps: 8,
        actualReps: 9,
        targetWeight: 80,
        actualWeight: 80,
        rpe: 7.0,
        completed: true,
        skipped: false,
      },
    ];

    const rec = engine.calculateProgression({
      exerciseId: 'ex_bench',
      exerciseName: 'Barbell Bench Press',
      previousWeightKg: 80,
      previousReps: 8,
      targetReps: 8,
      completedSets: sets,
      lastRpe: 7.0,
      isCompound: true,
    });

    expect(rec.action).toBe('weight_increase');
    expect(rec.weightDeltaKg).toBe(3.75); // 2.5 * 1.5
    expect(rec.recommendedWeightKg).toBe(83.8); // 80 + 3.75 rounded to 1 decimal
    expect(rec.confidence).toBe(0.95);
  });

  it('uses isolation increments (+1.25kg) for isolation exercises', () => {
    const sets: WorkoutSet[] = [
      {
        id: 's1',
        setNumber: 1,
        type: 'normal',
        targetReps: 12,
        actualReps: 12,
        targetWeight: 14,
        actualWeight: 14,
        rpe: 8.0,
        completed: true,
        skipped: false,
      },
    ];

    const rec = engine.calculateProgression({
      exerciseId: 'ex_lateral_raise',
      exerciseName: 'Lateral Raise',
      previousWeightKg: 14,
      previousReps: 12,
      targetReps: 12,
      completedSets: sets,
      lastRpe: 8.0,
      isCompound: false,
    });

    expect(rec.action).toBe('weight_increase');
    expect(rec.weightDeltaKg).toBe(1.25);
    expect(rec.recommendedWeightKg).toBe(15.3);
  });

  it('recommends rep_increase when close to target reps to build volume capacity', () => {
    const sets: WorkoutSet[] = [
      {
        id: 's1',
        setNumber: 1,
        type: 'normal',
        targetReps: 10,
        actualReps: 10,
        targetWeight: 50,
        actualWeight: 50,
        rpe: 8.5,
        completed: true,
        skipped: false,
      },
      {
        id: 's2',
        setNumber: 2,
        type: 'normal',
        targetReps: 10,
        actualReps: 8,
        targetWeight: 50,
        actualWeight: 50,
        rpe: 9.0,
        completed: true,
        skipped: false,
      },
    ];

    // avg reps is 9 (targetReps - 1), RPE <= 9.0
    const rec = engine.calculateProgression({
      exerciseId: 'ex_ohp',
      exerciseName: 'Overhead Press',
      previousWeightKg: 50,
      previousReps: 9,
      targetReps: 10,
      completedSets: sets,
      lastRpe: 9.0,
      isCompound: true,
    });

    expect(rec.action).toBe('rep_increase');
    expect(rec.repsDelta).toBe(1);
    expect(rec.recommendedReps).toBe(10);
    expect(rec.recommendedWeightKg).toBe(50);
  });

  it('recommends weight_decrease (deload) when hitting exhaustion and missing targets severely', () => {
    const sets: WorkoutSet[] = [
      {
        id: 's1',
        setNumber: 1,
        type: 'normal',
        targetReps: 10,
        actualReps: 6,
        targetWeight: 100,
        actualWeight: 100,
        rpe: 9.5,
        completed: true,
        skipped: false,
      },
      {
        id: 's2',
        setNumber: 2,
        type: 'normal',
        targetReps: 10,
        actualReps: 5,
        targetWeight: 100,
        actualWeight: 100,
        rpe: 10.0,
        completed: true,
        skipped: false,
      },
    ];

    // avg reps is 5.5 (< target 10 - 2), RPE >= 9.5
    const rec = engine.calculateProgression({
      exerciseId: 'ex_squat',
      exerciseName: 'Barbell Squat',
      previousWeightKg: 100,
      previousReps: 10,
      targetReps: 10,
      completedSets: sets,
      lastRpe: 10.0,
      isCompound: true,
    });

    expect(rec.action).toBe('weight_decrease');
    expect(rec.weightDeltaKg).toBe(-2.5);
    expect(rec.recommendedWeightKg).toBe(97.5);
    expect(rec.reason).toContain('muscular fatigue detected');
  });
});
