import uuid
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import WorkoutSession, WorkoutSet, PersonalRecord, WorkoutStreak, WorkoutGoal, Exercise, MuscleGroup, ExerciseMuscle

def check_and_update_pr(db: Session, user_id: uuid.UUID, set_id: uuid.UUID) -> bool:
    """
    Computes Epley 1RM and volume for a logged set.
    Checks if it breaks the user's best_weight, best_volume, or best_estimated_1rm for that exercise.
    Updates or inserts a row in the personal_records table.
    """
    # 1. Fetch the set
    w_set = db.query(WorkoutSet).filter(WorkoutSet.id == set_id).first()
    if not w_set:
        return False

    weight = w_set.weight
    reps = w_set.reps
    exercise_id = w_set.exercise_id
    set_date = w_set.created_at.date() if w_set.created_at else date.today()

    # Epley formula for Estimated 1RM
    estimated_1rm = weight * (1.0 + reps / 30.0) if reps > 1 else weight
    volume = weight * reps

    # Fetch existing PR for this user + exercise
    pr = db.query(PersonalRecord).filter(
        PersonalRecord.user_id == user_id,
        PersonalRecord.exercise_id == exercise_id
    ).first()

    is_new_pr = False

    if not pr:
        # Create first PR
        pr = PersonalRecord(
            user_id=user_id,
            exercise_id=exercise_id,
            best_weight=weight,
            best_volume=volume,
            best_estimated_1rm=estimated_1rm,
            record_date=set_date
        )
        db.add(pr)
        is_new_pr = True
    else:
        # Check if any metric is broken
        improved = False
        if weight > pr.best_weight:
            pr.best_weight = weight
            improved = True
        if volume > pr.best_volume:
            pr.best_volume = volume
            improved = True
        if estimated_1rm > pr.best_estimated_1rm:
            pr.best_estimated_1rm = estimated_1rm
            improved = True

        if improved:
            pr.record_date = set_date
            is_new_pr = True

    # Mark the set itself
    w_set.is_pr = is_new_pr
    db.commit()
    return is_new_pr


def update_workout_streaks(db: Session, user_id: uuid.UUID, workout_date: date) -> WorkoutStreak:
    """
    Updates the daily and weekly streaks for the user when a workout session completes.
    """
    streak = db.query(WorkoutStreak).filter(WorkoutStreak.user_id == user_id).first()
    if not streak:
        streak = WorkoutStreak(
            user_id=user_id,
            daily_streak=0,
            weekly_streak=0,
            longest_daily_streak=0,
            longest_weekly_streak=0,
            last_workout_date=None
        )
        db.add(streak)
        db.flush()

    last_date = streak.last_workout_date

    if last_date is None:
        # First workout ever
        streak.daily_streak = 1
        streak.weekly_streak = 1
    else:
        # Calculate daily streak
        delta_days = (workout_date - last_date).days
        if delta_days == 0:
            # Same day workout, keep daily streak the same
            pass
        elif delta_days == 1:
            # Yesterday was last workout
            streak.daily_streak += 1
        else:
            # Reset daily streak
            streak.daily_streak = 1

        # Calculate weekly streak using ISO calendar week numbers
        last_year, last_week, _ = last_date.isocalendar()
        curr_year, curr_week, _ = workout_date.isocalendar()

        if curr_year == last_year:
            week_diff = curr_week - last_week
        else:
            # Simple approximation of week difference across years
            # Or get the start of the ISO weeks and calculate diff
            last_monday = last_date - timedelta(days=last_date.weekday())
            curr_monday = workout_date - timedelta(days=workout_date.weekday())
            week_diff = (curr_monday - last_monday).days // 7

        if week_diff == 0:
            # Same week, keep weekly streak the same
            pass
        elif week_diff == 1:
            # Consective calendar week
            streak.weekly_streak += 1
        else:
            # Reset weekly streak
            streak.weekly_streak = 1

    # Update records
    streak.longest_daily_streak = max(streak.longest_daily_streak, streak.daily_streak)
    streak.longest_weekly_streak = max(streak.longest_weekly_streak, streak.weekly_streak)
    streak.last_workout_date = workout_date
    db.commit()
    return streak


def sync_session_totals(db: Session, session_id: uuid.UUID):
    """
    Computes total sets and volume for a session, updating the workout_sessions table.
    """
    session = db.query(WorkoutSession).filter(WorkoutSession.id == session_id).first()
    if not session:
        return

    # Count sets
    sets = db.query(WorkoutSet).filter(WorkoutSet.session_id == session_id).all()
    session.total_sets = len(sets)

    # Compute volume: sum of weight * reps
    session.total_volume = sum(s.weight * s.reps for s in sets)
    db.commit()
