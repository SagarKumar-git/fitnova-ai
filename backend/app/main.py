from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger("fitnova")

from app.database import engine, Base, SessionLocal
from app.models import Food, MuscleGroup, Exercise, ExerciseMuscle, ExerciseMedia, AIWorkoutPlan, AIMealPlan, Achievement, UserAchievement, AIInsight, FoodRecognitionLog
from app.routes import auth, profile, dashboard, foods, nutrition, water, meal_plans, exercises, workouts, workout_analytics, admin, ai, achievements, insights, food_scan

# Automatically create database tables on startup
# Base.metadata.create_all(bind=engine)
def seed_exercise_database():
    """Seeds default muscle groups and exercises if database is empty."""
    db = SessionLocal()
    try:
        if db.query(MuscleGroup).count() == 0:
            # 1. Seed Muscle Groups
            chest = MuscleGroup(name="Chest")
            back = MuscleGroup(name="Back")
            quads = MuscleGroup(name="Quads")
            hams = MuscleGroup(name="Hamstrings")
            shoulders = MuscleGroup(name="Shoulders")
            biceps = MuscleGroup(name="Biceps")
            triceps = MuscleGroup(name="Triceps")
            abs_m = MuscleGroup(name="Abs")
            calves = MuscleGroup(name="Calves")
            cardio = MuscleGroup(name="Cardiorespiratory")

            db.add_all([chest, back, quads, hams, shoulders, biceps, triceps, abs_m, calves, cardio])
            db.flush()

            # 2. Seed Default Exercises with Mappings & Media
            exercises_seed = [
                # Bench Press
                (
                    Exercise(name="Bench Press", category="Strength", equipment="Barbell", description="Lay flat on a bench, grip the barbell, lower it to your chest and press up.", primary_muscle_group_id=chest.id),
                    [
                        (chest.id, True, 85.0),
                        (triceps.id, False, 10.0),
                        (shoulders.id, False, 5.0)
                    ],
                    ExerciseMedia(video_url="https://assets.mixkit.co/videos/preview/mixkit-man-working-out-on-a-bench-press-34384-large.mp4", thumbnail_url="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200")
                ),
                # Squats
                (
                    Exercise(name="Squat", category="Strength", equipment="Barbell", description="Place barbell on upper back, bend knees and hips to lower thighs parallel to floor, then stand back up.", primary_muscle_group_id=quads.id),
                    [
                        (quads.id, True, 70.0),
                        (hams.id, False, 20.0),
                        (calves.id, False, 10.0)
                    ],
                    ExerciseMedia(video_url="https://assets.mixkit.co/videos/preview/mixkit-man-performing-weighted-squats-in-a-gym-42289-large.mp4", thumbnail_url="https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=200")
                ),
                # Deadlift
                (
                    Exercise(name="Deadlift", category="Strength", equipment="Barbell", description="Hinge at the hips, pull the barbell off the floor to standing height by engaging posterior chain.", primary_muscle_group_id=back.id),
                    [
                        (back.id, True, 50.0),
                        (hams.id, False, 40.0),
                        (quads.id, False, 10.0)
                    ],
                    ExerciseMedia(video_url="https://assets.mixkit.co/videos/preview/mixkit-weightlifter-preparing-for-a-lift-34389-large.mp4", thumbnail_url="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=200")
                ),
                # Overhead Press
                (
                    Exercise(name="Overhead Press", category="Strength", equipment="Barbell", description="Press the barbell vertically from your shoulders until arms are locked out overhead.", primary_muscle_group_id=shoulders.id),
                    [
                        (shoulders.id, True, 80.0),
                        (triceps.id, False, 20.0)
                    ],
                    ExerciseMedia(video_url=None, thumbnail_url="https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=200")
                ),
                # Pull-ups
                (
                    Exercise(name="Pull Up", category="Bodyweight", equipment="Bodyweight", description="Hang from a bar and pull your body up until your chin clears the bar.", primary_muscle_group_id=back.id),
                    [
                        (back.id, True, 75.0),
                        (biceps.id, False, 25.0)
                    ],
                    ExerciseMedia(video_url=None, thumbnail_url="https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=200")
                ),
                # Bicep Curl
                (
                    Exercise(name="Bicep Curl", category="Hypertrophy", equipment="Dumbbell", description="Hold dumbbells and flex at the elbows, bringing the weights toward your shoulders.", primary_muscle_group_id=biceps.id),
                    [
                        (biceps.id, True, 100.0)
                    ],
                    ExerciseMedia(video_url=None, thumbnail_url="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=200")
                ),
                # Plank
                (
                    Exercise(name="Plank", category="Bodyweight", equipment="Bodyweight", description="Hold a push-up position resting on your forearms, keeping your body in a straight line.", primary_muscle_group_id=abs_m.id),
                    [
                        (abs_m.id, True, 100.0)
                    ],
                    ExerciseMedia(video_url=None, thumbnail_url="https://images.unsplash.com/photo-1566241477600-ac026ad43874?w=200")
                )
            ]

            for ex_obj, muscles_data, media_obj in exercises_seed:
                db.add(ex_obj)
                db.flush()

                # Add mappings
                for muscle_id, is_primary, pct in muscles_data:
                    m_map = ExerciseMuscle(
                        exercise_id=ex_obj.id,
                        muscle_group_id=muscle_id,
                        is_primary=is_primary,
                        contribution_pct=pct
                    )
                    db.add(m_map)

                # Add media
                if media_obj:
                    media_obj.exercise_id = ex_obj.id
                    db.add(media_obj)

            db.commit()
            print("Exercise database successfully seeded!")
    except Exception as e:
        print(f"Error seeding exercise database: {e}")
    finally:
        db.close()

