/**
 * FitNova AI — Mock Workout Repository
 * In-memory repository with local storage persistence for offline active sessions.
 */

import type { IWorkoutRepository } from './IWorkoutRepository.ts';
import type {
  Workout,
  Exercise,
  WorkoutSession,
  WorkoutHistoryEntry,
  PersonalRecord,
  WorkoutStats,
  WorkoutRecommendation,
} from '../models/index.ts';
import type {
  ExerciseFilter,
  WorkoutFilter,
  WorkoutHistoryQuery,
} from '../types/contracts.ts';
import {
  MOCK_EXERCISES,
  MOCK_WORKOUTS,
  MOCK_WORKOUT_HISTORY,
  MOCK_PERSONAL_RECORDS,
  MOCK_WORKOUT_STATS,
  MOCK_RECOMMENDATIONS,
} from '../mocks/index.ts';
import { WORKOUT_CONSTANTS } from '../constants/index.ts';
import type { StorageService } from '../../../platform/storage/StorageService.ts';

export interface MockWorkoutRepositoryConfig {
  storageService?: StorageService;
  initialWorkouts?: Workout[];
  initialExercises?: Exercise[];
  initialHistory?: WorkoutHistoryEntry[];
  initialPRs?: PersonalRecord[];
  initialStats?: WorkoutStats;
}

export class MockWorkoutRepository implements IWorkoutRepository {
  private workouts: Workout[];
  private exercises: Exercise[];
  private history: WorkoutHistoryEntry[];
  private personalRecords: PersonalRecord[];
  private stats: WorkoutStats;
  private activeSessionInMemory: WorkoutSession | null = null;
  private readonly storageService?: StorageService;

  constructor(config: MockWorkoutRepositoryConfig = {}) {
    this.storageService = config.storageService;
    this.workouts = config.initialWorkouts ? [...config.initialWorkouts] : [...MOCK_WORKOUTS];
    this.exercises = config.initialExercises ? [...config.initialExercises] : [...MOCK_EXERCISES];
    this.history = config.initialHistory ? [...config.initialHistory] : [...MOCK_WORKOUT_HISTORY];
    this.personalRecords = config.initialPRs ? [...config.initialPRs] : [...MOCK_PERSONAL_RECORDS];
    this.stats = config.initialStats ? { ...config.initialStats } : { ...MOCK_WORKOUT_STATS };
  }

