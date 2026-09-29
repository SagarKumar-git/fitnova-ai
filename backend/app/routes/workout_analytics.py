import uuid
from datetime import datetime, date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import (
    User,
    WorkoutSession,
    WorkoutSet,
    Exercise,
    ExerciseMuscle,
    MuscleGroup,
    WorkoutStreak,
    WorkoutGoal,
    PersonalRecord,
)
from app.schemas import (
    WorkoutAnalyticsResponse,
    WorkoutGoalCreate,
    WorkoutGoalResponse,
    WorkoutStreakResponse,
    StrengthAnalyticsResponse,
    StrengthProgressionItem,
    VolumeAnalyticsResponse,
    VolumeWeeklyPoint,
    VolumeMonthlyPoint,
    ConsistencyAnalyticsResponse,
    ExerciseHistoryAnalyticsResponse,
)
from app.auth import get_current_user

router = APIRouter(prefix="/workout/analytics", tags=["Workout Analytics"])
router_plural = APIRouter(prefix="/workouts", tags=["Workout Analytics & Intelligence"])


def compute_user_workout_analytics(current_user: User, db: Session) -> dict:
    """
    Computes primary workout metrics, volume totals, streaks, and muscle distribution.
    """
    finished_sessions = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.user_id == current_user.id, WorkoutSession.ended_at != None)
        .all()
    )

    total_workouts = len(finished_sessions)
    total_volume = sum(s.total_volume for s in finished_sessions)
    total_sets = sum(s.total_sets for s in finished_sessions)
    total_duration_minutes = sum((s.duration_seconds or 0) / 60.0 for s in finished_sessions)

    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    weekly_workout_frequency = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.ended_at >= seven_days_ago,
        )
        .count()
    )

    streak = db.query(WorkoutStreak).filter(WorkoutStreak.user_id == current_user.id).first()
    if not streak:
        streak = WorkoutStreak(
            user_id=current_user.id,
            daily_streak=0,
            weekly_streak=0,
            longest_daily_streak=0,
            longest_weekly_streak=0,
        )

    goals = db.query(WorkoutGoal).filter(WorkoutGoal.user_id == current_user.id).first()

    sets_data = (
        db.query(
            WorkoutSet.weight,
            WorkoutSet.reps,
            ExerciseMuscle.contribution_pct,
            MuscleGroup.name,
        )
        .select_from(WorkoutSet)
        .join(WorkoutSession, WorkoutSet.session_id == WorkoutSession.id)
        .join(Exercise, WorkoutSet.exercise_id == Exercise.id)
        .join(ExerciseMuscle, Exercise.id == ExerciseMuscle.exercise_id)
        .join(MuscleGroup, ExerciseMuscle.muscle_group_id == MuscleGroup.id)
        .filter(WorkoutSession.user_id == current_user.id, WorkoutSession.ended_at != None)
        .all()
    )

    muscle_volumes = {}
    total_calculated_volume = 0.0

    for weight, reps, contribution, muscle_name in sets_data:
        set_vol = weight * reps * (contribution / 100.0)
        muscle_volumes[muscle_name] = muscle_volumes.get(muscle_name, 0.0) + set_vol
        total_calculated_volume += set_vol

    muscle_volume_pct = {}
    if total_calculated_volume > 0:
        for name, vol in muscle_volumes.items():
            muscle_volume_pct[name] = round((vol / total_calculated_volume) * 100.0, 1)
    else:
        all_groups = db.query(MuscleGroup).all()
        for g in all_groups:
            muscle_volume_pct[g.name] = 0.0

    streak_response = {
        "user_id": current_user.id,
        "daily_streak": streak.daily_streak,
        "weekly_streak": streak.weekly_streak,
        "longest_daily_streak": streak.longest_daily_streak,
        "longest_weekly_streak": streak.longest_weekly_streak,
        "last_workout_date": streak.last_workout_date,
    }

    return {
        "total_workouts": total_workouts,
        "total_volume": round(total_volume, 1),
        "total_sets": total_sets,
        "total_duration_minutes": round(total_duration_minutes, 1),
        "weekly_workout_frequency": weekly_workout_frequency,
        "workout_streak": streak_response,
        "muscle_volume_breakdown": muscle_volume_pct,
        "goals": goals,
    }


