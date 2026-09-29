import uuid
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, model_validator

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    confirm_password: str
    role: Optional[str] = "user"  # 'user', 'trainer', 'admin'

    @model_validator(mode="after")
    def check_passwords_match(self) -> "UserCreate":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        if self.role not in ["user", "trainer", "admin"]:
            raise ValueError("Role must be 'user', 'trainer', or 'admin'")
        return self

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: str
    created_at: datetime
    has_profile: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    user_id: Optional[uuid.UUID] = None

class ProfileCreate(BaseModel):
    age: int = Field(..., ge=1, le=120)
    gender: str = Field(..., description="male, female, or other")
    height: float = Field(..., ge=50, le=250)
    weight: float = Field(..., ge=20, le=400)
    goal: str = Field(..., description="Muscle Gain, Fat Loss, Maintenance")
    experience_level: str = Field(..., description="Beginner, Intermediate, Advanced")
    activity_level: str = Field(..., description="Sedentary, Light, Moderate, Active, Very Active")
    workout_days_per_week: int = Field(..., ge=1, le=7)
    gym_access: bool
    target_weight: float = Field(..., ge=20, le=400)
    current_body_fat: Optional[float] = Field(None, ge=1, le=80)
    target_body_fat: Optional[float] = Field(None, ge=1, le=80)
    goal_deadline: Optional[date] = None

    @model_validator(mode="after")
    def validate_profile_inputs(self) -> "ProfileCreate":
        if self.gender.lower() not in ["male", "female", "other"]:
            raise ValueError("Gender must be 'male', 'female', or 'other'")
        if self.goal not in ["Muscle Gain", "Fat Loss", "Maintenance"]:
            raise ValueError("Goal must be 'Muscle Gain', 'Fat Loss', or 'Maintenance'")
        if self.experience_level not in ["Beginner", "Intermediate", "Advanced"]:
            raise ValueError("Experience level must be 'Beginner', 'Intermediate', or 'Advanced'")
        if self.activity_level not in ["Sedentary", "Light", "Moderate", "Active", "Very Active"]:
            raise ValueError("Activity level must be 'Sedentary', 'Light', 'Moderate', 'Active', or 'Very Active'")
        return self

class ProfileResponse(BaseModel):
    profile_id: uuid.UUID
    user_id: uuid.UUID
    age: int
    gender: str
    height: float
    weight: float
    goal: str
    experience_level: str
    activity_level: str
    workout_days_per_week: int
    gym_access: bool
    target_weight: float
    current_body_fat: Optional[float]
    target_body_fat: Optional[float]
    goal_deadline: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True

class DashboardResponse(BaseModel):
    name: str
    goal: str
    weight: float
    height: float
    experience_level: str
    bmr: float
    tdee: float
    daily_calorie_target: float
    daily_protein_target: float
    daily_water_target: float
    workout_plan: dict
    nutrition_plan: dict
    
    # Active tracking progress fields added for Phase 2
    calories_consumed: float
    protein_consumed: float
    carbs_consumed: float
    fats_consumed: float
    water_consumed_ml: int

# ==========================================
# PHASE 2 NUTRITION & PROGRESS SCHEMAS
# ==========================================

class FoodCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    common_name: Optional[str] = Field(None, max_length=150)
    aliases: Optional[str] = None
    brand: Optional[str] = Field(None, max_length=100)
    barcode: Optional[str] = Field(None, max_length=50)
    category: Optional[str] = Field(None, max_length=100)
    cuisine: Optional[str] = Field(None, max_length=100)
    country_or_region: Optional[str] = Field(None, max_length=100)
    serving_size: float = Field(..., ge=0.1)
    serving_unit: str = Field(..., min_length=1, max_length=30)
    calories: float = Field(..., ge=0.0)
    protein: float = Field(..., ge=0.0)
    carbohydrates: float = Field(..., ge=0.0)
    fat: float = Field(..., ge=0.0)
    fiber: float = Field(0.0, ge=0.0)
    sugar: float = Field(0.0, ge=0.0)
    sodium: float = Field(0.0, ge=0.0)
    saturated_fat: float = Field(0.0, ge=0.0)
    cholesterol: float = Field(0.0, ge=0.0)
    micronutrients: Optional[Dict[str, Any]] = None
    ingredients: Optional[str] = None
    preparation_method: Optional[str] = None
    is_vegetarian: bool = True
    is_vegan: bool = False
    food_type: Optional[str] = "cooked"
    source: Optional[str] = "custom"
    source_id: Optional[str] = None
    confidence_score: float = 1.0

