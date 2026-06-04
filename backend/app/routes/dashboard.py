from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date

from app.database import get_db
from app.models import User, DailyNutritionSummary
from app.schemas import DashboardResponse
from app.auth import get_current_user
from app.calculations import (
    calculate_bmr,
    calculate_tdee,
    calculate_calorie_target,
    calculate_protein_target,
    calculate_water_target,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("", response_model=DashboardResponse)
def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves dashboard metrics, computed goals, and aggregate nutritional logging progress
    for the current user on the current date.
    """
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile details not found. Please complete profile setup."
        )

    # 1. Run physical metabolic formulas
    bmr_val = calculate_bmr(profile.weight, profile.height, profile.age, profile.gender)
    tdee_val = calculate_tdee(bmr_val, profile.activity_level)
    calories_target = calculate_calorie_target(tdee_val, profile.goal)
    protein_target = calculate_protein_target(profile.weight, profile.goal)
    water_target = calculate_water_target(profile.weight, profile.activity_level)

    # 2. Query today's nutrition summaries cache
    today_summary = db.query(DailyNutritionSummary).filter(
        DailyNutritionSummary.user_id == current_user.id,
        DailyNutritionSummary.date == date.today()
    ).first()

    calories_consumed = 0.0
    protein_consumed = 0.0
    carbs_consumed = 0.0
    fats_consumed = 0.0
    water_consumed_ml = 0

    if today_summary:
        calories_consumed = today_summary.total_calories
        protein_consumed = today_summary.total_protein
        carbs_consumed = today_summary.total_carbs
        fats_consumed = today_summary.total_fats
        water_consumed_ml = today_summary.total_water_ml

    return {
        "name": current_user.name,
        "goal": profile.goal,
        "weight": profile.weight,
        "height": profile.height,
        "experience_level": profile.experience_level,
        "bmr": round(bmr_val, 1),
        "tdee": round(tdee_val, 1),
        "daily_calorie_target": round(calories_target),
        "daily_protein_target": round(protein_target),
        "daily_water_target": round(water_target, 2),
        "workout_plan": {
            "title": "Workout Plan",
            "status": "Coming Soon",
            "message": "FitNova AI will soon generate your custom training program."
        },
        "nutrition_plan": {
            "title": "Nutrition Plan",
            "status": "Coming Soon",
            "message": "FitNova AI will soon design a custom macro-split meal plan."
        },
        # Phase 2 active trackers values
        "calories_consumed": calories_consumed,
        "protein_consumed": protein_consumed,
        "carbs_consumed": carbs_consumed,
        "fats_consumed": fats_consumed,
        "water_consumed_ml": water_consumed_ml
    }