# ==========================================
# 1. PRIMARY ANALYTICS & GOALS
# ==========================================

@router.get("", response_model=WorkoutAnalyticsResponse)
def get_workout_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetch comprehensive workout metrics, streaks, goals, and muscle group volume percentage distribution.
    """
    return compute_user_workout_analytics(current_user, db)


@router.post("/goals", response_model=WorkoutGoalResponse)
def set_workout_goals(
    goal_in: WorkoutGoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
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
            target_strength_goal=goal_in.target_strength_goal,
        )
        db.add(goal)
    else:
        goal.target_workouts_per_week = goal_in.target_workouts_per_week
        goal.target_volume = goal_in.target_volume
        goal.target_strength_goal = goal_in.target_strength_goal

    db.commit()
    db.refresh(goal)
    return goal


# ==========================================
# 2. SPRINT 3.6 WORKOUTS ROUTER EXPANSION
# ==========================================

@router_plural.get("/analytics", response_model=WorkoutAnalyticsResponse)
def get_workouts_analytics_plural(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Plural REST alias for comprehensive workout metrics.
    """
    return compute_user_workout_analytics(current_user, db)


@router_plural.get("/analytics/strength", response_model=StrengthAnalyticsResponse)
def get_strength_analytics(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=50, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns paginated exercise strength progression, 1RM improvements, and historical curves.
    """
    # Fetch distinct exercises the user has performed
    exercise_ids_query = (
        db.query(WorkoutSet.exercise_id)
        .join(WorkoutSession, WorkoutSet.session_id == WorkoutSession.id)
        .filter(WorkoutSession.user_id == current_user.id, WorkoutSession.ended_at != None)
        .distinct()
    )

    all_exercise_ids = [row[0] for row in exercise_ids_query.all()]
    total_exercises = len(all_exercise_ids)

    offset = (page - 1) * page_size
    page_ids = all_exercise_ids[offset : offset + page_size]
    total_pages = max(1, (total_exercises + page_size - 1) // page_size)

    exercises_progress: List[StrengthProgressionItem] = []

    for ex_id in page_ids:
        ex = db.query(Exercise).filter(Exercise.id == ex_id).first()
        ex_name = ex.name if ex else "Exercise"

        sets = (
            db.query(WorkoutSet)
            .join(WorkoutSession)
            .filter(
                WorkoutSession.user_id == current_user.id,
                WorkoutSet.exercise_id == ex_id,
                WorkoutSession.ended_at != None,
            )
            .order_by(WorkoutSet.created_at.asc())
            .all()
        )

        if not sets:
            continue

        trend_points = []
        max_weight = 0.0
        max_reps = 0
        total_vol = 0.0
        sessions_seen = set()

        for s in sets:
            sessions_seen.add(s.session_id)
            w = s.weight or 0.0
            r = s.reps or 0
            est_1rm = w * (1.0 + r / 30.0) if r > 1 else w

            if w > max_weight:
                max_weight = w
            if r > max_reps:
                max_reps = r
            total_vol += w * r

            trend_points.append(
                {
                    "date": str(s.created_at.date() if s.created_at else date.today()),
                    "weight": w,
                    "reps": r,
                    "estimated_1rm": round(est_1rm, 1),
                    "volume": round(w * r, 1),
                }
            )

        previous_1rm = trend_points[0]["estimated_1rm"]
        current_1rm = trend_points[-1]["estimated_1rm"]
        pct_imp = (
            round(((current_1rm - previous_1rm) / previous_1rm) * 100.0, 1)
            if previous_1rm > 0
            else 0.0
        )

        last_date = sets[-1].created_at.date() if sets[-1].created_at else None

        exercises_progress.append(
            StrengthProgressionItem(
                exercise_id=ex_id,
                exercise_name=ex_name,
                previous_1rm=previous_1rm,
                current_1rm=current_1rm,
                percentage_improvement=pct_imp,
                max_weight=max_weight,
                max_reps=max_reps,
                total_volume=round(total_vol, 1),
                number_of_sessions=len(sessions_seen),
                last_performed_date=last_date,
                trend=trend_points,
            )
        )

    return StrengthAnalyticsResponse(
        total_exercises=total_exercises,
        exercises=exercises_progress,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router_plural.get("/analytics/volume", response_model=VolumeAnalyticsResponse)
def get_volume_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns weekly and monthly volume trends across historical sessions.
    """
    sessions = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.user_id == current_user.id, WorkoutSession.ended_at != None)
        .order_by(WorkoutSession.ended_at.asc())
        .all()
    )

    week_map = {}
    month_map = {}
    total_volume_kg = 0.0

    for s in sessions:
        end_time = s.ended_at
        if not end_time:
            continue
        vol = s.total_volume or 0.0
        total_volume_kg += vol

        week_key = end_time.strftime("%Y-W%W")
        if week_key not in week_map:
            week_map[week_key] = {"volume": 0.0, "count": 0}
        week_map[week_key]["volume"] += vol
        week_map[week_key]["count"] += 1

        month_key = end_time.strftime("%Y-%m")
        if month_key not in month_map:
            month_map[month_key] = {"volume": 0.0, "count": 0}
        month_map[month_key]["volume"] += vol
        month_map[month_key]["count"] += 1

    weekly_trends = [
        VolumeWeeklyPoint(
            week=k,
            volume_kg=round(v["volume"], 1),
            workouts_count=v["count"],
            average_volume_per_workout=round(v["volume"] / max(1, v["count"]), 1),
        )
        for k, v in week_map.items()
    ]

    monthly_trends = [
        VolumeMonthlyPoint(
            month=k,
            volume_kg=round(v["volume"], 1),
            workouts_count=v["count"],
        )
        for k, v in month_map.items()
    ]

    return VolumeAnalyticsResponse(
        total_volume_kg=round(total_volume_kg, 1),
        weekly_trends=weekly_trends,
        monthly_trends=monthly_trends,
    )


