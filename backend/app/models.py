import uuid
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Date, ForeignKey, Uuid, func, UniqueConstraint, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="user")  # 'user', 'trainer', 'admin'
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    metrics = relationship("FitnessMetrics", back_populates="user", cascade="all, delete-orphan")
    weight_history = relationship("WeightHistory", back_populates="user", cascade="all, delete-orphan")
    nutrition_summaries = relationship("DailyNutritionSummary", back_populates="user", cascade="all, delete-orphan")
    food_logs = relationship("FoodLog", back_populates="user", cascade="all, delete-orphan")
    water_logs = relationship("WaterLog", back_populates="user", cascade="all, delete-orphan")
    meal_plans = relationship("MealPlan", back_populates="user", cascade="all, delete-orphan")
    personal_records = relationship("PersonalRecord", back_populates="user", cascade="all, delete-orphan")
    workout_goal = relationship("WorkoutGoal", back_populates="user", uselist=False, cascade="all, delete-orphan")
    workout_streak = relationship("WorkoutStreak", back_populates="user", uselist=False, cascade="all, delete-orphan")
    workout_templates = relationship("WorkoutTemplate", back_populates="user", cascade="all, delete-orphan")
    workout_sessions = relationship("WorkoutSession", back_populates="user", cascade="all, delete-orphan")
    ai_workout_plans = relationship("AIWorkoutPlan", back_populates="user", cascade="all, delete-orphan")
    ai_meal_plans = relationship("AIMealPlan", back_populates="user", cascade="all, delete-orphan")
    user_achievements = relationship("UserAchievement", back_populates="user", cascade="all, delete-orphan")
    ai_insights = relationship("AIInsight", back_populates="user", cascade="all, delete-orphan")
    food_recognition_logs = relationship("FoodRecognitionLog", back_populates="user", cascade="all, delete-orphan")

    @property
    def has_profile(self) -> bool:
        return self.profile is not None


class UserProfile(Base):
    __tablename__ = "user_profiles"

    profile_id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)  # 'male', 'female', 'other'
    height = Column(Float, nullable=False)  # in cm
    weight = Column(Float, nullable=False)  # in kg (current weight)
    goal = Column(String, nullable=False)  # 'Muscle Gain', 'Fat Loss', 'Maintenance'
    experience_level = Column(String, nullable=False)  # 'Beginner', 'Intermediate', 'Advanced'
    activity_level = Column(String, nullable=False)  # 'Sedentary', 'Light', 'Moderate', 'Active', 'Very Active'
    workout_days_per_week = Column(Integer, nullable=False, default=3)
    gym_access = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="profile")


class FitnessMetrics(Base):
    __tablename__ = "fitness_metrics"

    metric_id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    current_weight = Column(Float, nullable=False)
    target_weight = Column(Float, nullable=False)
    current_body_fat = Column(Float, nullable=True)
    target_body_fat = Column(Float, nullable=True)
    goal_deadline = Column(Date, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="metrics")


class WeightHistory(Base):
    __tablename__ = "weight_history"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    weight = Column(Float, nullable=False)
    recorded_at = Column(DateTime, server_default=func.now(), nullable=False)
    source = Column(String, nullable=False)  # 'profile_update', 'manual_entry', 'weekly_checkin'

    # Relationships
    user = relationship("User", back_populates="weight_history")


class DailyNutritionSummary(Base):
    __tablename__ = "daily_nutrition_summaries"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    date = Column(Date, index=True, nullable=False)
    total_calories = Column(Float, nullable=False, default=0.0)
    total_protein = Column(Float, nullable=False, default=0.0)
    total_carbs = Column(Float, nullable=False, default=0.0)
    total_fats = Column(Float, nullable=False, default=0.0)
    total_water_ml = Column(Integer, nullable=False, default=0)

    # Unique constraint per user per day
    __table_args__ = (UniqueConstraint('user_id', 'date', name='_user_date_uc'),)

    # Relationships
    user = relationship("User", back_populates="nutrition_summaries")


class Food(Base):
    __tablename__ = "foods"

    food_id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String, index=True, nullable=False)
    brand = Column(String, nullable=True)
    barcode = Column(String, index=True, nullable=True)
    serving_size = Column(Float, nullable=False)  # e.g. 100
    serving_unit = Column(String, nullable=False)  # e.g. 'g', 'ml', 'piece'
    calories = Column(Float, nullable=False)  # per serving_size
    protein = Column(Float, nullable=False)  # in grams
    carbohydrates = Column(Float, nullable=False)  # in grams
    fat = Column(Float, nullable=False)  # in grams
    is_custom = Column(Boolean, nullable=False, default=False)
    created_by = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    food_logs = relationship("FoodLog", back_populates="food", cascade="all, delete-orphan")
    meal_plan_items = relationship("MealPlanItem", back_populates="food", cascade="all, delete-orphan")


class FoodLog(Base):
    __tablename__ = "food_logs"

    log_id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    food_id = Column(Uuid, ForeignKey("foods.food_id", ondelete="CASCADE"), nullable=False)
    meal_type = Column(String, nullable=False)  # 'Breakfast', 'Pre Workout', 'Post Workout', 'Lunch', 'Dinner', 'Snack'
    servings = Column(Float, nullable=False)  # Serving multiplier
    logged_date = Column(Date, index=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="food_logs")
    food = relationship("Food", back_populates="food_logs")


