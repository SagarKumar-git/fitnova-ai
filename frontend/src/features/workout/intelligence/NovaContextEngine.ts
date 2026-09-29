/**
 * FitNova AI — Nova Context Engine
 * Assembles a unified domain context contract for Nova Workout Intelligence.
 * Designed for consumption by both client-side heuristics and future FastAPI/Gemini endpoints.
 * Zero UI/React code.
 */

import type {
  NovaUnifiedContext,
  ProgressionRecommendation,
  ExerciseSubstitution,
  PlateauAnalysis,
  WorkoutReadiness,
} from './types.ts';
import type { WorkoutSession } from '../models/WorkoutSession.ts';
import type { WorkoutHistoryEntry } from '../models/WorkoutHistory.ts';
import type { PersonalRecord } from '../models/PersonalRecord.ts';

export interface NovaContextInput {
  session?: WorkoutSession | null;
  activeExerciseIndex?: number;
  activeSetIndex?: number;
  readiness?: WorkoutReadiness | null;
  historyEntries?: WorkoutHistoryEntry[];
  personalRecords?: PersonalRecord[];
  progressionRecommendation?: ProgressionRecommendation | null;
  substitutionOptions?: ExerciseSubstitution[];
  plateauAlerts?: PlateauAnalysis[];
}

export class NovaContextEngine {
  buildUnifiedContext(input: NovaContextInput): NovaUnifiedContext {
    const {
      session = null,
      activeExerciseIndex = 0,
      activeSetIndex = 0,
      readiness,
      historyEntries = [],
      personalRecords = [],
      progressionRecommendation = null,
      substitutionOptions = [],
      plateauAlerts = [],
    } = input;

    // 1. Current Exercise & Set Resolution
    const currentExercise = session?.exercises?.[activeExerciseIndex] ?? null;
    const currentSet = currentExercise?.sets?.[activeSetIndex] ?? null;

    // 2. Previous Performance on current exercise
    let previousPerformance: { weight: number; reps: number; rpe?: number } | null = null;
    if (currentExercise) {
      // Check prior set in current workout first
      const priorSet = currentExercise.sets
        .slice(0, activeSetIndex)
        .reverse()
        .find((s) => s.completed);

      if (priorSet && priorSet.actualWeight && priorSet.actualReps) {
        previousPerformance = {
          weight: priorSet.actualWeight,
          reps: priorSet.actualReps,
          rpe: priorSet.rpe,
        };
      } else {
        // Fallback to previous workout session history
        const historicalMatch = historyEntries
          .flatMap((h) => h.exercises)
          .find((e) => e.exerciseId === currentExercise.exerciseId);

        if (historicalMatch?.bestSet) {
          previousPerformance = {
            weight: historicalMatch.bestSet.weight,
            reps: historicalMatch.bestSet.reps,
          };
        }
      }
    }

    // 3. Recovery & Physiology
    const sleepHours = readiness?.sleepHours ?? 7.5;
    const sleepQuality: 'optimal' | 'moderate' | 'poor' =
      sleepHours >= 7.0 ? 'optimal' : sleepHours >= 5.5 ? 'moderate' : 'poor';

    const sorenessScore = readiness?.sorenessScore ?? 2;
    const highSorenessMuscles = readiness?.muscleSorenessMap
      ? Object.entries(readiness.muscleSorenessMap)
          .filter(([, s]) => s >= 6)
          .map(([m]) => m)
      : [];

    const recoveryScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          100 -
            sorenessScore * 3.5 -
            (readiness?.fatigueScore ?? 2) * 4 -
            (sleepHours < 7 ? (7 - sleepHours) * 8 : 0)
        )
      )
    );

    // 4. Training History Summary
    const totalSessionsCompleted = historyEntries.length;
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const weeklyFrequency = historyEntries.filter(
      (h) => h.completedAt && h.completedAt >= oneWeekAgo
    ).length;

    // 5. Relevant PR History
    const prHistory = personalRecords.slice(0, 5).map((pr) => ({
      exerciseName: pr.exerciseName,
      metric: pr.metric,
      value: pr.value,
    }));

    // 6. Substitution Options simplified
    const formattedSubstitutions = substitutionOptions.map((sub) => ({
      id: sub.substituteExercise.id,
      name: sub.substituteExercise.name,
      matchScore: Math.round(sub.matchScore * 100),
      rationale: sub.reason,
    }));

    return {
      currentWorkout: session,
      currentExercise: currentExercise
        ? {
            exerciseId: currentExercise.exerciseId,
            name: currentExercise.exerciseName,
            targetSets: currentExercise.targetSets,
            targetReps: currentExercise.targetReps,
          }
        : null,
      currentSet,
      previousPerformance,
      rpe: currentSet?.rpe ?? null,
      recoveryScore,
      sleep: {
        hours: sleepHours,
        quality: sleepQuality,
      },
      soreness: {
        score: sorenessScore,
        affectedMuscles: highSorenessMuscles,
      },
      trainingHistory: {
        totalSessionsCompleted,
        weeklyFrequency,
        lastWorkoutDate: historyEntries[0]?.date,
      },
      prHistory,
      progressionRecommendation,
      substitutionOptions: formattedSubstitutions,
      plateauAlerts,
    };
  }
}