@router_plural.get("/analytics/consistency", response_model=ConsistencyAnalyticsResponse)
def get_consistency_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns workout consistency score, adherence %, frequency, and active streak metrics.
    """
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)

    recent_sessions = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.ended_at != None,
            WorkoutSession.ended_at >= thirty_days_ago,
        )
        .order_by(WorkoutSession.ended_at.asc())
        .all()
    )

    all_sessions = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.user_id == current_user.id, WorkoutSession.ended_at != None)
        .order_by(WorkoutSession.ended_at.asc())
        .all()
    )

    total_workouts = len(all_sessions)
    weekly_frequency = round((len(recent_sessions) / 4.28), 1)

    target_days = 4
    goal = db.query(WorkoutGoal).filter(WorkoutGoal.user_id == current_user.id).first()
    if goal and goal.target_workouts_per_week:
        target_days = goal.target_workouts_per_week

    adherence_pct = min(100.0, round((weekly_frequency / target_days) * 100.0, 1))

    streak = db.query(WorkoutStreak).filter(WorkoutStreak.user_id == current_user.id).first()
    curr_streak = streak.weekly_streak if streak else 0
    longest_streak = streak.longest_weekly_streak if streak else 0

    avg_gap_days = 2.0
    if len(all_sessions) >= 2:
        gaps = [
            (all_sessions[i].ended_at - all_sessions[i - 1].ended_at).total_seconds() / 86400.0
            for i in range(1, len(all_sessions))
            if all_sessions[i].ended_at and all_sessions[i - 1].ended_at
        ]
        if gaps:
            avg_gap_days = round(sum(gaps) / len(gaps), 1)

    expected_recent = round(target_days * 4.28)
    missed_count = max(0, expected_recent - len(recent_sessions))

    # Consistency Score: 0-100
    score = int(round(adherence_pct * 0.5 + min(25.0, curr_streak * 3.5) + (25.0 if avg_gap_days <= 3.5 else 12.0)))
    score = max(0, min(100, score))

    rating = "Building"
    if score >= 85:
        rating = "Elite"
    elif score >= 70:
        rating = "Consistent"
    elif score < 50:
        rating = "Inconsistent"

    summary = f"Consistency Score: {score}/100 ({rating}). Averaging {weekly_frequency} workouts/week."
    tip = (
        "Outstanding discipline! Maintain your current routine to maximize progressive overload gains."
        if score >= 75
        else "Lock in planned workout times in advance to boost weekly adherence."
    )

    return ConsistencyAnalyticsResponse(
        weekly_workout_frequency=weekly_frequency,
        adherence_percentage=adherence_pct,
        current_streak_weeks=curr_streak,
        longest_streak_weeks=longest_streak,
        total_workouts=total_workouts,
        consistency_score=score,
        rating_label=rating,
        average_days_between_sessions=avg_gap_days,
        missed_planned_workouts=missed_count,
        summary=summary,
        actionable_tip=tip,
    )


@router_plural.get(
    "/exercises/{exercise_id}/history",
    response_model=ExerciseHistoryAnalyticsResponse,
)
def get_exercise_analytics_history(
    exercise_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns user performance history, sets, 1RM improvements, and PR data for a specific exercise.
    """
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")

    sets = (
        db.query(WorkoutSet)
        .join(WorkoutSession)
        .filter(
            WorkoutSession.user_id == current_user.id,
            WorkoutSet.exercise_id == exercise_id,
            WorkoutSession.ended_at != None,
        )
        .order_by(WorkoutSet.created_at.asc())
        .all()
    )

    pr = (
        db.query(PersonalRecord)
        .filter(
            PersonalRecord.user_id == current_user.id,
            PersonalRecord.exercise_id == exercise_id,
        )
        .first()
    )

    raw_history = []
    sessions_seen = set()
    max_weight = 0.0
    max_reps = 0

    for s in sets:
        sessions_seen.add(s.session_id)
        w = s.weight or 0.0
        r = s.reps or 0
        if w > max_weight:
            max_weight = w
        if r > max_reps:
            max_reps = r

        est_1rm = w * (1.0 + r / 30.0) if r > 1 else w
        raw_history.append(
            {
                "set_id": str(s.id),
                "weight": w,
                "reps": r,
                "rpe": s.rpe,
                "is_pr": s.is_pr,
                "date": str(s.created_at.date() if s.created_at else date.today()),
                "estimated_1rm": round(est_1rm, 1),
            }
        )

    # Progress curve: Best 1RM per unique date
    curve_map = {}
    for entry in raw_history:
        d = entry["date"]
        if d not in curve_map or entry["estimated_1rm"] > curve_map[d]:
            curve_map[d] = entry["estimated_1rm"]

    progress_curve = [{"date": k, "estimated_1rm": v} for k, v in curve_map.items()]

    previous_1rm = progress_curve[0]["estimated_1rm"] if progress_curve else 0.0
    current_1rm = progress_curve[-1]["estimated_1rm"] if progress_curve else 0.0
    pct_imp = (
        round(((current_1rm - previous_1rm) / previous_1rm) * 100.0, 1)
        if previous_1rm > 0
        else 0.0
    )

    pr_data = None
    if pr:
        pr_data = {
            "best_weight": pr.best_weight,
            "best_volume": pr.best_volume,
            "best_estimated_1rm": pr.best_estimated_1rm,
            "record_date": str(pr.record_date) if pr.record_date else None,
        }

    return ExerciseHistoryAnalyticsResponse(
        exercise_id=exercise_id,
        exercise_name=ex.name,
        total_sessions=len(sessions_seen),
        max_weight=max_weight,
        max_reps=max_reps,
        current_estimated_1rm=current_1rm,
        previous_estimated_1rm=previous_1rm,
        percentage_improvement=pct_imp,
        sets_history=raw_history,
        progress_curve=progress_curve,
        personal_record=pr_data,
    )