class WaterLog(Base):
    __tablename__ = "water_logs"

    water_log_id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    amount_ml = Column(Integer, nullable=False)
    logged_date = Column(Date, index=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="water_logs")


class MealPlan(Base):
    __tablename__ = "meal_plans"

    meal_plan_id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="meal_plans")
    items = relationship("MealPlanItem", back_populates="meal_plan", cascade="all, delete-orphan")


class MealPlanItem(Base):
    __tablename__ = "meal_plan_items"

    item_id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    meal_plan_id = Column(Uuid, ForeignKey("meal_plans.meal_plan_id", ondelete="CASCADE"), nullable=False)
    food_id = Column(Uuid, ForeignKey("foods.food_id", ondelete="CASCADE"), nullable=False)
    meal_type = Column(String, nullable=False)  # 'Breakfast', 'Pre Workout', etc.
    servings = Column(Float, nullable=False)

    # Relationships
    meal_plan = relationship("MealPlan", back_populates="items")
    food = relationship("Food", back_populates="meal_plan_items")


class MuscleGroup(Base):
    __tablename__ = "muscle_groups"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    exercise_mappings = relationship("ExerciseMuscle", back_populates="muscle_group", cascade="all, delete-orphan")


class ExerciseMuscle(Base):
    __tablename__ = "exercise_muscles"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    exercise_id = Column(Uuid, ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False)
    muscle_group_id = Column(Uuid, ForeignKey("muscle_groups.id", ondelete="CASCADE"), nullable=False)
    is_primary = Column(Boolean, nullable=False, default=True)
    contribution_pct = Column(Float, nullable=False, default=100.0)

    # Relationships
    exercise = relationship("Exercise", back_populates="muscles")
    muscle_group = relationship("MuscleGroup", back_populates="exercise_mappings")


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String, index=True, nullable=False)
    category = Column(String, nullable=False)  # 'Strength', 'Hypertrophy', 'Cardio', 'Bodyweight'
    equipment = Column(String, nullable=True)  # 'Barbell', 'Dumbbell', 'Machine', 'Cables', 'Bodyweight'
    description = Column(String, nullable=True)
    is_custom = Column(Boolean, nullable=False, default=False)
    created_by = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    primary_muscle_group_id = Column(Uuid, ForeignKey("muscle_groups.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    primary_muscle_group = relationship("MuscleGroup", foreign_keys=[primary_muscle_group_id])
    muscles = relationship("ExerciseMuscle", back_populates="exercise", cascade="all, delete-orphan")
    media = relationship("ExerciseMedia", back_populates="exercise", uselist=False, cascade="all, delete-orphan")
    template_exercises = relationship("WorkoutTemplateExercise", back_populates="exercise", cascade="all, delete-orphan")
    workout_sets = relationship("WorkoutSet", back_populates="exercise", cascade="all, delete-orphan")
    personal_records = relationship("PersonalRecord", back_populates="exercise", cascade="all, delete-orphan")


class ExerciseMedia(Base):
    __tablename__ = "exercise_media"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    exercise_id = Column(Uuid, ForeignKey("exercises.id", ondelete="CASCADE"), unique=True, nullable=False)
    video_url = Column(String, nullable=True)
    thumbnail_url = Column(String, nullable=True)

    # Relationships
    exercise = relationship("Exercise", back_populates="media")


class PersonalRecord(Base):
    __tablename__ = "personal_records"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    exercise_id = Column(Uuid, ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False)
    best_weight = Column(Float, nullable=False, default=0.0)
    best_volume = Column(Float, nullable=False, default=0.0)
    best_estimated_1rm = Column(Float, nullable=False, default=0.0)
    record_date = Column(Date, nullable=False)

    # Relationships
    user = relationship("User", back_populates="personal_records")
    exercise = relationship("Exercise", back_populates="personal_records")


class WorkoutGoal(Base):
    __tablename__ = "workout_goals"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    target_workouts_per_week = Column(Integer, nullable=False, default=3)
    target_volume = Column(Float, nullable=False, default=0.0)
    target_strength_goal = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="workout_goal")


class WorkoutStreak(Base):
    __tablename__ = "workout_streaks"

    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    daily_streak = Column(Integer, nullable=False, default=0)
    weekly_streak = Column(Integer, nullable=False, default=0)
    longest_daily_streak = Column(Integer, nullable=False, default=0)
    longest_weekly_streak = Column(Integer, nullable=False, default=0)
    last_workout_date = Column(Date, nullable=True)

    # Relationships
    user = relationship("User", back_populates="workout_streak", uselist=False)


class WorkoutTemplate(Base):
    __tablename__ = "workout_templates"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="workout_templates")
    exercises = relationship("WorkoutTemplateExercise", back_populates="template", cascade="all, delete-orphan")