class FoodResponse(BaseModel):
    food_id: uuid.UUID
    name: str
    common_name: Optional[str] = None
    aliases: Optional[str] = None
    brand: Optional[str] = None
    barcode: Optional[str] = None
    category: Optional[str] = None
    cuisine: Optional[str] = None
    country_or_region: Optional[str] = None
    serving_size: float
    serving_unit: str
    calories: float
    protein: float
    carbohydrates: float
    fat: float
    fiber: float = 0.0
    sugar: float = 0.0
    sodium: float = 0.0
    saturated_fat: float = 0.0
    cholesterol: float = 0.0
    micronutrients: Optional[Dict[str, Any]] = None
    ingredients: Optional[str] = None
    preparation_method: Optional[str] = None
    is_vegetarian: bool = True
    is_vegan: bool = False
    food_type: Optional[str] = None
    source: Optional[str] = "fitnova_verified"
    source_id: Optional[str] = None
    confidence_score: float = 1.0
    is_custom: bool = False
    created_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class FoodSearchResponse(BaseModel):
    total: int
    items: List[FoodResponse]
    limit: int
    offset: int
    has_more: bool

class FoodLogCreate(BaseModel):
    food_id: uuid.UUID
    meal_type: str = Field(..., description="Breakfast, Pre Workout, Post Workout, Lunch, Dinner, Snack")
    servings: float = Field(..., ge=0.01)
    logged_date: date

    @model_validator(mode="after")
    def validate_meal_type(self) -> "FoodLogCreate":
        meals = ["Breakfast", "Pre Workout", "Post Workout", "Lunch", "Dinner", "Snack"]
        if self.meal_type not in meals:
            raise ValueError(f"Meal type must be one of {meals}")
        return self

class FoodLogResponse(BaseModel):
    log_id: uuid.UUID
    user_id: uuid.UUID
    food_id: uuid.UUID
    meal_type: str
    servings: float
    logged_date: date
    created_at: datetime
    food: FoodResponse

    class Config:
        from_attributes = True

class WaterLogCreate(BaseModel):
    amount_ml: int = Field(..., ge=1, le=10000)
    logged_date: date

class WaterLogResponse(BaseModel):
    water_log_id: uuid.UUID
    user_id: uuid.UUID
    amount_ml: int
    logged_date: date
    created_at: datetime

    class Config:
        from_attributes = True

class WeightHistoryCreate(BaseModel):
    weight: float = Field(..., ge=20, le=400)
    recorded_at: Optional[datetime] = None
    source: Optional[str] = "manual_entry"

    @model_validator(mode="after")
    def validate_source(self) -> "WeightHistoryCreate":
        sources = ["profile_update", "manual_entry", "weekly_checkin"]
        if self.source not in sources:
            raise ValueError(f"Source must be one of {sources}")
        return self

class WeightHistoryResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    weight: float
    recorded_at: datetime
    source: str

    class Config:
        from_attributes = True

class DailyNutritionSummaryResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    date: date
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fats: float
    total_water_ml: int

    class Config:
        from_attributes = True

class MealPlanItemCreate(BaseModel):
    food_id: uuid.UUID
    meal_type: str
    servings: float

class MealPlanItemResponse(BaseModel):
    item_id: uuid.UUID
    meal_plan_id: uuid.UUID
    food_id: uuid.UUID
    meal_type: str
    servings: float
    food: FoodResponse

    class Config:
        from_attributes = True

class MealPlanCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    items: List[MealPlanItemCreate]

class MealPlanResponse(BaseModel):
    meal_plan_id: uuid.UUID
    user_id: uuid.UUID
    name: str
    created_at: datetime
    items: List[MealPlanItemResponse]

    class Config:
        from_attributes = True


# ==========================================
# PHASE 3 WORKOUT SCHEMAS
# ==========================================

class MuscleGroupResponse(BaseModel):
    id: uuid.UUID
    name: str

    class Config:
        from_attributes = True

class ExerciseMuscleResponse(BaseModel):
    id: uuid.UUID
    exercise_id: uuid.UUID
    muscle_group_id: uuid.UUID
    is_primary: bool
    contribution_pct: float
    muscle_group_name: Optional[str] = None

    class Config:
        from_attributes = True

