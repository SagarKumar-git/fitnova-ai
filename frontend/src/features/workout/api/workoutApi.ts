/**
 * FitNova AI — Workout API Client Wrapper
 * Encapsulates backend HTTP communication using Platform ApiClient.
 * Zero direct window.fetch() calls.
 */

import type { ApiClient, RequestOptions } from '../../../platform/network/ApiClient.ts';
import type {
  ExerciseDto,
  WorkoutTemplateDto,
  WorkoutTemplateCreateDto,
  WorkoutSessionDto,
  WorkoutSessionStartDto,
  WorkoutSetCreateDto,
  WorkoutSetDto,
  WorkoutSessionFinishDto,
  WorkoutSessionUpdateDto,
  WorkoutSessionCancelDto,
  ExerciseSubstitutionRequestDto,
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
  async fetchTemplates(options?: RequestOptions): Promise<WorkoutTemplateDto[]> {
    return this.apiClient.request<WorkoutTemplateDto[]>('/workouts/templates', {
      ...options,
      method: 'GET',
    });
  }

  async createTemplate(
    payload: WorkoutTemplateCreateDto,
    options?: RequestOptions
  ): Promise<WorkoutTemplateDto> {
    return this.apiClient.request<WorkoutTemplateDto>('/workouts/templates', {
      ...options,
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteTemplate(id: string, options?: RequestOptions): Promise<void> {
    await this.apiClient.request<void>(`/workouts/templates/${id}`, {
      ...options,
      method: 'DELETE',
    });
  }

  // Live Sessions
  async fetchActiveSession(options?: RequestOptions): Promise<WorkoutSessionDto | null> {
    return this.apiClient.request<WorkoutSessionDto | null>('/workouts/sessions/active', {
      ...options,
      method: 'GET',
    });
  }

  async fetchSessionById(id: string, options?: RequestOptions): Promise<WorkoutSessionDto> {
    return this.apiClient.request<WorkoutSessionDto>(`/workouts/sessions/${id}`, {
      ...options,
      method: 'GET',
    });
  }

  async startSession(
    payload: WorkoutSessionStartDto,
    options?: RequestOptions
  ): Promise<WorkoutSessionDto> {
    return this.apiClient.request<WorkoutSessionDto>('/workouts/sessions/start', {
      ...options,
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey: payload.idempotency_key || options?.idempotencyKey,
    });
  }

  async logSet(payload: WorkoutSetCreateDto, options?: RequestOptions): Promise<WorkoutSetDto> {
    return this.apiClient.request<WorkoutSetDto>('/workouts/sessions/log-set', {
      ...options,
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey: payload.idempotency_key || options?.idempotencyKey,
    });
  }

  async deleteSet(setId: string, options?: RequestOptions): Promise<void> {
    await this.apiClient.request<void>(`/workouts/sessions/delete-set/${setId}`, {
      ...options,
      method: 'DELETE',
    });
  }

  async finishSession(
    payload: WorkoutSessionFinishDto,
    options?: RequestOptions
  ): Promise<WorkoutSessionDto> {
    return this.apiClient.request<WorkoutSessionDto>('/workouts/sessions/finish', {
      ...options,
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey: payload.idempotency_key || options?.idempotencyKey,
    });
  }

  async cancelSession(
    payload?: WorkoutSessionCancelDto,
    sessionId?: string,
    options?: RequestOptions
  ): Promise<WorkoutSessionDto> {
    const endpoint = sessionId
      ? `/workouts/sessions/${sessionId}/cancel`
      : '/workouts/sessions/cancel';
    return this.apiClient.request<WorkoutSessionDto>(endpoint, {
      ...options,
      method: 'POST',
      body: payload ? JSON.stringify(payload) : undefined,
      idempotencyKey: payload?.idempotency_key || options?.idempotencyKey,
    });
  }

  async updateSession(
    id: string,
    payload: WorkoutSessionUpdateDto,
    options?: RequestOptions
  ): Promise<WorkoutSessionDto> {
    return this.apiClient.request<WorkoutSessionDto>(`/workouts/sessions/${id}`, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async substituteExercise(
    payload: ExerciseSubstitutionRequestDto,
    options?: RequestOptions
  ): Promise<WorkoutSessionDto> {
    return this.apiClient.request<WorkoutSessionDto>('/workouts/sessions/substitute-exercise', {
      ...options,
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey: payload.idempotency_key || options?.idempotencyKey,
    });
  }

  async fetchPastSessions(
    limit: number = 20,
    offset: number = 0,
    options?: RequestOptions
  ): Promise<WorkoutSessionDto[]> {
    return this.apiClient.request<WorkoutSessionDto[]>(
      `/workouts/sessions?limit=${limit}&offset=${offset}`,
      { ...options, method: 'GET' }
    );
  }

  // Exercises
  async fetchExercises(
    query?: string,
    muscleGroupId?: string,
    options?: RequestOptions
  ): Promise<ExerciseDto[]> {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (muscleGroupId) params.append('muscle_group_id', muscleGroupId);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    return this.apiClient.request<ExerciseDto[]>(`/exercises${queryString}`, {
      ...options,
      method: 'GET',
    });
  }

  async fetchExerciseHistory(
    exerciseId: string,
    options?: RequestOptions
  ): Promise<ExerciseHistoryDto> {
    return this.apiClient.request<ExerciseHistoryDto>(`/exercises/${exerciseId}/history`, {
      ...options,
      method: 'GET',
    });
  }

  async fetchAllPersonalRecords(options?: RequestOptions): Promise<PersonalRecordDto[]> {
    return this.apiClient.request<PersonalRecordDto[]>('/exercises/personal-records', {
      ...options,
      method: 'GET',
    });
  }

  // Analytics & Goals
  async fetchWorkoutAnalytics(options?: RequestOptions): Promise<WorkoutAnalyticsDto> {
    return this.apiClient.request<WorkoutAnalyticsDto>('/workout/analytics', {
      ...options,
      method: 'GET',
    });
  }

  async setWorkoutGoals(
    payload: WorkoutGoalCreateDto,
    options?: RequestOptions
  ): Promise<WorkoutGoalDto> {
    return this.apiClient.request<WorkoutGoalDto>('/workout/analytics/goals', {
      ...options,
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}