def seed_food_database():
    """Seeds default foods if database is empty."""
    db = SessionLocal()
    try:
        if db.query(Food).count() == 0:
            default_foods = [
                # Indian Foods
                Food(name="Roti", brand="Homemade", serving_size=1.0, serving_unit="piece", calories=120.0, protein=3.5, carbohydrates=22.0, fat=0.5, is_custom=False),
                Food(name="Dal cooked", brand="Homemade", serving_size=150.0, serving_unit="g", calories=150.0, protein=8.0, carbohydrates=24.0, fat=2.5, is_custom=False),
                Food(name="Paneer Tikka", brand="Restaurant Style", serving_size=100.0, serving_unit="g", calories=280.0, protein=18.0, carbohydrates=6.0, fat=20.0, is_custom=False),
                Food(name="Rajma cooked", brand="Homemade", serving_size=150.0, serving_unit="g", calories=180.0, protein=9.0, carbohydrates=30.0, fat=2.0, is_custom=False),
                Food(name="Chole cooked", brand="Homemade", serving_size=150.0, serving_unit="g", calories=200.0, protein=8.0, carbohydrates=32.0, fat=3.5, is_custom=False),
                Food(name="Soya Chunks cooked", brand="Nutrela", serving_size=50.0, serving_unit="g", calories=170.0, protein=26.0, carbohydrates=15.0, fat=0.5, is_custom=False),
                Food(name="Cow Milk", brand="Amul", serving_size=250.0, serving_unit="ml", calories=150.0, protein=8.0, carbohydrates=12.0, fat=8.0, is_custom=False),
                Food(name="Curd / Dahi", brand="Mother Dairy", serving_size=150.0, serving_unit="g", calories=100.0, protein=5.0, carbohydrates=6.0, fat=6.0, is_custom=False),
                Food(name="Poha cooked", brand="Homemade", serving_size=150.0, serving_unit="g", calories=220.0, protein=3.5, carbohydrates=44.0, fat=3.0, is_custom=False),
                Food(name="Upma", brand="Homemade", serving_size=150.0, serving_unit="g", calories=240.0, protein=4.5, carbohydrates=42.0, fat=5.0, is_custom=False),
                Food(name="Idli", brand="MTR", serving_size=2.0, serving_unit="pieces", calories=120.0, protein=3.0, carbohydrates=26.0, fat=0.5, is_custom=False),
                Food(name="Dosa Plain", brand="Homemade", serving_size=1.0, serving_unit="piece", calories=150.0, protein=3.0, carbohydrates=28.0, fat=3.0, is_custom=False),
                Food(name="Chicken Curry", brand="Homemade", serving_size=150.0, serving_unit="g", calories=260.0, protein=24.0, carbohydrates=8.0, fat=14.0, is_custom=False),
                Food(name="White Rice Cooked", brand="Basmati", serving_size=150.0, serving_unit="g", calories=195.0, protein=4.0, carbohydrates=42.0, fat=0.5, is_custom=False),
                
                # Global Standards
                Food(name="Chicken Breast Cooked", brand="Standard", serving_size=100.0, serving_unit="g", calories=165.0, protein=31.0, carbohydrates=0.0, fat=3.6, is_custom=False),
                Food(name="Whole Egg", brand="Standard", serving_size=1.0, serving_unit="egg", calories=70.0, protein=6.0, carbohydrates=0.6, fat=5.0, is_custom=False),
                Food(name="Whey Protein", brand="Optimum Nutrition", serving_size=30.0, serving_unit="g", calories=120.0, protein=24.0, carbohydrates=3.0, fat=1.5, is_custom=False),
                Food(name="Banana", brand="Standard", serving_size=1.0, serving_unit="medium", calories=105.0, protein=1.3, carbohydrates=27.0, fat=0.3, is_custom=False),
            ]
            db.bulk_save_objects(default_foods)
            db.commit()
            print("Food database successfully seeded!")
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()