class ExerciseMediaResponse(BaseModel):
    id: uuid.UUID
    exercise_id: uuid.UUID
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None

    class Config:
        from_attributes = True

class ExerciseResponse(BaseModel):
    id: uuid.UUID
    name: str
    category: str
    equipment: Optional[str] = None
    description: Optional[str] = None
    is_custom: bool
    created_by: Optional[uuid.UUID] = None
    created_at: datetime
    primary_muscle_group_id: Optional[uuid.UUID] = None
    primary_muscle_group_name: Optional[str] = None
    muscles: List[ExerciseMuscleResponse] = []
    media: Optional[ExerciseMediaResponse] = None

    class Config:
        from_attributes = True

class ExerciseMuscleCreate(BaseModel):
    muscle_group_id: uuid.UUID
    is_primary: bool
    contribution_pct: float

class ExerciseMediaCreate(BaseModel):
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None

class ExerciseCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    category: str = Field(..., description="Strength, Hypertrophy, Cardio, Bodyweight")
    equipment: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    primary_muscle_group_id: uuid.UUID
    muscles: Optional[List[ExerciseMuscleCreate]] = None
    media: Optional[ExerciseMediaCreate] = None

    @model_validator(mode="after")
    def validate_category(self) -> "ExerciseCreate":
        categories = ["Strength", "Hypertrophy", "Cardio", "Bodyweight"]
        if self.category not in categories:
            raise ValueError(f"Category must be one of {categories}")
        return self

class PersonalRecordResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    exercise_id: uuid.UUID
    best_weight: float
    best_volume: float
    best_estimated_1rm: float
    record_date: date
    exercise_name: Optional[str] = None

    class Config:
        from_attributes = True

class WorkoutGoalCreate(BaseModel):
    target_workouts_per_week: int = Field(3, ge=1, le=21)
    target_volume: float = Field(0.0, ge=0.0)
    target_strength_goal: Optional[str] = Field(None, max_length=255)

class WorkoutGoalResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    target_workouts_per_week: int
    target_volume: float
    target_strength_goal: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class WorkoutStreakResponse(BaseModel):
    user_id: uuid.UUID
    daily_streak: int
    weekly_streak: int
    longest_daily_streak: int
    longest_weekly_streak: int
    last_workout_date: Optional[date] = None

    class Config:
        from_attributes = True

class WorkoutTemplateExerciseCreate(BaseModel):
    exercise_id: uuid.UUID
    order: int
    target_sets: int = Field(3, ge=1)
    target_reps: Optional[int] = Field(None, ge=1)
    target_weight: Optional[float] = Field(None, ge=0)
    rest_seconds: Optional[int] = Field(90, ge=0)

class WorkoutTemplateExerciseResponse(BaseModel):
    id: uuid.UUID
    template_id: uuid.UUID
    exercise_id: uuid.UUID
    order: int
    target_sets: int
    target_reps: Optional[int]
    target_weight: Optional[float]
    rest_seconds: Optional[int]
    exercise: Optional[ExerciseResponse] = None

    class Config:
        from_attributes = True

class WorkoutTemplateCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None
    exercises: List[WorkoutTemplateExerciseCreate]

class WorkoutTemplateResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    description: Optional[str]
    created_at: datetime
    exercises: List[WorkoutTemplateExerciseResponse] = []

    class Config:
        from_attributes = True

class WorkoutSetCreate(BaseModel):
    exercise_id: uuid.UUID
    set_number: int
    reps: int = Field(..., ge=1)
    weight: float = Field(..., ge=0)
    rpe: Optional[float] = Field(None, ge=1, le=10)
    rest_seconds: Optional[int] = Field(None, ge=0)
    is_skipped: Optional[bool] = False
    notes: Optional[str] = None
    substitute_exercise_id: Optional[uuid.UUID] = None
    idempotency_key: Optional[str] = None

class WorkoutSetResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    exercise_id: uuid.UUID
    set_number: int
    reps: int
    weight: float
    rpe: Optional[float]
    rest_seconds: Optional[int]
    is_pr: bool
    is_skipped: bool = False
    notes: Optional[str] = None
    substitute_exercise_id: Optional[uuid.UUID] = None
    substitute_exercise_name: Optional[str] = None
    version: int = 1
    created_at: datetime
    exercise_name: Optional[str] = None

    class Config:
        from_attributes = True

