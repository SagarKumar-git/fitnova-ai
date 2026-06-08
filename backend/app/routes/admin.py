from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
import uuid
from datetime import datetime, date, timedelta, time

from app.database import get_db
from app.models import User, FoodLog, MealPlan, Exercise, WorkoutSession, AIWorkoutPlan, AIMealPlan, UserAchievement, WorkoutStreak, FoodRecognitionLog
from app.schemas import (
    AdminStatsResponse, 
    AdminUserResponse,
    DailyAnalyticsPoint,
    AdminAnalyticsResponse,
    UserRoleUpdate,
    LeaderboardUser,
    AdminLeaderboardsResponse,
    AdminFoodScanAnalyticsResponse
)
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
        total_ai_workouts = db.query(AIWorkoutPlan).count()
        total_ai_meal_plans = db.query(AIMealPlan).count()
        total_achievements = db.query(UserAchievement).filter(UserAchievement.is_unlocked == True).count()

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
            active_users=active_users,
            total_ai_workouts=total_ai_workouts,
            total_ai_meal_plans=total_ai_meal_plans,
            total_achievements=total_achievements
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
    of total food logs, total meal plans, total AI workouts, and total achievements.
    """
    try:
        # We select subqueries for each count to optimize performance and prevent Cartesian product errors
        food_logs_sub = db.query(FoodLog.user_id, func.count(FoodLog.log_id).label("cnt")).group_by(FoodLog.user_id).subquery()
        meal_plans_sub = db.query(MealPlan.user_id, func.count(MealPlan.meal_plan_id).label("cnt")).group_by(MealPlan.user_id).subquery()
        ai_workouts_sub = db.query(AIWorkoutPlan.user_id, func.count(AIWorkoutPlan.id).label("cnt")).group_by(AIWorkoutPlan.user_id).subquery()
        achievements_sub = db.query(UserAchievement.user_id, func.count(UserAchievement.id).label("cnt")).filter(UserAchievement.is_unlocked == True).group_by(UserAchievement.user_id).subquery()

        users_with_counts = db.query(
            User.id,
            User.name,
            User.email,
            User.role,
            User.created_at,
            func.coalesce(food_logs_sub.c.cnt, 0).label("total_food_logs"),
            func.coalesce(meal_plans_sub.c.cnt, 0).label("total_meal_plans"),
            func.coalesce(ai_workouts_sub.c.cnt, 0).label("total_ai_workouts"),
            func.coalesce(achievements_sub.c.cnt, 0).label("total_achievements")
        ).outerjoin(
            food_logs_sub, User.id == food_logs_sub.c.user_id
        ).outerjoin(
            meal_plans_sub, User.id == meal_plans_sub.c.user_id
        ).outerjoin(
            ai_workouts_sub, User.id == ai_workouts_sub.c.user_id
        ).outerjoin(
            achievements_sub, User.id == achievements_sub.c.user_id
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
                total_meal_plans=u.total_meal_plans,
                total_ai_workouts=u.total_ai_workouts,
                total_achievements=u.total_achievements
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
        food_logs_sub = db.query(FoodLog.user_id, func.count(FoodLog.log_id).label("cnt")).group_by(FoodLog.user_id).subquery()
        meal_plans_sub = db.query(MealPlan.user_id, func.count(MealPlan.meal_plan_id).label("cnt")).group_by(MealPlan.user_id).subquery()
        ai_workouts_sub = db.query(AIWorkoutPlan.user_id, func.count(AIWorkoutPlan.id).label("cnt")).group_by(AIWorkoutPlan.user_id).subquery()
        achievements_sub = db.query(UserAchievement.user_id, func.count(UserAchievement.id).label("cnt")).filter(UserAchievement.is_unlocked == True).group_by(UserAchievement.user_id).subquery()

        top_users = db.query(
            User.id,
            User.name,
            User.email,
            User.role,
            User.created_at,
            func.coalesce(food_logs_sub.c.cnt, 0).label("total_food_logs"),
            func.coalesce(meal_plans_sub.c.cnt, 0).label("total_meal_plans"),
            func.coalesce(ai_workouts_sub.c.cnt, 0).label("total_ai_workouts"),
            func.coalesce(achievements_sub.c.cnt, 0).label("total_achievements")
        ).outerjoin(
            food_logs_sub, User.id == food_logs_sub.c.user_id
        ).outerjoin(
            meal_plans_sub, User.id == meal_plans_sub.c.user_id
        ).outerjoin(
            ai_workouts_sub, User.id == ai_workouts_sub.c.user_id
        ).outerjoin(
            achievements_sub, User.id == achievements_sub.c.user_id
        ).order_by(
            func.coalesce(food_logs_sub.c.cnt, 0).desc()
        ).limit(limit).all()

        return [
            AdminUserResponse(
                id=u.id,
                name=u.name,
                email=u.email,
                role=u.role,
                created_at=u.created_at,
                total_food_logs=u.total_food_logs,
                total_meal_plans=u.total_meal_plans,
                total_ai_workouts=u.total_ai_workouts,
                total_achievements=u.total_achievements
            )
            for u in top_users
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch top active users: {str(e)}"
        )

@router.get("/analytics", response_model=AdminAnalyticsResponse)
def get_admin_analytics(
    range_type: Optional[str] = Query(None, description="7d, 30d, 90d, custom"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    try:
        # Determine start and end date objects
        today = date.today()
        
        if range_type == "7d":
            start = today - timedelta(days=6)
            end = today
        elif range_type == "90d":
            start = today - timedelta(days=89)
            end = today
        elif range_type == "custom":
            if not start_date or not end_date:
                raise HTTPException(status_code=400, detail="start_date and end_date are required for custom range")
            try:
                start = date.fromisoformat(start_date)
                end = date.fromisoformat(end_date)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        else: # Default or "30d"
            start = today - timedelta(days=29)
            end = today

        if start > end:
            raise HTTPException(status_code=400, detail="start_date cannot be after end_date")

        # Compute datetime limits
        start_datetime = datetime.combine(start, time.min)
        end_datetime = datetime.combine(end, time.max)

        # 1. Registrations
        users = db.query(User.created_at).filter(
            User.created_at >= start_datetime,
            User.created_at <= end_datetime
        ).all()
        
        # 2. Food Logs
        food_logs = db.query(FoodLog.logged_date).filter(
            FoodLog.logged_date >= start,
            FoodLog.logged_date <= end
        ).all()

        # 3. Meal Plans
        meal_plans = db.query(MealPlan.created_at).filter(
            MealPlan.created_at >= start_datetime,
            MealPlan.created_at <= end_datetime
        ).all()

        # 4. AI Workouts
        ai_workouts = db.query(AIWorkoutPlan.created_at).filter(
            AIWorkoutPlan.created_at >= start_datetime,
            AIWorkoutPlan.created_at <= end_datetime
        ).all()

        # 5. AI Meal Plans
        ai_meal_plans = db.query(AIMealPlan.created_at).filter(
            AIMealPlan.created_at >= start_datetime,
            AIMealPlan.created_at <= end_datetime
        ).all()

        # 6. Active Users (distinct users active per day)
        # We need FoodLogs and WorkoutSessions within the range
        active_food_logs = db.query(FoodLog.user_id, FoodLog.logged_date).filter(
            FoodLog.logged_date >= start,
            FoodLog.logged_date <= end
        ).all()

        active_workouts = db.query(WorkoutSession.user_id, WorkoutSession.started_at).filter(
            WorkoutSession.started_at >= start_datetime,
            WorkoutSession.started_at <= end_datetime
        ).all()

        # Build dictionaries for fast lookup
        registrations_by_day = {}
        food_logs_by_day = {}
        meal_plans_by_day = {}
        ai_workouts_by_day = {}
        ai_meal_plans_by_day = {}
        active_users_by_day = {} # key: date string, value: set of user_ids

        for u in users:
            d_str = u.created_at.date().isoformat()
            registrations_by_day[d_str] = registrations_by_day.get(d_str, 0) + 1

        for f in food_logs:
            d_str = f.logged_date.isoformat()
            food_logs_by_day[d_str] = food_logs_by_day.get(d_str, 0) + 1

        for m in meal_plans:
            d_str = m.created_at.date().isoformat()
            meal_plans_by_day[d_str] = meal_plans_by_day.get(d_str, 0) + 1

        for w in ai_workouts:
            d_str = w.created_at.date().isoformat()
            ai_workouts_by_day[d_str] = ai_workouts_by_day.get(d_str, 0) + 1

        for am in ai_meal_plans:
            d_str = am.created_at.date().isoformat()
            ai_meal_plans_by_day[d_str] = ai_meal_plans_by_day.get(d_str, 0) + 1

        for afl in active_food_logs:
            d_str = afl.logged_date.isoformat()
            if d_str not in active_users_by_day:
                active_users_by_day[d_str] = set()
            active_users_by_day[d_str].add(afl.user_id)

        for aw in active_workouts:
            d_str = aw.started_at.date().isoformat()
            if d_str not in active_users_by_day:
                active_users_by_day[d_str] = set()
            active_users_by_day[d_str].add(aw.user_id)

        # Loop through each day and construct the list
        series = []
        current = start
        while current <= end:
            d_str = current.isoformat()
            series.append(DailyAnalyticsPoint(
                date=d_str,
                registrations=registrations_by_day.get(d_str, 0),
                active_users=len(active_users_by_day.get(d_str, set())),
                food_logs=food_logs_by_day.get(d_str, 0),
                meal_plans=meal_plans_by_day.get(d_str, 0),
                ai_workouts=ai_workouts_by_day.get(d_str, 0),
                ai_meal_plans=ai_meal_plans_by_day.get(d_str, 0)
            ))
            current += timedelta(days=1)

        return AdminAnalyticsResponse(
            start_date=start.isoformat(),
            end_date=end.isoformat(),
            series=series
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch admin analytics: {str(e)}"
        )

@router.get("/leaderboards", response_model=AdminLeaderboardsResponse)
def get_admin_leaderboards(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    try:
        # Top Workout Users
        top_workouts = db.query(
            User.id,
            User.name,
            User.email,
            func.count(WorkoutSession.id).label("score")
        ).join(
            WorkoutSession, User.id == WorkoutSession.user_id
        ).group_by(
            User.id, User.name, User.email
        ).order_by(
            func.count(WorkoutSession.id).desc()
        ).limit(10).all()

        # Top Nutrition Users
        top_nutrition = db.query(
            User.id,
            User.name,
            User.email,
            func.count(FoodLog.log_id).label("score")
        ).join(
            FoodLog, User.id == FoodLog.user_id
        ).group_by(
            User.id, User.name, User.email
        ).order_by(
            func.count(FoodLog.log_id).desc()
        ).limit(10).all()

        # Top AI Coach Users
        ai_workouts_count = db.query(
            AIWorkoutPlan.user_id,
            func.count(AIWorkoutPlan.id).label("workout_cnt")
        ).group_by(AIWorkoutPlan.user_id).subquery()

        ai_meals_count = db.query(
            AIMealPlan.user_id,
            func.count(AIMealPlan.id).label("meal_cnt")
        ).group_by(AIMealPlan.user_id).subquery()

        top_ai = db.query(
            User.id,
            User.name,
            User.email,
            (func.coalesce(ai_workouts_count.c.workout_cnt, 0) + func.coalesce(ai_meals_count.c.meal_cnt, 0)).label("score")
        ).outerjoin(
            ai_workouts_count, User.id == ai_workouts_count.c.user_id
        ).outerjoin(
            ai_meals_count, User.id == ai_meals_count.c.user_id
        ).filter(
            (ai_workouts_count.c.workout_cnt > 0) | (ai_meals_count.c.meal_cnt > 0)
        ).order_by(
            (func.coalesce(ai_workouts_count.c.workout_cnt, 0) + func.coalesce(ai_meals_count.c.meal_cnt, 0)).desc()
        ).limit(10).all()

        # Top Achievement Users
        top_achievements = db.query(
            User.id,
            User.name,
            User.email,
            func.count(UserAchievement.id).label("score")
        ).join(
            UserAchievement, User.id == UserAchievement.user_id
        ).filter(
            UserAchievement.is_unlocked == True
        ).group_by(
            User.id, User.name, User.email
        ).order_by(
            func.count(UserAchievement.id).desc()
        ).limit(10).all()

        # Top Streak Users
        top_streaks = db.query(
            User.id,
            User.name,
            User.email,
            WorkoutStreak.longest_daily_streak.label("score")
        ).join(
            WorkoutStreak, User.id == WorkoutStreak.user_id
        ).order_by(
            WorkoutStreak.longest_daily_streak.desc()
        ).limit(10).all()

        return AdminLeaderboardsResponse(
            top_workouts=[LeaderboardUser(id=u.id, name=u.name, email=u.email, score=u.score) for u in top_workouts],
            top_nutrition=[LeaderboardUser(id=u.id, name=u.name, email=u.email, score=u.score) for u in top_nutrition],
            top_ai_coach=[LeaderboardUser(id=u.id, name=u.name, email=u.email, score=u.score) for u in top_ai],
            top_achievements=[LeaderboardUser(id=u.id, name=u.name, email=u.email, score=u.score) for u in top_achievements],
            top_streaks=[LeaderboardUser(id=u.id, name=u.name, email=u.email, score=u.score) for u in top_streaks]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch admin leaderboards: {str(e)}"
        )

@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: uuid.UUID,
    role_update: UserRoleUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    try:
        role = role_update.role
        if role not in ["user", "trainer", "admin"]:
            raise HTTPException(status_code=400, detail="Invalid role. Must be 'user', 'trainer', or 'admin'")
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user.role = role
        db.commit()
        return {"message": "User role updated successfully", "id": str(user.id), "role": user.role}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user role: {str(e)}"
        )


@router.get("/analytics/food-scans", response_model=AdminFoodScanAnalyticsResponse)
def get_admin_food_scan_analytics(
    range_type: Optional[str] = Query(None, description="7d, 30d, 90d, custom"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    try:
        today = date.today()
        if range_type == "7d":
            start = today - timedelta(days=6)
            end = today
        elif range_type == "90d":
            start = today - timedelta(days=89)
            end = today
        elif range_type == "custom":
            if not start_date or not end_date:
                raise HTTPException(status_code=400, detail="start_date and end_date are required for custom range")
            start = date.fromisoformat(start_date)
            end = date.fromisoformat(end_date)
        else: # Default or "30d"
            start = today - timedelta(days=29)
            end = today

        start_datetime = datetime.combine(start, time.min)
        end_datetime = datetime.combine(end, time.max)

        scans_query = db.query(FoodRecognitionLog).filter(
            FoodRecognitionLog.created_at >= start_datetime,
            FoodRecognitionLog.created_at <= end_datetime,
            FoodRecognitionLog.status == "completed"
        )
        total_scans = scans_query.count()

        unique_users = db.query(func.count(func.distinct(FoodRecognitionLog.user_id))).filter(
            FoodRecognitionLog.created_at >= start_datetime,
            FoodRecognitionLog.created_at <= end_datetime,
            FoodRecognitionLog.status == "completed"
        ).scalar() or 0

        avg_confidence = db.query(func.avg(FoodRecognitionLog.confidence_score)).filter(
            FoodRecognitionLog.created_at >= start_datetime,
            FoodRecognitionLog.created_at <= end_datetime,
            FoodRecognitionLog.status == "completed"
        ).scalar() or 0.0

        most_scanned = None
        mode_query = db.query(
            FoodRecognitionLog.food_name,
            func.count(FoodRecognitionLog.id).label("cnt")
        ).filter(
            FoodRecognitionLog.created_at >= start_datetime,
            FoodRecognitionLog.created_at <= end_datetime,
            FoodRecognitionLog.status == "completed",
            FoodRecognitionLog.food_name != "Unknown Meal"
        ).group_by(
            FoodRecognitionLog.food_name
        ).order_by(
            desc("cnt")
        ).first()
        if mode_query:
            most_scanned = mode_query[0]

        dates_list = []
        curr = start
        while curr <= end:
            dates_list.append(curr)
            curr += timedelta(days=1)

        activity_logs = db.query(FoodRecognitionLog.created_at).filter(
            FoodRecognitionLog.created_at >= start_datetime,
            FoodRecognitionLog.created_at <= end_datetime,
            FoodRecognitionLog.status == "completed"
        ).all()

        date_counts = {}
        for (created_at,) in activity_logs:
            d_str = created_at.date().isoformat()
            date_counts[d_str] = date_counts.get(d_str, 0) + 1

        daily_activity = [
            {"date": d.isoformat(), "count": date_counts.get(d.isoformat(), 0)}
            for d in dates_list
        ]

        return AdminFoodScanAnalyticsResponse(
            total_scans=total_scans,
            unique_users=unique_users,
            most_scanned_food=most_scanned,
            average_confidence=round(avg_confidence, 2),
            daily_activity=daily_activity
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch food scan analytics: {str(e)}"
        )