def seed_achievements_database():
    """Seeds default achievements/badges if database is empty."""
    db = SessionLocal()
    try:
        if db.query(Achievement).count() == 0:
            default_badges = [
                Achievement(key="first_login", title="First Login", description="Log in to FitNova AI for the first time.", icon="LogIn", max_progress=1),
                Achievement(key="first_workout", title="First Workout", description="Complete your first logged workout session.", icon="Dumbbell", max_progress=1),
                Achievement(key="first_meal_plan", title="First Meal Plan", description="Create your first customized meal plan.", icon="Coffee", max_progress=1),
                Achievement(key="seven_day_streak", title="7 Day Streak", description="Reach a workout consistency streak of 7 days.", icon="Flame", max_progress=7),
                Achievement(key="thirty_day_streak", title="30 Day Streak", description="Reach a workout consistency streak of 30 days.", icon="Sparkles", max_progress=30),
                Achievement(key="protein_master", title="Protein Master", description="Meet your daily protein target for a day.", icon="Zap", max_progress=1),
                Achievement(key="hydration_king", title="Hydration King", description="Meet your daily hydration target for a day.", icon="Droplet", max_progress=1),
                Achievement(key="ai_coach_user", title="AI Coach User", description="Generate a plan using the AI Coach.", icon="Sparkles", max_progress=1),
                Achievement(key="gym_beast", title="Gym Beast", description="Log and complete 20 total workout sessions.", icon="Award", max_progress=20)
            ]
            db.bulk_save_objects(default_badges)
            db.commit()
            print("Achievements database successfully seeded!")
    except Exception as e:
        print(f"Error seeding achievements: {e}")
    finally:
        db.close()


# Run seeders
# seed_food_database()
# seed_exercise_database()

# Surgically initialize only the new AI and achievement tables on startup
try:
    AIWorkoutPlan.__table__.create(bind=engine, checkfirst=True)
    AIMealPlan.__table__.create(bind=engine, checkfirst=True)
    Achievement.__table__.create(bind=engine, checkfirst=True)
    UserAchievement.__table__.create(bind=engine, checkfirst=True)
    AIInsight.__table__.create(bind=engine, checkfirst=True)
    FoodRecognitionLog.__table__.create(bind=engine, checkfirst=True)
    print("AI Coach, Achievement, AI Insight, and Food Recognition tables successfully initialized!")
except Exception as e:
    print(f"Error surgically initializing tables: {e}")

# Run seeders
# seed_food_database()
# seed_exercise_database()
seed_achievements_database()

app = FastAPI(


    title="FitNova AI API",
    description="Backend API for FitNova AI - Personalized Fitness & Nutrition Platform",
    version="1.0.0"
)

from fastapi.staticfiles import StaticFiles
import os

static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
os.makedirs(os.path.join(static_dir, "uploads"), exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",

    "https://fitnova-ai-9yua.vercel.app",
    "https://fitnova-ai-txvs.vercel.app",
]
# Controlled Vercel wildcard CORS: allow all *.vercel.app preview deploys for this project
VERCEL_ORIGIN_REGEX = r"https://fitnova-ai[\w-]*\.vercel\.app"

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=VERCEL_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Global exception handler — prevents raw 500 stack traces leaking to clients
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected server error occurred. Please try again later."},
    )

# Route registrations
app.include_router(auth.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(foods.router, prefix="/api")
app.include_router(nutrition.router, prefix="/api")
app.include_router(water.router, prefix="/api")
app.include_router(meal_plans.router, prefix="/api")
app.include_router(exercises.router, prefix="/api")
app.include_router(workouts.router, prefix="/api")
app.include_router(workout_analytics.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(achievements.router, prefix="/api")
app.include_router(insights.router, prefix="/api")
app.include_router(food_scan.router, prefix="/api/v1")




@app.get("/api/debug/vision-provider", tags=["Debug"])
def debug_vision_provider():
    from app.config import settings
    has_key = bool(settings.GEMINI_API_KEY)
    provider_name = "gemini" if has_key else "heuristic"
    return {
        "provider": provider_name,
        "gemini_key_present": has_key
    }

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "FitNova API Running",
        "docs": "/docs",
        "health": "/api/health"
    }

@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "service": "FitNova AI API"}