import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models import (
    User, 
    Achievement, 
    UserAchievement, 
    WorkoutSession, 
    MealPlan, 
    WorkoutStreak, 
    DailyNutritionSummary, 
    AIWorkoutPlan, 
    AIMealPlan
)
from app.schemas import AchievementResponse
from app.auth import get_current_user
from app.calculations import calculate_protein_target, calculate_water_target

router = APIRouter(prefix="/achievements", tags=["Achievements"])

def sync_user_achievements(db: Session, user: User) -> List[UserAchievement]:
    """
    Syncs the user's database records with the user_achievements table
    based on custom rules and returns the list of achievements.
    """
    # 1. Fetch all available seeded achievements
    achievements = db.query(Achievement).all()
    if not achievements:
        return []

    # 2. Gather user metrics
    workout_count = db.query(WorkoutSession).filter(
        WorkoutSession.user_id == user.id,
        WorkoutSession.ended_at.isnot(None)
    ).count()

    meal_plan_count = db.query(MealPlan).filter(
        MealPlan.user_id == user.id
    ).count()

    streak_record = db.query(WorkoutStreak).filter(
        WorkoutStreak.user_id == user.id
    ).first()
    
    daily_streak = streak_record.daily_streak if streak_record else 0
    longest_streak = streak_record.longest_daily_streak if streak_record else 0
    max_streak = max(daily_streak, longest_streak)

    # Calculate protein and water targets
    profile = user.profile
    if profile:
        protein_target = calculate_protein_target(profile.weight, profile.goal)
        water_target_ml = calculate_water_target(profile.weight, profile.activity_level) * 1000.0
    else:
        protein_target = 100.0
        water_target_ml = 2500.0

    met_protein_days = db.query(DailyNutritionSummary).filter(
        DailyNutritionSummary.user_id == user.id,
        DailyNutritionSummary.total_protein >= protein_target
    ).count()

    met_water_days = db.query(DailyNutritionSummary).filter(
        DailyNutritionSummary.user_id == user.id,
        DailyNutritionSummary.total_water_ml >= water_target_ml
    ).count()

    ai_plans_count = db.query(AIWorkoutPlan).filter(
        AIWorkoutPlan.user_id == user.id
    ).count() + db.query(AIMealPlan).filter(
        AIMealPlan.user_id == user.id
    ).count()

    # 3. Define calculation rules by badge key
    rules = {
        "first_login": {
            "progress": 1,
            "unlocked": True
        },
        "first_workout": {
            "progress": min(workout_count, 1),
            "unlocked": workout_count >= 1
        },
        "first_meal_plan": {
            "progress": min(meal_plan_count, 1),
            "unlocked": meal_plan_count >= 1
        },
        "seven_day_streak": {
            "progress": min(max_streak, 7),
            "unlocked": max_streak >= 7
        },
        "thirty_day_streak": {
            "progress": min(max_streak, 30),
            "unlocked": max_streak >= 30
        },
        "protein_master": {
            "progress": min(met_protein_days, 1),
            "unlocked": met_protein_days >= 1
        },
        "hydration_king": {
            "progress": min(met_water_days, 1),
            "unlocked": met_water_days >= 1
        },
        "ai_coach_user": {
            "progress": min(ai_plans_count, 1),
            "unlocked": ai_plans_count >= 1
        },
        "gym_beast": {
            "progress": min(workout_count, 20),
            "unlocked": workout_count >= 20
        }
    }

    # 4. Synchronize records in DB
    user_badge_links = []
    for achievement in achievements:
        rule = rules.get(achievement.key)
        if not rule:
            continue

        # Look up link
        link = db.query(UserAchievement).filter(
            UserAchievement.user_id == user.id,
            UserAchievement.achievement_id == achievement.id
        ).first()

        current_progress = rule["progress"]
        is_unlocked = rule["unlocked"]

        if not link:
            # Create link
            link = UserAchievement(
                user_id=user.id,
                achievement_id=achievement.id,
                current_progress=current_progress,
                is_unlocked=is_unlocked,
                unlocked_at=datetime.now() if is_unlocked else None
            )
            db.add(link)
        else:
            # Update existing link
            if is_unlocked and not link.is_unlocked:
                link.unlocked_at = datetime.now()
            link.is_unlocked = is_unlocked
            link.current_progress = current_progress
            db.add(link)

        user_badge_links.append((achievement, link))

    db.commit()
    
    # Return formatted results
    return user_badge_links

@router.get("", response_model=List[AchievementResponse])
def get_user_achievements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exposes achievements and badge statuses for the current user,
    syncing records dynamically before returning.
    """
    try:
        badge_links = sync_user_achievements(db, current_user)
        
        response_list = []
        for achievement, link in badge_links:
            response_list.append(
                AchievementResponse(
                    key=achievement.key,
                    title=achievement.title,
                    description=achievement.description,
                    icon=achievement.icon,
                    max_progress=achievement.max_progress,
                    current_progress=link.current_progress,
                    is_unlocked=link.is_unlocked,
                    unlocked_at=link.unlocked_at
                )
            )
        return response_list
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync achievements: {str(e)}"
        )
