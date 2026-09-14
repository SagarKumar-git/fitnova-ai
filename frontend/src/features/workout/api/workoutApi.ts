/**
 * FitNova AI — Workout API Client Wrapper
 * Encapsulates backend HTTP communication using Platform ApiClient.
 * Zero direct window.fetch() calls.
 */

import type { ApiClient } from '../../../platform/network/ApiClient.ts';
import type {
  ExerciseDto,
  WorkoutTemplateDto,
  WorkoutTemplateCreateDto,
  WorkoutSessionDto,
  WorkoutSessionStartDto,
  WorkoutSetCreateDto,
  WorkoutSetDto,
  WorkoutSessionFinishDto,
  PersonalRecordDto,
  ExerciseHistoryDto,
  WorkoutAnalyticsDto,
  WorkoutGoalDto,
  WorkoutGoalCreateDto,
} from './workoutDtos.ts';

export class WorkoutApi {
  private readonly apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  // Templates
  async fetchTemplates(): Promise<WorkoutTemplateDto[]> {
    return this.apiClient.request<WorkoutTemplateDto[]>('/workouts/templates', {
      method: 'GET',
    });
  }

  async createTemplate(payload: WorkoutTemplateCreateDto): Promise<WorkoutTemplateDto> {
    return this.apiClient.request<WorkoutTemplateDto>('/workouts/templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.apiClient.request<void>(`/workouts/templates/${id}`, {
      method: 'DELETE',
    });
  }

  // Live Sessions
  async fetchActiveSession(): Promise<WorkoutSessionDto | null> {
    return this.apiClient.request<WorkoutSessionDto | null>('/workouts/sessions/active', {
      method: 'GET',
    });
  }

  async startSession(payload: WorkoutSessionStartDto): Promise<WorkoutSessionDto> {
    return this.apiClient.request<WorkoutSessionDto>('/workouts/sessions/start', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async logSet(payload: WorkoutSetCreateDto): Promise<WorkoutSetDto> {
    return this.apiClient.request<WorkoutSetDto>('/workouts/sessions/log-set', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteSet(setId: string): Promise<void> {
    await this.apiClient.request<void>(`/workouts/sessions/delete-set/${setId}`, {
      method: 'DELETE',
    });
  }

  async finishSession(payload: WorkoutSessionFinishDto): Promise<WorkoutSessionDto> {
    return this.apiClient.request<WorkoutSessionDto>('/workouts/sessions/finish', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async fetchPastSessions(limit: number = 20, offset: number = 0): Promise<WorkoutSessionDto[]> {
    return this.apiClient.request<WorkoutSessionDto[]>(
      `/workouts/sessions?limit=${limit}&offset=${offset}`,
      { method: 'GET' }
    );
  }

  // Exercises
  async fetchExercises(query?: string, muscleGroupId?: string): Promise<ExerciseDto[]> {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (muscleGroupId) params.append('muscle_group_id', muscleGroupId);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    return this.apiClient.request<ExerciseDto[]>(`/exercises${queryString}`, {
      method: 'GET',
    });
  }

  async fetchExerciseHistory(exerciseId: string): Promise<ExerciseHistoryDto> {
    return this.apiClient.request<ExerciseHistoryDto>(`/exercises/${exerciseId}/history`, {
      method: 'GET',
    });
  }

  async fetchAllPersonalRecords(): Promise<PersonalRecordDto[]> {
    return this.apiClient.request<PersonalRecordDto[]>('/exercises/personal-records', {
      method: 'GET',
    });
  }

  // Analytics & Goals
  async fetchWorkoutAnalytics(): Promise<WorkoutAnalyticsDto> {
    return this.apiClient.request<WorkoutAnalyticsDto>('/workout/analytics', {
      method: 'GET',
    });
  }

  async setWorkoutGoals(payload: WorkoutGoalCreateDto): Promise<WorkoutGoalDto> {
    return this.apiClient.request<WorkoutGoalDto>('/workout/analytics/goals', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}
