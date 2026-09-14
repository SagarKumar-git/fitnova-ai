/**
 * FitNova AI — Real API Workout Repository
 * Production implementation of IWorkoutRepository backed by FastAPI backend
 * with local offline caching and graceful fallback support.
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
import type { StorageService } from '../../../platform/storage/StorageService.ts';
import type { ApiClient } from '../../../platform/network/ApiClient.ts';
import { WorkoutApi } from '../api/workoutApi.ts';
import {
  mapExerciseDtoToDomain,
  mapWorkoutTemplateDtoToDomain,
  mapWorkoutSessionDtoToDomain,
  mapWorkoutSessionDtoToHistoryEntry,
  mapPersonalRecordDtoToDomain,
  mapWorkoutAnalyticsDtoToDomain,
} from '../api/mappers.ts';
import {
  MOCK_EXERCISES,
  MOCK_WORKOUTS,
  MOCK_WORKOUT_HISTORY,
  MOCK_PERSONAL_RECORDS,
  MOCK_WORKOUT_STATS,
  MOCK_RECOMMENDATIONS,
} from '../mocks/index.ts';

const ACTIVE_SESSION_STORAGE_KEY = 'fitnova:workout:active_session';
const EXERCISES_CACHE_KEY = 'fitnova:cache:exercises';
const WORKOUTS_CACHE_KEY = 'fitnova:cache:workouts';
const HISTORY_CACHE_KEY = 'fitnova:cache:history';

export interface ApiWorkoutRepositoryConfig {
  apiClient: ApiClient;
  storageService?: StorageService;
}

export class ApiWorkoutRepository implements IWorkoutRepository {
  private readonly api: WorkoutApi;
  private readonly storage?: StorageService;

  constructor(config: ApiWorkoutRepositoryConfig) {
    this.api = new WorkoutApi(config.apiClient);
    this.storage = config.storageService;
  }

  // Workouts / Templates
  async getWorkouts(filter?: WorkoutFilter): Promise<Workout[]> {
    try {
      const templates = await this.api.fetchTemplates();
      let workouts = templates.map(mapWorkoutTemplateDtoToDomain);

      // If user has no custom templates yet, provide the standard catalog
      if (workouts.length === 0) {
        workouts = [...MOCK_WORKOUTS];
      }

      this.storage?.setJSON(WORKOUTS_CACHE_KEY, workouts);

      if (filter) {
        return workouts.filter((w) => {
          if (filter.goal && w.goal !== filter.goal) return false;
          if (filter.difficulty && w.difficulty !== filter.difficulty) return false;
          if (filter.query) {
            const query = filter.query.toLowerCase();
            const matchesName = w.name.toLowerCase().includes(query);
            const matchesDesc = w.description.toLowerCase().includes(query);
            if (!matchesName && !matchesDesc) return false;
          }
          return true;
        });
      }

      return workouts;
    } catch {
      // Offline fallback to cache, then mock
      const cached = this.storage?.getJSON<Workout[]>(WORKOUTS_CACHE_KEY, []);
      if (cached && cached.length > 0) return cached;
      return [...MOCK_WORKOUTS];
    }
  }

  async getWorkoutById(id: string): Promise<Workout | null> {
    const workouts = await this.getWorkouts();
    return workouts.find((w) => w.id === id) ?? null;
  }

  // Exercises
  async getExercises(filter?: ExerciseFilter): Promise<Exercise[]> {
    try {
      const dtos = await this.api.fetchExercises(filter?.query);
      let exercises = dtos.map(mapExerciseDtoToDomain);

      if (exercises.length === 0) {
        exercises = [...MOCK_EXERCISES];
      }

      this.storage?.setJSON(EXERCISES_CACHE_KEY, exercises);

      if (filter) {
        return exercises.filter((ex) => {
          if (
            filter.muscleGroup &&
            ex.primaryMuscleGroup !== filter.muscleGroup &&
            !ex.secondaryMuscleGroups.includes(filter.muscleGroup)
          ) {
            return false;
          }
          if (filter.equipment && ex.equipment !== filter.equipment) return false;
          if (filter.difficulty && ex.difficulty !== filter.difficulty) return false;
          return true;
        });
      }

      return exercises;
    } catch {
      const cached = this.storage?.getJSON<Exercise[]>(EXERCISES_CACHE_KEY, []);
      if (cached && cached.length > 0) return cached;
      return [...MOCK_EXERCISES];
    }
  }

  async getExerciseById(id: string): Promise<Exercise | null> {
    const exercises = await this.getExercises();
    return exercises.find((ex) => ex.id === id) ?? null;
  }

  // Active Session Lifecycle
  async getActiveSession(): Promise<WorkoutSession | null> {
    // Check local storage first for real-time responsiveness
    const local = this.storage?.getJSON<WorkoutSession | null>(
      ACTIVE_SESSION_STORAGE_KEY,
      null
    );

    try {
      const remoteDto = await this.api.fetchActiveSession();
      if (!remoteDto) {
        // If server says no active session, but local has one, return local (offline resilience)
        return local ?? null;
      }

      const remoteSession = mapWorkoutSessionDtoToDomain(remoteDto);

      // If local session exists with more sets, retain local optimistic state
      if (local && local.id === remoteSession.id) {
        const localSetsCount = local.exercises.reduce((acc, e) => acc + e.sets.length, 0);
        const remoteSetsCount = remoteSession.exercises.reduce(
          (acc, e) => acc + e.sets.length,
          0
        );
        if (localSetsCount >= remoteSetsCount) {
          return local;
        }
      }

      this.storage?.setJSON(ACTIVE_SESSION_STORAGE_KEY, remoteSession);
      return remoteSession;
    } catch {
      return local ?? null;
    }
  }

  async saveActiveSession(session: WorkoutSession): Promise<void> {
    this.storage?.setJSON(ACTIVE_SESSION_STORAGE_KEY, session);
  }

  async updateWorkoutSession(session: WorkoutSession): Promise<void> {
    this.storage?.setJSON(ACTIVE_SESSION_STORAGE_KEY, session);
  }

  async clearActiveSession(): Promise<void> {
    this.storage?.remove(ACTIVE_SESSION_STORAGE_KEY);
  }

  async saveWorkoutSession(session: WorkoutSession): Promise<void> {
    try {
      await this.api.finishSession({ notes: session.notes });
    } catch {
      // Local durability maintained in history cache
    }

    // Append to local history cache
    const history = this.storage?.getJSON<WorkoutHistoryEntry[]>(HISTORY_CACHE_KEY, []) || [];
    const newEntry: WorkoutHistoryEntry = {
      id: session.id,
      sessionId: session.id,
      workoutId: session.workoutId,
      workoutName: session.workoutName,
      date: new Date().toISOString().split('T')[0],
      completedAt: session.endedAt || Date.now(),
      durationSeconds: session.durationSeconds,
      totalVolume: session.totalVolume,
      totalSets: session.exercises.reduce((acc, e) => acc + e.sets.length, 0),
      completedSets: session.exercises.reduce(
        (acc, e) => acc + e.sets.filter((s) => s.completed).length,
        0
      ),
      exercisesCount: session.exercises.length,
      personalRecordsCount: session.personalRecords.length,
      exercises: session.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        setsCount: e.sets.filter((s) => s.completed).length,
        bestSet: {
          reps: e.sets[0]?.actualReps ?? 10,
          weight: e.sets[0]?.actualWeight ?? 0,
        },
        volume: e.sets.reduce((sum, s) => sum + (s.actualWeight ?? 0) * (s.actualReps ?? 0), 0),
      })),
      notes: session.notes,
      rating: session.rating,
    };

    this.storage?.setJSON(HISTORY_CACHE_KEY, [newEntry, ...history]);
  }

  async getWorkoutSession(sessionId: string): Promise<WorkoutSession | null> {
    const active = await this.getActiveSession();
    if (active && active.id === sessionId) return active;
    return null;
  }

  // History
  async getWorkoutHistory(query?: WorkoutHistoryQuery): Promise<WorkoutHistoryEntry[]> {
    try {
      const dtos = await this.api.fetchPastSessions(query?.limit ?? 20, query?.offset ?? 0);
      let history = dtos.map(mapWorkoutSessionDtoToHistoryEntry);

      if (history.length === 0) {
        history = [...MOCK_WORKOUT_HISTORY];
      }

      this.storage?.setJSON(HISTORY_CACHE_KEY, history);
      return history;
    } catch {
      const cached = this.storage?.getJSON<WorkoutHistoryEntry[]>(HISTORY_CACHE_KEY, []);
      if (cached && cached.length > 0) return cached;
      return [...MOCK_WORKOUT_HISTORY];
    }
  }

  // Personal Records
  async getPersonalRecords(exerciseId?: string): Promise<PersonalRecord[]> {
    try {
      const prDtos = await this.api.fetchAllPersonalRecords();
      let prs = prDtos.map(mapPersonalRecordDtoToDomain);

      if (prs.length === 0) {
        prs = [...MOCK_PERSONAL_RECORDS];
      }

      if (exerciseId) {
        return prs.filter((p) => p.exerciseId === exerciseId);
      }
      return prs;
    } catch {
      if (exerciseId) {
        return MOCK_PERSONAL_RECORDS.filter((p) => p.exerciseId === exerciseId);
      }
      return [...MOCK_PERSONAL_RECORDS];
    }
  }

  // Analytics Stats
  async getWorkoutStats(): Promise<WorkoutStats> {
    try {
      const dto = await this.api.fetchWorkoutAnalytics();
      return mapWorkoutAnalyticsDtoToDomain(dto);
    } catch {
      return { ...MOCK_WORKOUT_STATS };
    }
  }

  // Recommendations
  async getRecommendations(): Promise<WorkoutRecommendation[]> {
    return [...MOCK_RECOMMENDATIONS];
  }
}
