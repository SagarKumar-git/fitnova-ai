from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import date
from typing import List
import uuid

from app.database import get_db
from app.models import User, MealPlan, MealPlanItem, FoodLog, Food
from app.schemas import MealPlanCreate, MealPlanResponse
from app.auth import get_current_user
from app.services.nutrition_sync import sync_daily_nutrition

router = APIRouter(prefix="/meal-plans", tags=["Meal Plans"])

@router.get("", response_model=List[MealPlanResponse])
def get_meal_plans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists all saved meal plans for the user.
    """
    plans = db.query(MealPlan).filter(MealPlan.user_id == current_user.id).all()
    return plans

@router.post("", response_model=MealPlanResponse, status_code=status.HTTP_201_CREATED)
def create_meal_plan(
    plan_in: MealPlanCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a new meal plan template containing a list of food items.
    """
    new_plan = MealPlan(
        user_id=current_user.id,
        name=plan_in.name
    )
    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)

    # Add items to the plan
    for item in plan_in.items:
        # Verify food exists
        food = db.query(Food).filter(Food.food_id == item.food_id).first()
        if not food:
            # Clean up and rollback
            db.delete(new_plan)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Food item {item.food_id} not found"
            )
        
        plan_item = MealPlanItem(
            meal_plan_id=new_plan.meal_plan_id,
            food_id=item.food_id,
            meal_type=item.meal_type,
            servings=item.servings
        )
        db.add(plan_item)
    
    db.commit()
    db.refresh(new_plan)
    return new_plan

@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal_plan(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes a saved meal plan template.
    """
    try:
        plan_uuid = uuid.UUID(plan_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan ID format"
        )

    plan = db.query(MealPlan).filter(
        MealPlan.meal_plan_id == plan_uuid,
        MealPlan.user_id == current_user.id
    ).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal plan template not found"
        )

    db.delete(plan)
    db.commit()
    return None

@router.post("/{plan_id}/apply", status_code=status.HTTP_200_OK)
def apply_meal_plan(
    plan_id: str,
    logged_date: date = Query(default=date.today),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Clones all foods inside a meal plan template and logs them
    into the active food_logs table for the specified date.
    Recalculates daily nutritional aggregates.
    """
    try:
        plan_uuid = uuid.UUID(plan_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan ID format"
        )

    plan = db.query(MealPlan).filter(
        MealPlan.meal_plan_id == plan_uuid,
        MealPlan.user_id == current_user.id
    ).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal plan template not found"
        )

    if not plan.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot apply empty meal plan"
        )

    # Log each item
    for item in plan.items:
        log_entry = FoodLog(
            user_id=current_user.id,
            food_id=item.food_id,
            meal_type=item.meal_type,
            servings=item.servings,
            logged_date=logged_date
        )
        db.add(log_entry)
    
    db.commit()

    # Sync daily summary
    sync_daily_nutrition(db, str(current_user.id), logged_date)

    return {"message": f"Successfully applied meal plan '{plan.name}' to {logged_date}"}
