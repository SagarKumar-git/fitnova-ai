import uuid
from datetime import datetime, date
from typing import Optional, List
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
    brand: Optional[str] = Field(None, max_length=100)
    barcode: Optional[str] = Field(None, max_length=50)
    serving_size: float = Field(..., ge=0.1)
    serving_unit: str = Field(..., min_length=1, max_length=30)
    calories: float = Field(..., ge=0.0)
    protein: float = Field(..., ge=0.0)
    carbohydrates: float = Field(..., ge=0.0)
    fat: float = Field(..., ge=0.0)

class FoodResponse(BaseModel):
    food_id: uuid.UUID
    name: str
    brand: Optional[str]
    barcode: Optional[str]
    serving_size: float
    serving_unit: str
    calories: float
    protein: float
    carbohydrates: float
    fat: float
    is_custom: bool
    created_by: Optional[uuid.UUID]
    created_at: datetime

    class Config:
        from_attributes = True

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
    created_at: datetime
    exercise_name: Optional[str] = None

    class Config:
        from_attributes = True

class WorkoutSessionStart(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    template_id: Optional[uuid.UUID] = None

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
    created_at: datetime
    sets: List[WorkoutSetResponse] = []

    class Config:
        from_attributes = True

class WorkoutSessionFinish(BaseModel):
    notes: Optional[str] = None

class WorkoutAnalyticsResponse(BaseModel):
    total_workouts: int
    total_volume: float
    total_sets: int
    total_duration_minutes: float
    weekly_workout_frequency: float
    workout_streak: WorkoutStreakResponse
    muscle_volume_breakdown: dict
    goals: Optional[WorkoutGoalResponse] = None

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
    created_at: datetime
    food_id: Optional[uuid.UUID] = None

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





