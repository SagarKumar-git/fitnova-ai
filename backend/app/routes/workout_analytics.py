import uuid
from datetime import datetime, date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import User, WorkoutSession, WorkoutSet, Exercise, ExerciseMuscle, MuscleGroup, WorkoutStreak, WorkoutGoal
from app.schemas import WorkoutAnalyticsResponse, WorkoutGoalCreate, WorkoutGoalResponse, WorkoutStreakResponse
from app.auth import get_current_user

router = APIRouter(prefix="/workout/analytics", tags=["Workout Analytics"])

@router.get("", response_model=WorkoutAnalyticsResponse)
def get_workout_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch comprehensive workout metrics, streaks, goals, and muscle group volume percentage distribution.
    """
    # 1. Total sessions
    finished_sessions = db.query(WorkoutSession).filter(
        WorkoutSession.user_id == current_user.id,
        WorkoutSession.ended_at != None
    ).all()

    total_workouts = len(finished_sessions)
    total_volume = sum(s.total_volume for s in finished_sessions)
    total_sets = sum(s.total_sets for s in finished_sessions)
    total_duration_minutes = sum((s.duration_seconds or 0) / 60.0 for s in finished_sessions)

    # 2. Weekly frequency (completed in the last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    weekly_workout_frequency = db.query(WorkoutSession).filter(
        WorkoutSession.user_id == current_user.id,
        WorkoutSession.ended_at >= seven_days_ago
    ).count()

    # 3. Streak
    streak = db.query(WorkoutStreak).filter(WorkoutStreak.user_id == current_user.id).first()
    if not streak:
        streak = WorkoutStreak(
            user_id=current_user.id,
            daily_streak=0,
            weekly_streak=0,
            longest_daily_streak=0,
            longest_weekly_streak=0
        )

    # 4. Goals
    goals = db.query(WorkoutGoal).filter(WorkoutGoal.user_id == current_user.id).first()

    # 5. Muscle volume breakdown
    # Volume per muscle group = set_weight * set_reps * (muscle_contribution_pct / 100.0)
    # Join Sets -> Exercises -> Muscles -> MuscleGroups
    sets_data = db.query(
        WorkoutSet.weight,
        WorkoutSet.reps,
        ExerciseMuscle.contribution_pct,
        MuscleGroup.name
    ).select_from(WorkoutSet)\
     .join(WorkoutSession, WorkoutSet.session_id == WorkoutSession.id)\
     .join(Exercise, WorkoutSet.exercise_id == Exercise.id)\
     .join(ExerciseMuscle, Exercise.id == ExerciseMuscle.exercise_id)\
     .join(MuscleGroup, ExerciseMuscle.muscle_group_id == MuscleGroup.id)\
     .filter(WorkoutSession.user_id == current_user.id, WorkoutSession.ended_at != None)\
     .all()

    muscle_volumes = {}
    total_calculated_volume = 0.0

    for weight, reps, contribution, muscle_name in sets_data:
        set_vol = weight * reps * (contribution / 100.0)
        muscle_volumes[muscle_name] = muscle_volumes.get(muscle_name, 0.0) + set_vol
        total_calculated_volume += set_vol

    # Convert to percentages
    muscle_volume_pct = {}
    if total_calculated_volume > 0:
        for name, vol in muscle_volumes.items():
            muscle_volume_pct[name] = round((vol / total_calculated_volume) * 100.0, 1)
    else:
        # Provide zero list if no sets completed
        all_groups = db.query(MuscleGroup).all()
        for g in all_groups:
            muscle_volume_pct[g.name] = 0.0

    # Ensure response streak details match WorkoutStreakResponse exactly
    streak_response = {
        "user_id": current_user.id,
        "daily_streak": streak.daily_streak,
        "weekly_streak": streak.weekly_streak,
        "longest_daily_streak": streak.longest_daily_streak,
        "longest_weekly_streak": streak.longest_weekly_streak,
        "last_workout_date": streak.last_workout_date
    }

    return {
        "total_workouts": total_workouts,
        "total_volume": round(total_volume, 1),
        "total_sets": total_sets,
        "total_duration_minutes": round(total_duration_minutes, 1),
        "weekly_workout_frequency": weekly_workout_frequency,
        "workout_streak": streak_response,
        "muscle_volume_breakdown": muscle_volume_pct,
        "goals": goals
    }

@router.post("/goals", response_model=WorkoutGoalResponse)
def set_workout_goals(
    goal_in: WorkoutGoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sets or updates the user's weekly workout and strength goals.
    """
    goal = db.query(WorkoutGoal).filter(WorkoutGoal.user_id == current_user.id).first()
    if not goal:
        goal = WorkoutGoal(
            user_id=current_user.id,
            target_workouts_per_week=goal_in.target_workouts_per_week,
            target_volume=goal_in.target_volume,
            target_strength_goal=goal_in.target_strength_goal
        )
        db.add(goal)
    else:
        goal.target_workouts_per_week = goal_in.target_workouts_per_week
        goal.target_volume = goal_in.target_volume
        goal.target_strength_goal = goal_in.target_strength_goal

    db.commit()
    db.refresh(goal)
    return goal
