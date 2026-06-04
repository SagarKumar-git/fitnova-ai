import uuid
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import DailyNutritionSummary, FoodLog, WaterLog, Food

def sync_daily_nutrition(db: Session, user_id, log_date: date):
    """
    Recalculates daily nutritional aggregates and water intake for a user
    on a given date, and upserts the result into the daily_nutrition_summaries table.
    """
    # Cast user_id to a uuid.UUID object if it's a string
    if isinstance(user_id, str):
        user_uuid = uuid.UUID(user_id)
    else:
        user_uuid = user_id

    # 1. Calculate macronutrient totals
    # Query all food logs for this user on this day, joining with the foods table
    logs = db.query(FoodLog, Food).join(Food, FoodLog.food_id == Food.food_id).filter(
        FoodLog.user_id == user_uuid,
        FoodLog.logged_date == log_date
    ).all()

    total_calories = 0.0
    total_protein = 0.0
    total_carbs = 0.0
    total_fats = 0.0

    for log, food in logs:
        multiplier = log.servings
        total_calories += food.calories * multiplier
        total_protein += food.protein * multiplier
        total_carbs += food.carbohydrates * multiplier
        total_fats += food.fat * multiplier

    # 2. Calculate water intake total
    water_sum = db.query(func.sum(WaterLog.amount_ml)).filter(
        WaterLog.user_id == user_uuid,
        WaterLog.logged_date == log_date
    ).scalar() or 0

    # 3. Upsert into daily_nutrition_summaries
    summary = db.query(DailyNutritionSummary).filter(
        DailyNutritionSummary.user_id == user_uuid,
        DailyNutritionSummary.date == log_date
    ).first()

    if not summary:
        summary = DailyNutritionSummary(
            user_id=user_uuid,
            date=log_date,
            total_calories=round(total_calories, 1),
            total_protein=round(total_protein, 1),
            total_carbs=round(total_carbs, 1),
            total_fats=round(total_fats, 1),
            total_water_ml=int(water_sum)
        )
        db.add(summary)
    else:
        summary.total_calories = round(total_calories, 1)
        summary.total_protein = round(total_protein, 1)
        summary.total_carbs = round(total_carbs, 1)
        summary.total_fats = round(total_fats, 1)
        summary.total_water_ml = int(water_sum)

    db.commit()
    db.refresh(summary)
    return summary