class WorkoutTemplateExercise(Base):
    __tablename__ = "workout_template_exercises"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    template_id = Column(Uuid, ForeignKey("workout_templates.id", ondelete="CASCADE"), nullable=False)
    exercise_id = Column(Uuid, ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False)
    order = Column(Integer, nullable=False)
    target_sets = Column(Integer, nullable=False, default=3)
    target_reps = Column(Integer, nullable=True)
    target_weight = Column(Float, nullable=True)
    rest_seconds = Column(Integer, nullable=True, default=90)

    # Relationships
    template = relationship("WorkoutTemplate", back_populates="exercises")
    exercise = relationship("Exercise", back_populates="template_exercises")


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    template_id = Column(Uuid, ForeignKey("workout_templates.id", ondelete="SET NULL"), nullable=True)
    name = Column(String, nullable=False)
    started_at = Column(DateTime, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    notes = Column(String, nullable=True)
    total_volume = Column(Float, nullable=False, default=0.0)
    total_sets = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="workout_sessions")
    sets = relationship("WorkoutSet", back_populates="session", cascade="all, delete-orphan")


class WorkoutSet(Base):
    __tablename__ = "workout_sets"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    session_id = Column(Uuid, ForeignKey("workout_sessions.id", ondelete="CASCADE"), nullable=False)
    exercise_id = Column(Uuid, ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False)
    set_number = Column(Integer, nullable=False)
    reps = Column(Integer, nullable=False)
    weight = Column(Float, nullable=False)
    rpe = Column(Float, nullable=True)
    rest_seconds = Column(Integer, nullable=True)
    is_pr = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    session = relationship("WorkoutSession", back_populates="sets")
    exercise = relationship("Exercise", back_populates="workout_sets")


class AIWorkoutPlan(Base):
    __tablename__ = "ai_workout_plans"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    workout_type = Column(String, nullable=False)  # 'Home', 'Gym'
    goal = Column(String, nullable=False)
    experience_level = Column(String, nullable=False)
    days_per_week = Column(Integer, nullable=False)
    plan_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="ai_workout_plans")


class AIMealPlan(Base):
    __tablename__ = "ai_meal_plans"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    diet_type = Column(String, nullable=False)  # 'Vegetarian', 'Non Vegetarian'
    diet_cuisine = Column(String, nullable=False)  # 'Indian Diet', 'Global'
    calories = Column(Float, nullable=False)
    protein = Column(Float, nullable=False)
    carbohydrates = Column(Float, nullable=False)
    fat = Column(Float, nullable=False)
    meals_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Biometrics used at time of generation
    goal = Column(String, nullable=True)
    weight = Column(Float, nullable=True)
    height = Column(Float, nullable=True)
    age = Column(Integer, nullable=True)
    activity_level = Column(String, nullable=True)

    user = relationship("User", back_populates="ai_meal_plans")


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    key = Column(String, unique=True, index=True, nullable=False)  # 'first_login', etc.
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    icon = Column(String, nullable=False)  # e.g., 'LogIn', 'Dumbbell'
    max_progress = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    user_links = relationship("UserAchievement", back_populates="achievement", cascade="all, delete-orphan")


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    achievement_id = Column(Uuid, ForeignKey("achievements.id", ondelete="CASCADE"), nullable=False)
    current_progress = Column(Integer, nullable=False, default=0)
    is_unlocked = Column(Boolean, nullable=False, default=False)
    unlocked_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="user_achievements")
    achievement = relationship("Achievement", back_populates="user_links")


class AIInsight(Base):
    __tablename__ = "ai_insights"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    type = Column(String, nullable=False)  # 'hydration', 'protein', 'workout', 'calories', 'weight', 'prediction', 'achievement'
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    status = Column(String, nullable=False)  # 'success', 'warning', 'info'
    priority = Column(String, nullable=False)  # 'low', 'medium', 'high'
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="ai_insights")


class FoodRecognitionLog(Base):
    __tablename__ = "food_recognition_logs"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    image_filename = Column(String, nullable=False)
    image_hash = Column(String, index=True, nullable=True)
    status = Column(String, nullable=False, default="pending")  # 'pending', 'processing', 'completed', 'failed'
    processing_time_ms = Column(Float, nullable=True)
    food_name = Column(String, nullable=True)
    calories = Column(Float, nullable=True)
    protein = Column(Float, nullable=True)
    carbohydrates = Column(Float, nullable=True)
    fat = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)
    provider = Column(String, nullable=True)  # 'gemini', 'heuristic'
    food_id = Column(Uuid, ForeignKey("foods.food_id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Phase F-3.5 Fields
    meal_name = Column(String, nullable=True)
    detected_items = Column(JSON, nullable=True)
    confidence_per_item = Column(JSON, nullable=True)
    serving_size_estimation = Column(String, nullable=True)
    estimated_weight_g = Column(Float, nullable=True)
    health_score = Column(Integer, nullable=True)
    nutrition_confidence = Column(Float, nullable=True)
    goal_alignment = Column(JSON, nullable=True)
    recommendation = Column(String, nullable=True)
    healthier_alternative = Column(String, nullable=True)
    annotations = Column(JSON, nullable=True)

    user = relationship("User", back_populates="food_recognition_logs")
    food = relationship("Food")




