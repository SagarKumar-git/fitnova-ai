/**
 * FitNova AI — Workout API Data Transfer Objects (DTOs)
 * Strict, strongly-typed contracts mirroring backend FastAPI endpoints.
 * ZERO any types.
 */

// ==========================================
// EXERCISE DTOs
// ==========================================

export interface ExerciseMuscleDto {
  id: string;
  exercise_id: string;
  muscle_group_id: string;
  is_primary: boolean;
  contribution_pct: number;
  muscle_group_name?: string | null;
}

export interface ExerciseMediaDto {
  id: string;
  exercise_id: string;
  video_url?: string | null;
  thumbnail_url?: string | null;
}

export interface ExerciseDto {
  id: string;
  name: string;
  category: string;
  equipment?: string | null;
  description?: string | null;
  is_custom: boolean;
  created_by?: string | null;
  created_at?: string;
  primary_muscle_group_id?: string | null;
  primary_muscle_group_name?: string | null;
  muscles?: ExerciseMuscleDto[];
  media?: ExerciseMediaDto | null;
}

export interface MuscleGroupDto {
  id: string;
  name: string;
  created_at?: string;
}

// ==========================================
// WORKOUT TEMPLATE DTOs
// ==========================================

export interface WorkoutTemplateExerciseDto {
  id?: string;
  template_id?: string;
  exercise_id: string;
  order: number;
  target_sets: number;
  target_reps?: number | null;
  target_weight?: number | null;
  rest_seconds?: number | null;
  exercise?: ExerciseDto | null;
}

export interface WorkoutTemplateDto {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  created_at?: string;
  exercises: WorkoutTemplateExerciseDto[];
}

export interface WorkoutTemplateCreateDto {
  name: string;
  description?: string | null;
  exercises: Array<{
    exercise_id: string;
    order: number;
    target_sets: number;
    target_reps?: number | null;
    target_weight?: number | null;
    rest_seconds?: number | null;
  }>;
}

// ==========================================
// WORKOUT SESSION & SET DTOs
// ==========================================

export interface WorkoutSetDto {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight: number;
  rpe?: number | null;
  rest_seconds?: number | null;
  is_pr?: boolean;
  created_at?: string;
  exercise_name?: string | null;
}

export interface WorkoutSessionDto {
  id: string;
  user_id: string;
  template_id?: string | null;
  name: string;
  started_at: string;
  ended_at?: string | null;
  duration_seconds?: number | null;
  notes?: string | null;
  total_volume: number;
  total_sets: number;
  created_at?: string;
  sets: WorkoutSetDto[];
}

export interface WorkoutSessionStartDto {
  name: string;
  template_id?: string | null;
}

export interface WorkoutSetCreateDto {
  exercise_id: string;
  set_number: number;
  reps: number;
  weight: number;
  rpe?: number | null;
  rest_seconds?: number | null;
}

export interface WorkoutSessionFinishDto {
  notes?: string | null;
}

// ==========================================
// PERSONAL RECORD & HISTORY DTOs
// ==========================================

export interface PersonalRecordDto {
  id: string;
  user_id: string;
  exercise_id: string;
  best_weight: number;
  best_volume: number;
  best_estimated_1rm: number;
  record_date: string;
  exercise_name?: string | null;
}

export interface ExerciseHistoryDto {
  exercise: ExerciseDto;
  personal_record?: {
    best_weight: number;
    best_volume: number;
    best_estimated_1rm: number;
    record_date?: string | null;
  } | null;
  sets_history: Array<{
    set_id: string;
    weight: number;
    reps: number;
    rpe?: number | null;
    is_pr?: boolean;
    date: string;
    estimated_1rm: number;
  }>;
  progress_curve: Array<{
    date: string;
    estimated_1rm: number;
  }>;
}

// ==========================================
// ANALYTICS & GOALS DTOs
// ==========================================

export interface WorkoutStreakDto {
  id?: string;
  user_id?: string;
  daily_streak: number;
  weekly_streak: number;
  longest_daily_streak: number;
  longest_weekly_streak: number;
  last_workout_date?: string | null;
}

export interface WorkoutGoalDto {
  id?: string;
  user_id?: string;
  target_workouts_per_week: number;
  target_volume: number;
  target_strength_goal?: string | null;
}

export interface WorkoutGoalCreateDto {
  target_workouts_per_week: number;
  target_volume: number;
  target_strength_goal?: string | null;
}

export interface WorkoutAnalyticsDto {
  total_workouts: number;
  total_volume: number;
  total_sets: number;
  total_duration_minutes: number;
  weekly_workout_frequency: number;
  workout_streak: WorkoutStreakDto;
  muscle_volume_breakdown: Record<string, number>;
  goals?: WorkoutGoalDto | null;
}
