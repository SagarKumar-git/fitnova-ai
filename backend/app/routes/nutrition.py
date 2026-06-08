from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import date
from typing import List

from app.database import get_db
from app.models import User, FoodLog, Food
from app.schemas import FoodLogCreate, FoodLogResponse
from app.auth import get_current_user
from app.services.nutrition_sync import sync_daily_nutrition

router = APIRouter(prefix="/logs/nutrition", tags=["Nutrition Logs"])

@router.get("", response_model=List[FoodLogResponse])
def get_nutrition_logs(
    logged_date: date = Query(default_factory=date.today),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves all food logs for the current user on the specified date.
    Includes details about the associated food item (macronutrients).
    """
    logs = db.query(FoodLog).filter(
        FoodLog.user_id == current_user.id,
        FoodLog.logged_date == logged_date
    ).all()
    return logs

@router.post("", response_model=FoodLogResponse, status_code=status.HTTP_201_CREATED)
def log_food(
    log_in: FoodLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Logs food eaten by the user.
    Triggers automatic daily nutrition summary aggregate updates.
    """
    # Verify food exists
    food = db.query(Food).filter(Food.food_id == log_in.food_id).first()
    if not food:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Food item not found"
        )

    new_log = FoodLog(
        user_id=current_user.id,
        food_id=log_in.food_id,
        meal_type=log_in.meal_type,
        servings=log_in.servings,
        logged_date=log_in.logged_date
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    # Sync daily aggregate totals in summaries cache
    sync_daily_nutrition(db, str(current_user.id), log_in.logged_date)

    # Audit Logging
    import logging
    logger = logging.getLogger("fitnova.nutrition")
    logger.info(f"AUDIT: User {current_user.id} logged meal: food_id={new_log.food_id}, servings={new_log.servings}, meal_type={new_log.meal_type}, date={new_log.logged_date}")

    return new_log

@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_food_log(
    log_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes a specific food log entry from the user's diary.
    Recalculates daily totals.
    """
    import uuid
    try:
        log_uuid = uuid.UUID(log_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid log ID format"
        )

    log = db.query(FoodLog).filter(
        FoodLog.log_id == log_uuid,
        FoodLog.user_id == current_user.id
    ).first()

    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Food log entry not found"
        )

    logged_date = log.logged_date
    db.delete(log)
    db.commit()

    # Recalculate daily aggregate summaries
    sync_daily_nutrition(db, str(current_user.id), logged_date)

    return None
