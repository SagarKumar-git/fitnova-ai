from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.database import get_db
from app.models import User, FoodLog, MealPlan, Exercise, WorkoutSession
from app.schemas import AdminStatsResponse, AdminUserResponse
from app.auth import get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])

@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Returns platform-wide metrics: counts of users, food logs, meal plans,
    exercises, and the number of distinct active users (users with activity).
    """
    try:
        total_users = db.query(User).count()
        total_food_logs = db.query(FoodLog).count()
        total_meal_plans = db.query(MealPlan).count()
        total_exercises = db.query(Exercise).count()

        # Count active users: unique users with at least one food log, meal plan, or workout session
        active_users = db.query(User.id).filter(
            (User.id.in_(db.query(FoodLog.user_id))) |
            (User.id.in_(db.query(MealPlan.user_id))) |
            (User.id.in_(db.query(WorkoutSession.user_id)))
        ).count()

        return AdminStatsResponse(
            total_users=total_users,
            total_food_logs=total_food_logs,
            total_meal_plans=total_meal_plans,
            total_exercises=total_exercises,
            active_users=active_users
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch admin stats: {str(e)}"
        )

@router.get("/users", response_model=List[AdminUserResponse])
def get_admin_users(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Returns user directory with joining statistics, specifically counts
    of total food logs and total meal plans created by each user.
    """
    try:
        users_with_counts = db.query(
            User.id,
            User.name,
            User.email,
            User.role,
            User.created_at,
            func.count(func.distinct(FoodLog.log_id)).label("total_food_logs"),
            func.count(func.distinct(MealPlan.meal_plan_id)).label("total_meal_plans")
        ).outerjoin(
            FoodLog, User.id == FoodLog.user_id
        ).outerjoin(
            MealPlan, User.id == MealPlan.user_id
        ).group_by(
            User.id, User.name, User.email, User.role, User.created_at
        ).order_by(
            User.created_at.desc()
        ).all()

        return [
            AdminUserResponse(
                id=u.id,
                name=u.name,
                email=u.email,
                role=u.role,
                created_at=u.created_at,
                total_food_logs=u.total_food_logs,
                total_meal_plans=u.total_meal_plans
            )
            for u in users_with_counts
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch admin users: {str(e)}"
        )

@router.get("/top-users", response_model=List[AdminUserResponse])
def get_top_active_users(
    limit: int = 10,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Returns top active users ordered by food log count.
    """
    try:
        top_users = db.query(
            User.id,
            User.name,
            User.email,
            User.role,
            User.created_at,
            func.count(func.distinct(FoodLog.log_id)).label("total_food_logs"),
            func.count(func.distinct(MealPlan.meal_plan_id)).label("total_meal_plans")
        ).outerjoin(
            FoodLog, User.id == FoodLog.user_id
        ).outerjoin(
            MealPlan, User.id == MealPlan.user_id
        ).group_by(
            User.id, User.name, User.email, User.role, User.created_at
        ).order_by(
            func.count(func.distinct(FoodLog.log_id)).desc()
        ).limit(limit).all()

        return [
            AdminUserResponse(
                id=u.id,
                name=u.name,
                email=u.email,
                role=u.role,
                created_at=u.created_at,
                total_food_logs=u.total_food_logs,
                total_meal_plans=u.total_meal_plans
            )
            for u in top_users
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch top active users: {str(e)}"
        )