class WorkoutSessionStart(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    template_id: Optional[uuid.UUID] = None
    idempotency_key: Optional[str] = None

class WorkoutSessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    template_id: Optional[uuid.UUID]
    name: str
    started_at: datetime
    ended_at: Optional[datetime]
    duration_seconds: Optional[int]
    notes: Optional[str]
    total_volume: float
    total_sets: int
    status: str = "active"
    rating: Optional[int] = None
    calories: float = 0.0
    version: int = 1
    created_at: datetime
    updated_at: Optional[datetime] = None
    sets: List[WorkoutSetResponse] = []

    class Config:
        from_attributes = True

class WorkoutSessionFinish(BaseModel):
    notes: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    calories: Optional[float] = Field(None, ge=0)
    duration_seconds: Optional[int] = Field(None, ge=0)
    idempotency_key: Optional[str] = None

class WorkoutSessionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    notes: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    calories: Optional[float] = Field(None, ge=0)
    duration_seconds: Optional[int] = Field(None, ge=0)
    status: Optional[str] = None
    version: Optional[int] = None

class WorkoutSessionCancel(BaseModel):
    reason: Optional[str] = None
    idempotency_key: Optional[str] = None

class ExerciseSubstitutionRequest(BaseModel):
    original_exercise_id: uuid.UUID
    substitute_exercise_id: uuid.UUID
    reason: Optional[str] = None
    idempotency_key: Optional[str] = None

class WorkoutAnalyticsResponse(BaseModel):
    total_workouts: int
    total_volume: float
    total_sets: int
    total_duration_minutes: float
    weekly_workout_frequency: float
    workout_streak: WorkoutStreakResponse
    muscle_volume_breakdown: dict
    goals: Optional[WorkoutGoalResponse] = None

class StrengthProgressionItem(BaseModel):
    exercise_id: uuid.UUID
    exercise_name: str
    previous_1rm: float
    current_1rm: float
    percentage_improvement: float
    max_weight: float
    max_reps: int
    total_volume: float
    number_of_sessions: int
    last_performed_date: Optional[date] = None
    trend: List[dict] = []

class StrengthAnalyticsResponse(BaseModel):
    total_exercises: int
    exercises: List[StrengthProgressionItem]
    page: int
    page_size: int
    total_pages: int

class VolumeWeeklyPoint(BaseModel):
    week: str
    volume_kg: float
    workouts_count: int
    average_volume_per_workout: float

class VolumeMonthlyPoint(BaseModel):
    month: str
    volume_kg: float
    workouts_count: int

class VolumeAnalyticsResponse(BaseModel):
    total_volume_kg: float
    weekly_trends: List[VolumeWeeklyPoint]
    monthly_trends: List[VolumeMonthlyPoint]

class ConsistencyAnalyticsResponse(BaseModel):
    weekly_workout_frequency: float
    adherence_percentage: float
    current_streak_weeks: int
    longest_streak_weeks: int
    total_workouts: int
    consistency_score: int
    rating_label: str
    average_days_between_sessions: float
    missed_planned_workouts: int
    summary: str
    actionable_tip: str

class ExerciseHistoryAnalyticsResponse(BaseModel):
    exercise_id: uuid.UUID
    exercise_name: str
    total_sessions: int
    max_weight: float
    max_reps: int
    current_estimated_1rm: float
    previous_estimated_1rm: float
    percentage_improvement: float
    sets_history: List[dict]
    progress_curve: List[dict]
    personal_record: Optional[dict] = None

class AdminStatsResponse(BaseModel):
    total_users: int
    total_food_logs: int
    total_meal_plans: int
    total_exercises: int
    active_users: int
    total_ai_workouts: Optional[int] = 0
    total_ai_meal_plans: Optional[int] = 0
    total_achievements: Optional[int] = 0

class AdminUserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: str
    created_at: datetime
    total_food_logs: int
    total_meal_plans: int
    total_ai_workouts: Optional[int] = 0
    total_achievements: Optional[int] = 0

    class Config:
        from_attributes = True

class AIProfileResponse(BaseModel):
    name: str
    age: int
    gender: str
    height: float
    weight: float
    goal: str
    experience_level: str
    activity_level: str
    bmi: float
    bmr: float
    tdee: float
    daily_calories: float
    daily_protein: float
    daily_water: float

class AIWorkoutCreate(BaseModel):
    workout_type: str = Field(..., description="Home, Gym")
    goal: str = Field(..., description="Muscle Gain, Fat Loss, Maintenance")
    experience_level: str = Field(..., description="Beginner, Intermediate, Advanced")
    days_per_week: int = Field(..., ge=1, le=7)

class AIWorkoutResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    workout_type: str
    goal: str
    experience_level: str
    days_per_week: int
    plan_data: dict
    created_at: datetime

    class Config:
        from_attributes = True

class AIMealCreate(BaseModel):
    diet_type: str = Field(..., description="Vegetarian, Non Vegetarian")
    diet_cuisine: str = Field(..., description="Indian Diet, Global")
    goal: Optional[str] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    age: Optional[int] = None
    activity_level: Optional[str] = None

class AIMealResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    diet_type: str
    diet_cuisine: str
    calories: float
    protein: float
    carbohydrates: float
    fat: float
    meals_data: dict
    created_at: datetime
    goal: Optional[str] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    age: Optional[int] = None
    activity_level: Optional[str] = None

    class Config:
        from_attributes = True

class AchievementResponse(BaseModel):
    key: str
    title: str
    description: str
    icon: str
    max_progress: int
    current_progress: int
    is_unlocked: bool
    unlocked_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DailyAnalyticsPoint(BaseModel):
    date: str
    registrations: int
    active_users: int
    food_logs: int
    meal_plans: int
    ai_workouts: int
    ai_meal_plans: int

class AdminAnalyticsResponse(BaseModel):
    start_date: str
    end_date: str
    series: List[DailyAnalyticsPoint]

class UserRoleUpdate(BaseModel):
    role: str

class LeaderboardUser(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    score: int

class AdminLeaderboardsResponse(BaseModel):
    top_workouts: List[LeaderboardUser]
    top_nutrition: List[LeaderboardUser]
    top_ai_coach: List[LeaderboardUser]
    top_achievements: List[LeaderboardUser]
    top_streaks: List[LeaderboardUser]


class AIInsightResponse(BaseModel):
    id: uuid.UUID
    type: str
    title: str
    message: str
    status: str
    priority: str
    created_at: datetime

    class Config:
        from_attributes = True


class DetectedFoodItem(BaseModel):
    name: str
    portion: Optional[str] = "1 serving"
    estimated_weight_g: Optional[float] = None
    calories: Optional[float] = 0.0
    protein: Optional[float] = 0.0
    carbohydrates: Optional[float] = 0.0
    fat: Optional[float] = 0.0
    confidence: Optional[float] = 0.85
    food_id: Optional[uuid.UUID] = None
    matched_food_name: Optional[str] = None
    is_database_match: Optional[bool] = False
    bounding_box: Optional[List[int]] = None

    class Config:
        from_attributes = True


class TotalNutrition(BaseModel):
    calories: float = 0.0
    protein: float = 0.0
    carbohydrates: float = 0.0
    fat: float = 0.0

    class Config:
        from_attributes = True


class FoodRecognitionCreate(BaseModel):
    food_name: str
    calories: float
    protein: float
    carbohydrates: float
    fat: float
    confidence_score: float


class FoodRecognitionResponse(BaseModel):
    id: uuid.UUID
    image_filename: str
    image_hash: Optional[str] = None
    status: str
    processing_time_ms: Optional[float] = None
    food_name: Optional[str] = None
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbohydrates: Optional[float] = None
    fat: Optional[float] = None
    confidence_score: Optional[float] = None
    provider: Optional[str] = None
    created_at: datetime
    food_id: Optional[uuid.UUID] = None

    # Phase F-3.5 Fields
    meal_name: Optional[str] = None
    detected_items: Optional[List[str]] = None
    confidence_per_item: Optional[Dict[str, float]] = None
    serving_size_estimation: Optional[str] = None
    estimated_weight_g: Optional[float] = None
    health_score: Optional[int] = None
    nutrition_confidence: Optional[float] = None
    goal_alignment: Optional[Dict[str, int]] = None
    recommendation: Optional[str] = None
    healthier_alternative: Optional[str] = None
    annotations: Optional[List[Dict[str, Any]]] = None

    # Multi-food structured details
    foods: Optional[List[DetectedFoodItem]] = None
    total_nutrition: Optional[TotalNutrition] = None

    class Config:
        from_attributes = True


class FoodScanStatsResponse(BaseModel):
    total_scans: int
    weekly_scans: int
    most_scanned_food: Optional[str] = None
    total_calories_scanned: float


class AdminFoodScanAnalyticsResponse(BaseModel):
    total_scans: int
    unique_users: int
    most_scanned_food: Optional[str] = None
    average_confidence: float
    daily_activity: List[dict]


# ==========================================
# SPRINT 3.7 WEARABLE HEALTH SCHEMAS
# ==========================================

class HeartRatePoint(BaseModel):
    bpm: int
    timestamp: int
    source: str
    context: Optional[str] = "resting"


class HeartRateResponse(BaseModel):
    current_bpm: int
    resting_bpm: int
    min_bpm: int
    max_bpm: int
    samples: List[HeartRatePoint]


class HRVPoint(BaseModel):
    rmssd_ms: float
    timestamp: int
    status: str


class HRVResponse(BaseModel):
    current_rmssd_ms: float
    baseline_rmssd_ms: float
    status: str  # optimal, suppressed, elevated
    deviation_pct: float
    samples: List[HRVPoint]


class SleepStageItem(BaseModel):
    stage: str
    duration_minutes: int


class SleepSessionResponse(BaseModel):
    date: str
    total_duration_minutes: int
    time_asleep_minutes: int
    deep_minutes: int
    rem_minutes: int
    light_minutes: int
    efficiency_pct: int
    sleep_score: int
    stages: List[SleepStageItem]


class RecoveryMetricsResponse(BaseModel):
    recovery_score: int  # 0 to 100
    readiness_state: str  # optimal, moderate, low, rest_recommended
    recommended_intensity: str  # full, moderate, light, active_recovery, none
    intensity_modifier: float
    resting_heart_rate_bpm: int
    hrv_rmssd_ms: float
    hrv_status: str
    sleep_hours: float
    sleep_efficiency_pct: int
    deep_sleep_pct: int
    contributing_factors: List[str]
    recovery_warnings: List[str]
    data_sources_used: List[str]


class HealthSummaryResponse(BaseModel):
    status: str
    provider: str
    last_synced_at: int
    recovery: RecoveryMetricsResponse
    today_steps: int
    active_calories_burned: int

class AdaptivePreferenceUpdate(BaseModel):
    adaptive_training_enabled: Optional[bool] = None
    automatic_intensity_reduction_allowed: Optional[bool] = None
    automatic_exercise_substitution_allowed: Optional[bool] = None
    progressive_overload_recommendations_enabled: Optional[bool] = None
    minimum_confidence_required: Optional[str] = None
    notify_on_workout_changed: Optional[bool] = None
    notify_on_intensity_reduced: Optional[bool] = None
    notify_on_high_confidence_progression: Optional[bool] = None
    notify_on_stale_health_data: Optional[bool] = None


class AdaptivePreferenceResponse(BaseModel):
    user_id: uuid.UUID
    adaptive_training_enabled: bool
    automatic_intensity_reduction_allowed: bool
    automatic_exercise_substitution_allowed: bool
    progressive_overload_recommendations_enabled: bool
    minimum_confidence_required: str
    notify_on_workout_changed: bool
    notify_on_intensity_reduced: bool
    notify_on_high_confidence_progression: bool
    notify_on_stale_health_data: bool
    updated_at: datetime

    class Config:
        from_attributes = True


class AdaptiveDecisionCreate(BaseModel):
    session_id: uuid.UUID
    decision_type: str
    original_plan: dict
    adaptive_plan: dict
    reasons: List[str]
    supporting_signals: List[str]
    confidence: float
    safety_limits_applied: List[str]
    user_action: str
    resulting_outcome: Optional[str] = None


class AdaptiveDecisionUpdate(BaseModel):
    user_action: Optional[str] = None
    resulting_outcome: Optional[str] = None


class AdaptiveDecisionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    session_id: uuid.UUID
    decision_type: str
    original_plan: dict
    adaptive_plan: dict
    reasons: List[str]
    supporting_signals: List[str]
    confidence: float
    safety_limits_applied: List[str]
    user_action: str
    resulting_outcome: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SafetyEventCreate(BaseModel):
    session_id: str
    event_type: str
    safety_state: str
    intervention: Optional[str] = None
    confidence: float
    freshness: str
    provider: str
    client_timestamp: int


class SafetyEventResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    session_id: str
    event_type: str
    safety_state: str
    intervention: Optional[str]
    confidence: float
    freshness: str
    provider: str
    client_timestamp: int
    created_at: datetime

    class Config:
        from_attributes = True