  async getWorkouts(filter?: WorkoutFilter): Promise<Workout[]> {
    let result = [...this.workouts];

    if (filter?.query) {
      const q = filter.query.toLowerCase();
      result = result.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.description.toLowerCase().includes(q) ||
          w.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (filter?.goal) {
      result = result.filter((w) => w.goal === filter.goal);
    }

    if (filter?.difficulty) {
      result = result.filter((w) => w.difficulty === filter.difficulty);
    }

    if (filter?.muscleGroup) {
      result = result.filter((w) =>
        w.targetMuscleGroups.includes(filter.muscleGroup!)
      );
    }

    if (filter?.maxDurationMinutes) {
      result = result.filter(
        (w) => w.estimatedDurationMinutes <= filter.maxDurationMinutes!
      );
    }

    if (filter?.tags && filter.tags.length > 0) {
      result = result.filter((w) =>
        filter.tags!.some((tag) => w.tags.includes(tag))
      );
    }

    return result;
  }

  async getWorkoutById(id: string): Promise<Workout | null> {
    const found = this.workouts.find((w) => w.id === id);
    return found ? { ...found } : null;
  }

  async getExercises(filter?: ExerciseFilter): Promise<Exercise[]> {
    let result = [...this.exercises];

    if (filter?.query) {
      const q = filter.query.toLowerCase();
      result = result.filter(
        (ex) =>
          ex.name.toLowerCase().includes(q) ||
          ex.description.toLowerCase().includes(q)
      );
    }

    if (filter?.muscleGroup) {
      result = result.filter(
        (ex) =>
          ex.primaryMuscleGroup === filter.muscleGroup ||
          ex.secondaryMuscleGroups.includes(filter.muscleGroup!)
      );
    }

    if (filter?.equipment) {
      result = result.filter((ex) => ex.equipment === filter.equipment);
    }

    if (filter?.difficulty) {
      result = result.filter((ex) => ex.difficulty === filter.difficulty);
    }

    return result;
  }

  async getExerciseById(id: string): Promise<Exercise | null> {
    const found = this.exercises.find((ex) => ex.id === id);
    return found ? { ...found } : null;
  }

  async getWorkoutHistory(query?: WorkoutHistoryQuery): Promise<WorkoutHistoryEntry[]> {
    let result = [...this.history];

    if (query?.workoutId) {
      result = result.filter((h) => h.workoutId === query.workoutId);
    }

    if (query?.startDate) {
      result = result.filter((h) => h.date >= query.startDate!);
    }

    if (query?.endDate) {
      result = result.filter((h) => h.date <= query.endDate!);
    }

    // Sort descending by completion time
    result.sort((a, b) => b.completedAt - a.completedAt);

    if (query?.offset !== undefined || query?.limit !== undefined) {
      const start = query.offset ?? 0;
      const end = query.limit ? start + query.limit : undefined;
      result = result.slice(start, end);
    }

    return result;
  }

  async getPersonalRecords(exerciseId?: string): Promise<PersonalRecord[]> {
    if (exerciseId) {
      return this.personalRecords.filter((pr) => pr.exerciseId === exerciseId);
    }
    return [...this.personalRecords];
  }

  async getWorkoutStats(): Promise<WorkoutStats> {
    return { ...this.stats };
  }

  async getRecommendations(): Promise<WorkoutRecommendation[]> {
    return [...MOCK_RECOMMENDATIONS];
  }

  async saveWorkoutSession(session: WorkoutSession): Promise<void> {
    // Record into history
    const historyEntry: WorkoutHistoryEntry = {
      id: `hist_${Date.now()}_${session.id}`,
      sessionId: session.id,
      workoutId: session.workoutId,
      workoutName: session.workoutName,
      date: new Date(session.startedAt).toISOString().split('T')[0],
      completedAt: session.endedAt ?? Date.now(),
      durationSeconds: session.durationSeconds,
      totalVolume: session.totalVolume,
      totalSets: session.exercises.reduce((acc, ex) => acc + ex.sets.length, 0),
      completedSets: session.exercises.reduce(
        (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
        0
      ),
      exercisesCount: session.exercises.length,
      personalRecordsCount: session.personalRecords.length,
      rating: session.rating,
      notes: session.notes,
      exercises: session.exercises.map((ex) => {
        let bestReps = 0;
        let bestWeight = 0;
        let vol = 0;

        for (const s of ex.sets) {
          if (!s.completed) continue;
          const r = s.actualReps ?? s.targetReps;
          const w = s.actualWeight ?? s.targetWeight;
          vol += r * w;
          if (w > bestWeight || (w === bestWeight && r > bestReps)) {
            bestWeight = w;
            bestReps = r;
          }
        }

        return {
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          setsCount: ex.sets.length,
          bestSet: { reps: bestReps, weight: bestWeight },
          volume: vol,
        };
      }),
    };

    this.history.unshift(historyEntry);

    // Save any new PRs
    for (const pr of session.personalRecords) {
      const idx = this.personalRecords.findIndex(
        (p) => p.exerciseId === pr.exerciseId && p.metric === pr.metric
      );
      if (idx >= 0) {
        this.personalRecords[idx] = pr;
      } else {
        this.personalRecords.push(pr);
      }
    }

    // Increment stats
    this.stats.totalWorkouts += 1;
    this.stats.totalVolumeKg += session.totalVolume;
    this.stats.totalDurationMinutes += Math.round(session.durationSeconds / 60);
    this.stats.totalPersonalRecords += session.personalRecords.length;
  }

  async getWorkoutSession(sessionId: string): Promise<WorkoutSession | null> {
    if (this.activeSessionInMemory && this.activeSessionInMemory.id === sessionId) {
      return { ...this.activeSessionInMemory };
    }

    if (this.storageService) {
      const stored = this.storageService.getJSON<WorkoutSession>(
        WORKOUT_CONSTANTS.STORAGE_KEYS.ACTIVE_SESSION
      );
      if (stored && stored.id === sessionId) {
        return stored;
      }
    }

    return null;
  }

  async updateWorkoutSession(session: WorkoutSession): Promise<void> {
    await this.saveActiveSession(session);
  }

  async getActiveSession(): Promise<WorkoutSession | null> {
    if (this.storageService) {
      const stored = this.storageService.getJSON<WorkoutSession>(
        WORKOUT_CONSTANTS.STORAGE_KEYS.ACTIVE_SESSION
      );
      if (stored) {
        this.activeSessionInMemory = stored;
        return stored;
      }
    }
    return this.activeSessionInMemory;
  }

  async saveActiveSession(session: WorkoutSession): Promise<void> {
    this.activeSessionInMemory = { ...session };
    if (this.storageService) {
      this.storageService.setJSON(
        WORKOUT_CONSTANTS.STORAGE_KEYS.ACTIVE_SESSION,
        session
      );
    }
  }

  async clearActiveSession(): Promise<void> {
    this.activeSessionInMemory = null;
    if (this.storageService) {
      this.storageService.remove(WORKOUT_CONSTANTS.STORAGE_KEYS.ACTIVE_SESSION);
    }
  }
}
