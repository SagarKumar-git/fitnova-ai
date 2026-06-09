import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, time

from app.database import get_db
from app.models import User, AIWorkoutPlan, AIMealPlan
from app.schemas import (
    AIProfileResponse, 
    AIWorkoutCreate, 
    AIWorkoutResponse, 
    AIMealCreate, 
    AIMealResponse
)
from app.auth import get_current_user
from app.calculations import (
    calculate_bmr, 
    calculate_tdee, 
    calculate_calorie_target, 
    calculate_protein_target, 
    calculate_water_target
)
from app.gemini_client import call_gemini_api
from app.ai_logger import log_ai_usage

router = APIRouter(prefix="/ai", tags=["AI Coach"])

@router.get("/profile", response_model=AIProfileResponse)
def get_ai_profile_analysis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyzes the user's profile and returns biometric Baselines (BMI, BMR, TDEE, Calories, Protein, Water).
    """
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Please complete profile setup first."
        )

    try:
        # 1. BMI Calculation
        bmi = profile.weight / ((profile.height / 100.0) ** 2)

        # 2. Baselines using Mifflin-St Jeor and targets
        bmr = calculate_bmr(profile.weight, profile.height, profile.age, profile.gender)
        tdee = calculate_tdee(bmr, profile.activity_level)
        daily_calories = calculate_calorie_target(tdee, profile.goal)
        daily_protein = calculate_protein_target(profile.weight, profile.goal)
        daily_water = calculate_water_target(profile.weight, profile.activity_level)

        return AIProfileResponse(
            name=current_user.name,
            age=profile.age,
            gender=profile.gender,
            height=profile.height,
            weight=profile.weight,
            goal=profile.goal,
            experience_level=profile.experience_level,
            activity_level=profile.activity_level,
            bmi=round(bmi, 2),
            bmr=round(bmr, 1),
            tdee=round(tdee, 1),
            daily_calories=round(daily_calories, 1),
            daily_protein=round(daily_protein, 1),
            daily_water=round(daily_water, 2)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate biometrics: {str(e)}"
        )


@router.post("/workout", response_model=AIWorkoutResponse)
def generate_workout_plan(
    workout_in: AIWorkoutCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates a personalized daily workout plan and stores it in the database.
    """
    # 1. Enforce usage limits per user: max 5 generations per day
    today_start = datetime.combine(date.today(), time.min)
    today_end = datetime.combine(date.today(), time.max)
    count = db.query(AIWorkoutPlan).filter(
        AIWorkoutPlan.user_id == current_user.id,
        AIWorkoutPlan.created_at >= today_start,
        AIWorkoutPlan.created_at <= today_end
    ).count()
    if count >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Daily AI workout plan generation limit reached (5 plans/day)."
        )

    # 2. Formulate the prompt
    prompt = (
        f"Generate a daily workout plan for a user with the following profile:\n"
        f"- Primary Goal: {workout_in.goal}\n"
        f"- Experience Level: {workout_in.experience_level}\n"
        f"- Workout Days per Week: {workout_in.days_per_week}\n"
        f"- Training Location: {workout_in.workout_type} (Gym or Home)\n\n"
        f"You must return a JSON object where the keys are day labels (e.g. 'Day 1 (Push)', 'Day 2 (Rest)') "
        f"covering exactly 7 days. Each day's value must be an object with the following fields:\n"
        f"- 'type': string ('Push', 'Pull', 'Legs', 'Full Body', or 'Rest')\n"
        f"- 'exercises': list of objects, each with 'exercise' (string name), 'sets' (integer), 'reps' (string like '8-10' or '12'), "
        f"'rest' (string like '90 seconds'), and 'notes' (string instruction).\n"
        f"If the day is a 'Rest' day, the 'exercises' list should be empty [].\n\n"
        f"Please provide highly realistic, personalized exercises suitable for their experience and goal."
    )

    plan_data = None
    input_tokens = 0
    output_tokens = 0
    success = False
    model_name = "gemini-2.5-flash"

    # 3. Request from Gemini API
    response_text, in_t, out_t, ok = call_gemini_api(prompt, json_mode=True)
    if ok and response_text:
        try:
            plan_data = json.loads(response_text)
            input_tokens = in_t
            output_tokens = out_t
            success = True
        except Exception as parse_err:
            print(f"Failed to parse Gemini workout JSON: {parse_err}")

    # 4. Fallback to existing rule-based logic if Gemini fails
    if not success:
        model_name = "rule-based-fallback"
        try:
            # Heuristics for exercise configurations based on experience level
            sets = 3
            reps = "10-12"
            rest = "90 seconds"
            if workout_in.experience_level.lower() == "beginner":
                sets = 3
                reps = "12-15"
                rest = "90 seconds"
            elif workout_in.experience_level.lower() == "intermediate":
                sets = 3
                reps = "8-10"
                rest = "90 seconds"
            elif workout_in.experience_level.lower() == "advanced":
                sets = 4
                reps = "6-8"
                rest = "120 seconds"

            # Generate days plan structure based on days_per_week and workout_type
            is_gym = workout_in.workout_type.lower() == "gym"
            plan_data = {}

            # Pre-configured routines depending on gym availability
            routines = {
                "gym": {
                    "Push": [
                        {"exercise": "Bench Press", "sets": sets, "reps": reps, "rest": rest, "notes": "Focus on chest contraction"},
                        {"exercise": "Overhead Press", "sets": sets, "reps": reps, "rest": rest, "notes": "Keep core tight"},
                        {"exercise": "Incline Dumbbell Flys", "sets": sets, "reps": "12", "rest": rest, "notes": "Control the descent"},
                        {"exercise": "Tricep Pushdowns", "sets": sets, "reps": "12-15", "rest": "60 seconds", "notes": "Keep elbows tucked"}
                    ],
                    "Pull": [
                        {"exercise": "Deadlift", "sets": sets, "reps": "5", "rest": rest, "notes": "Maintain neutral spine"},
                        {"exercise": "Lat Pulldown", "sets": sets, "reps": reps, "rest": rest, "notes": "Pull with your elbows"},
                        {"exercise": "Seated Cable Rows", "sets": sets, "reps": reps, "rest": rest, "notes": "Squeeze shoulder blades"},
                        {"exercise": "Dumbbell Bicep Curls", "sets": sets, "reps": "12", "rest": "65 seconds", "notes": "No body swing"}
                    ],
                    "Legs": [
                        {"exercise": "Barbell Squats", "sets": sets, "reps": reps, "rest": rest, "notes": "Squat to parallel or lower"},
                        {"exercise": "Romanian Deadlifts", "sets": sets, "reps": reps, "rest": rest, "notes": "Hinge at the hips"},
                        {"exercise": "Leg Press", "sets": sets, "reps": "12", "rest": rest, "notes": "Do not lock out knees"},
                        {"exercise": "Calf Raises", "sets": 4, "reps": "15", "rest": "60 seconds", "notes": "Pause at peak contraction"}
                    ],
                    "Full Body": [
                        {"exercise": "Barbell Squats", "sets": sets, "reps": reps, "rest": rest, "notes": "Keep chest high"},
                        {"exercise": "Dumbbell Bench Press", "sets": sets, "reps": reps, "rest": rest, "notes": "Full range of motion"},
                        {"exercise": "Bent Over Rows", "sets": sets, "reps": reps, "rest": rest, "notes": "Squeeze lats"},
                        {"exercise": "Plank", "sets": 3, "reps": "60 seconds", "rest": "60 seconds", "notes": "Keep body straight"}
                    ],
                    "Rest": []
                },
                "home": {
                    "Push": [
                        {"exercise": "Decline Push-ups", "sets": sets, "reps": "12-15", "rest": rest, "notes": "Hits upper chest"},
                        {"exercise": "Standard Push-ups", "sets": sets, "reps": "15-20", "rest": rest, "notes": "Core engaged"},
                        {"exercise": "Pike Push-ups", "sets": sets, "reps": "8-10", "rest": rest, "notes": "Shoulder focus"},
                        {"exercise": "Bench Dips", "sets": sets, "reps": "12-15", "rest": "60 seconds", "notes": "Keep back close to bench"}
                    ],
                    "Pull": [
                        {"exercise": "Bodyweight Inverted Rows", "sets": sets, "reps": "12-15", "rest": rest, "notes": "Under stable table or bar"},
                        {"exercise": "Doorway Pull-ins", "sets": sets, "reps": "15", "rest": rest, "notes": "Squeeze shoulder blades"},
                        {"exercise": "Water Bottle Bicep Curls", "sets": sets, "reps": "15-20", "rest": "60 seconds", "notes": "Control the squeeze"},
                        {"exercise": "Superman Holds", "sets": 3, "reps": "30 seconds", "rest": "60 seconds", "notes": "Back extension strength"}
                    ],
                    "Legs": [
                        {"exercise": "Air Squats", "sets": sets, "reps": "20", "rest": rest, "notes": "Full depth"},
                        {"exercise": "Bulgarian Split Squats", "sets": sets, "reps": "12 per leg", "rest": rest, "notes": "Elevate rear foot"},
                        {"exercise": "Glute Bridges", "sets": sets, "reps": "15-20", "rest": "60 seconds", "notes": "Squeeze glutes at top"},
                        {"exercise": "Single-Leg Calf Raises", "sets": 3, "reps": "15 per leg", "rest": "60 seconds", "notes": "Slow controlled temp"}
                    ],
                    "Full Body": [
                        {"exercise": "Burpees", "sets": 3, "reps": "10-12", "rest": rest, "notes": "High intensity"},
                        {"exercise": "Air Squats", "sets": sets, "reps": "20", "rest": rest, "notes": "Keep weight on heels"},
                        {"exercise": "Pushups", "sets": sets, "reps": "12-15", "rest": rest, "notes": "Perfect form"},
                        {"exercise": "Plank Hold", "sets": 3, "reps": "45-60 seconds", "rest": "60 seconds", "notes": "Brace core"}
                    ],
                    "Rest": []
                }
            }

            rt = routines["gym"] if is_gym else routines["home"]

            # Map training structure according to days per week selection
            days_seq = []
            if workout_in.days_per_week == 1:
                days_seq = [("Day 1 (Full Body)", "Full Body")] + [("Day " + str(i) + " (Rest)", "Rest") for i in range(2, 8)]
            elif workout_in.days_per_week == 2:
                days_seq = [("Day 1 (Full Body)", "Full Body"), ("Day 2 (Rest)", "Rest"), ("Day 3 (Full Body)", "Full Body")] + [("Day " + str(i) + " (Rest)", "Rest") for i in range(4, 8)]
            elif workout_in.days_per_week == 3:
                days_seq = [
                    ("Day 1 (Push)", "Push"),
                    ("Day 2 (Rest)", "Rest"),
                    ("Day 3 (Pull)", "Pull"),
                    ("Day 4 (Rest)", "Rest"),
                    ("Day 5 (Legs)", "Legs"),
                    ("Day 6 (Rest)", "Rest"),
                    ("Day 7 (Rest)", "Rest")
                ]
            elif workout_in.days_per_week == 4:
                days_seq = [
                    ("Day 1 (Push)", "Push"),
                    ("Day 2 (Pull)", "Pull"),
                    ("Day 3 (Rest)", "Rest"),
                    ("Day 4 (Legs)", "Legs"),
                    ("Day 5 (Rest)", "Rest"),
                    ("Day 6 (Full Body)", "Full Body"),
                    ("Day 7 (Rest)", "Rest")
                ]
            elif workout_in.days_per_week == 5:
                days_seq = [
                    ("Day 1 (Push)", "Push"),
                    ("Day 2 (Pull)", "Pull"),
                    ("Day 3 (Rest)", "Rest"),
                    ("Day 4 (Legs)", "Legs"),
                    ("Day 5 (Push)", "Push"),
                    ("Day 6 (Pull)", "Pull"),
                    ("Day 7 (Rest)", "Rest")
                ]
            elif workout_in.days_per_week == 6:
                days_seq = [
                    ("Day 1 (Push)", "Push"),
                    ("Day 2 (Pull)", "Pull"),
                    ("Day 3 (Legs)", "Legs"),
                    ("Day 4 (Push)", "Push"),
                    ("Day 5 (Pull)", "Pull"),
                    ("Day 6 (Legs)", "Legs"),
                    ("Day 7 (Rest)", "Rest")
                ]
            else:  # 7 Days
                days_seq = [
                    ("Day 1 (Push)", "Push"),
                    ("Day 2 (Pull)", "Pull"),
                    ("Day 3 (Legs)", "Legs"),
                    ("Day 4 (Push)", "Push"),
                    ("Day 5 (Pull)", "Pull"),
                    ("Day 6 (Legs)", "Legs"),
                    ("Day 7 (Full Body)", "Full Body")
                ]

            for title, r_type in days_seq:
                plan_data[title] = {
                    "type": r_type,
                    "exercises": rt[r_type]
                }
        except Exception as fallback_err:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Rule-based fallback failed: {str(fallback_err)}"
            )

    # 5. Log AI usage analytics locally
    log_ai_usage(
        user_id=current_user.id,
        user_name=current_user.name,
        feature="workout",
        prompt=prompt,
        response=response_text if success else json.dumps(plan_data),
        success=success,
        model=model_name,
        input_tokens=input_tokens,
        output_tokens=output_tokens
    )

    try:
        new_plan = AIWorkoutPlan(
            user_id=current_user.id,
            workout_type=workout_in.workout_type,
            goal=workout_in.goal,
            experience_level=workout_in.experience_level,
            days_per_week=workout_in.days_per_week,
            plan_data=plan_data
        )
        db.add(new_plan)
        db.commit()
        db.refresh(new_plan)
        return new_plan
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save workout plan: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate workout plan: {str(e)}"
        )


@router.get("/workout", response_model=AIWorkoutResponse)
def get_latest_workout_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves the latest generated workout plan for the user.
    """
    plan = db.query(AIWorkoutPlan).filter(
        AIWorkoutPlan.user_id == current_user.id
    ).order_by(AIWorkoutPlan.created_at.desc()).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No AI generated workout plans found. Generate a plan first!"
        )
    return plan


@router.delete("/workout/{plan_id}", status_code=status.HTTP_200_OK)
def delete_workout_plan(
    plan_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes a specific generated workout plan from history.
    """
    plan = db.query(AIWorkoutPlan).filter(
        AIWorkoutPlan.id == plan_id,
        AIWorkoutPlan.user_id == current_user.id
    ).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found or not owned by user."
        )

    try:
        db.delete(plan)
        db.commit()
        return {"status": "success", "message": "Workout plan deleted successfully."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete workout plan: {str(e)}"
        )


@router.post("/meal", response_model=AIMealResponse)
def generate_meal_plan(
    meal_in: AIMealCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates a macro-targeted meal plan divided into Breakfast, Lunch, Dinner, and Snacks.
    """
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Please complete profile setup first."
        )

    # 1. Enforce usage limits per user: max 5 generations per day
    today_start = datetime.combine(date.today(), time.min)
    today_end = datetime.combine(date.today(), time.max)
    count = db.query(AIMealPlan).filter(
        AIMealPlan.user_id == current_user.id,
        AIMealPlan.created_at >= today_start,
        AIMealPlan.created_at <= today_end
    ).count()
    if count >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Daily AI meal plan generation limit reached (5 plans/day)."
        )

    try:
        # Calculate daily targets
        bmr = calculate_bmr(profile.weight, profile.height, profile.age, profile.gender)
        tdee = calculate_tdee(bmr, profile.activity_level)
        calories = calculate_calorie_target(tdee, profile.goal)
        protein = calculate_protein_target(profile.weight, profile.goal)
        
        # Calculate fats: 25% of calorie intake, 1g fat = 9 calories
        fat = (calories * 0.25) / 9.0
        # Calculate carbs: remaining calories, 1g carb/protein = 4 calories
        carbs = (calories - (protein * 4.0) - (fat * 9.0)) / 4.0

        # Meal splits
        # Breakfast: 25%, Lunch: 35%, Dinner: 30%, Snacks: 10%
        macro_splits = {
            "Breakfast": {"cal": calories * 0.25, "p": protein * 0.25, "c": carbs * 0.25, "f": fat * 0.25},
            "Lunch": {"cal": calories * 0.35, "p": protein * 0.35, "c": carbs * 0.35, "f": fat * 0.35},
            "Dinner": {"cal": calories * 0.30, "p": protein * 0.30, "c": carbs * 0.30, "f": fat * 0.30},
            "Snack": {"cal": calories * 0.10, "p": protein * 0.10, "c": carbs * 0.10, "f": fat * 0.10}
        }

        # 2. Formulate the prompt for Gemini
        prompt = (
            f"Generate a daily meal plan with highly realistic and personalized options for a user with the following targets:\n"
            f"- Daily Calories Target: {round(calories, 1)} kcal\n"
            f"- Daily Protein Target: {round(protein, 1)} g\n"
            f"- Daily Carbohydrate Target: {round(carbs, 1)} g\n"
            f"- Daily Fat Target: {round(fat, 1)} g\n"
            f"- Diet Type: {meal_in.diet_type} (e.g., Vegetarian, Non Vegetarian)\n"
            f"- Diet Cuisine Preference: {meal_in.diet_cuisine} (e.g., Indian Diet, Global)\n\n"
            f"You must return a JSON object with keys exactly matching: 'Breakfast', 'Lunch', 'Dinner', 'Snack'. "
            f"Each key's value must be an object with the following fields:\n"
            f"- 'name': string (descriptive, delicious meal name suitable for the diet and cuisine)\n"
            f"- 'calories': float (calories for this meal)\n"
            f"- 'protein': float (protein in grams)\n"
            f"- 'carbohydrates': float (carbohydrates in grams)\n"
            f"- 'fat': float (fat in grams)\n\n"
            f"Ensure the sum of calories and macros across the 4 meals roughly matches the target totals specified above."
        )

        meals_data = None
        input_tokens = 0
        output_tokens = 0
        success = False
        model_name = "gemini-2.5-flash"

        # 3. Request from Gemini API
        response_text, in_t, out_t, ok = call_gemini_api(prompt, json_mode=True)
        if ok and response_text:
            try:
                meals_data = json.loads(response_text)
                # Verify structure contains the required keys
                required_keys = ["Breakfast", "Lunch", "Dinner", "Snack"]
                if all(k in meals_data for k in required_keys):
                    input_tokens = in_t
                    output_tokens = out_t
                    success = True
                else:
                    print(f"Gemini meal plan JSON missing required keys. Received: {list(meals_data.keys())}")
            except Exception as parse_err:
                print(f"Failed to parse Gemini meal plan JSON: {parse_err}")

        # 4. Fallback to existing rule-based logic if Gemini fails
        if not success:
            model_name = "rule-based-fallback"
            is_veg = meal_in.diet_type.lower() == "vegetarian"
            is_indian = meal_in.diet_cuisine.lower() == "indian diet"

            # Content libraries
            meals_db = {
                "indian": {
                    "veg": {
                        "Breakfast": ["Masala Oats with almonds and seeds", "Suji Poha with roasted peanuts", "Idlis with coconut chutney & sambar"],
                        "Lunch": ["Paneer Bhurji with 2 wheat rotis & cucumber salad", "Moong Dal Tadka with boiled brown rice & dahi", "Rajma cooked with brown rice & green salad"],
                        "Dinner": ["Chole curry with wheat roti & dry roasted paneer", "Soya chunk curry with 2 multigrain rotis", "Mixed vegetable paneer kathi roll in whole wheat"],
                        "Snack": ["Roasted chana & green tea", "Low fat curd with sliced banana", "Mixed nuts (almonds, walnuts) with cucumber slice"]
                    },
                    "non_veg": {
                        "Breakfast": ["Scrambled eggs (3 whites, 1 whole) with whole wheat toast", "Egg Bhurji with 2 rotis & glass of milk", "Chicken breast keema wrap in whole wheat"],
                        "Lunch": ["Grilled chicken breast with boiled rice & cooked dal", "Chicken Curry with brown rice & onion salad", "Fish curry with steamed basmati rice & cucumber salad"],
                        "Dinner": ["Grilled fish with steamed veggies and roti", "Chicken breast salad with lemon olive oil dressing", "Boiled egg curry with wheat rotis"],
                        "Snack": ["Hard boiled egg whites (3)", "Roasted soya chunks", "Mixed seed mix with green tea"]
                    }
                },
                "global": {
                    "veg": {
                        "Breakfast": ["Oatmeal with chia seeds, honey & mixed berries", "Avocado Toast on sourdough with cherry tomatoes", "Greek yogurt bowl with granola & sliced almonds"],
                        "Lunch": ["Quinoa and black bean salad with olive oil", "Mediterranean paneer salad with hummus wrap", "Tofu stir-fry with mixed vegetables & jasmine rice"],
                        "Dinner": ["Lentil soup with crusty whole grain bread", "Baked sweet potato with broccoli & garlic tofu", "Vegetarian whole wheat pasta with marinara"],
                        "Snack": ["Celery sticks with peanut butter", "Apple slices with walnuts", "Cottage cheese with pineapple slices"]
                    },
                    "non_veg": {
                        "Breakfast": ["Egg white omelette with spinach & turkey bacon", "Smoked salmon bagel with cream cheese & capers", "Protein shake with banana & peanut butter"],
                        "Lunch": ["Grilled chicken breast with sweet potato & green beans", "Turkey and avocado sandwich on whole wheat", "Tuna salad cup with olive oil & mixed greens"],
                        "Dinner": ["Baked salmon fillet with asparagus & brown rice", "Sirloin steak with roasted brussels sprouts", "Grilled chicken breast with quinoa and avocado salad"],
                        "Snack": ["Beef jerky / Turkey slices", "Whey protein shake with water", "Boiled egg with almonds"]
                    }
                }
            }

            cuisine_db = meals_db["indian"] if is_indian else meals_db["global"]
            diet_db = cuisine_db["veg"] if is_veg else cuisine_db["non_veg"]

            # Formulate final output
            meals_data = {}
            for meal_type, macros in macro_splits.items():
                meal_options = diet_db[meal_type]
                # Select option based on simple hashing or random
                idx = (int(profile.weight) + int(profile.height) + int(calories)) % len(meal_options)
                meal_name = meal_options[idx]

                meals_data[meal_type] = {
                    "name": meal_name,
                    "calories": round(macros["cal"], 1),
                    "protein": round(macros["p"], 1),
                    "carbohydrates": round(macros["c"], 1),
                    "fat": round(macros["f"], 1)
                }

        # 5. Log AI usage analytics locally
        log_ai_usage(
            user_id=current_user.id,
            user_name=current_user.name,
            feature="meal",
            prompt=prompt,
            response=response_text if success else json.dumps(meals_data),
            success=success,
            model=model_name,
            input_tokens=input_tokens,
            output_tokens=output_tokens
        )

        # 6. Save new meal plan to preserve history
        new_meal_plan = AIMealPlan(
            user_id=current_user.id,
            diet_type=meal_in.diet_type,
            diet_cuisine=meal_in.diet_cuisine,
            calories=round(calories, 1),
            protein=round(protein, 1),
            carbohydrates=round(carbs, 1),
            fat=round(fat, 1),
            meals_data=meals_data
        )

        db.add(new_meal_plan)
        db.commit()
        db.refresh(new_meal_plan)
        return new_meal_plan

    except HTTPException as http_exc:
        # Re-raise HTTPExceptions (like 429)
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate meal plan: {str(e)}"
        )


@router.get("/meal", response_model=AIMealResponse)
def get_latest_meal_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves the latest generated meal plan for the user.
    """
    plan = db.query(AIMealPlan).filter(
        AIMealPlan.user_id == current_user.id
    ).order_by(AIMealPlan.created_at.desc()).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No AI generated meal plans found. Generate a plan first!"
        )
    return plan


@router.delete("/meal/{meal_id}", status_code=status.HTTP_200_OK)
def delete_meal_plan(
    meal_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes a specific generated meal plan from history.
    """
    plan = db.query(AIMealPlan).filter(
        AIMealPlan.id == meal_id,
        AIMealPlan.user_id == current_user.id
    ).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal plan not found or not owned by user."
        )

    try:
        db.delete(plan)
        db.commit()
        return {"status": "success", "message": "Meal plan deleted successfully."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete meal plan: {str(e)}"
        )
