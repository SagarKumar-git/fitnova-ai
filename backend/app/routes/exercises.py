import uuid
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models import User, Exercise, MuscleGroup, ExerciseMuscle, ExerciseMedia, WorkoutSet, PersonalRecord, WorkoutSession
from app.schemas import ExerciseResponse, ExerciseCreate, MuscleGroupResponse, PersonalRecordResponse
from app.auth import get_current_user

router = APIRouter(prefix="/exercises", tags=["Exercises"])

def format_exercise(ex: Exercise) -> dict:
    return {
        "id": ex.id,
        "name": ex.name,
        "category": ex.category,
        "equipment": ex.equipment,
        "description": ex.description,
        "is_custom": ex.is_custom,
        "created_by": ex.created_by,
        "created_at": ex.created_at,
        "primary_muscle_group_id": ex.primary_muscle_group_id,
        "primary_muscle_group_name": ex.primary_muscle_group.name if ex.primary_muscle_group else None,
        "muscles": [
            {
                "id": m.id,
                "exercise_id": m.exercise_id,
                "muscle_group_id": m.muscle_group_id,
                "is_primary": m.is_primary,
                "contribution_pct": m.contribution_pct,
                "muscle_group_name": m.muscle_group.name if m.muscle_group else None
            } for m in ex.muscles
        ],
        "media": {
            "id": ex.media.id,
            "exercise_id": ex.media.exercise_id,
            "video_url": ex.media.video_url,
            "thumbnail_url": ex.media.thumbnail_url
        } if ex.media else None
    }

@router.get("/muscle-groups", response_model=List[MuscleGroupResponse])
def get_muscle_groups(db: Session = Depends(get_db)):
    """
    Returns all muscle groups for filtering.
    """
    return db.query(MuscleGroup).order_by(MuscleGroup.name).all()

@router.get("", response_model=List[ExerciseResponse])
def get_exercises(
    query: Optional[str] = Query(None),
    muscle_group_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all exercises (global and user's custom), filtered by muscle group or name.
    """
    base_query = db.query(Exercise).filter(
        or_(
            Exercise.is_custom == False,
            Exercise.created_by == current_user.id
        )
    )

    if query:
        base_query = base_query.filter(Exercise.name.ilike(f"%{query}%"))

    if muscle_group_id:
        # Check if it matches primary or is in mapped muscles
        base_query = base_query.join(ExerciseMuscle, isouter=True).filter(
            or_(
                Exercise.primary_muscle_group_id == muscle_group_id,
                ExerciseMuscle.muscle_group_id == muscle_group_id
            )
        )

    results = base_query.all()
    # deduplicate results in case of multiple muscle joins
    seen = set()
    deduped = []
    for r in results:
        if r.id not in seen:
            seen.add(r.id)
            deduped.append(r)

    return [format_exercise(ex) for ex in deduped]

@router.post("", response_model=ExerciseResponse, status_code=status.HTTP_201_CREATED)
def create_custom_exercise(
    ex_in: ExerciseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a user-defined custom exercise, mapping muscle details and media links.
    """
    # 1. Verify primary muscle group exists
    primary_group = db.query(MuscleGroup).filter(MuscleGroup.id == ex_in.primary_muscle_group_id).first()
    if not primary_group:
        raise HTTPException(status_code=404, detail="Primary muscle group not found")

    new_exercise = Exercise(
        name=ex_in.name,
        category=ex_in.category,
        equipment=ex_in.equipment,
        description=ex_in.description,
        primary_muscle_group_id=ex_in.primary_muscle_group_id,
        is_custom=True,
        created_by=current_user.id
    )
    db.add(new_exercise)
    db.flush()  # Generate UUID

    # 2. Add muscles map
    if ex_in.muscles:
        for m in ex_in.muscles:
            mapping = ExerciseMuscle(
                exercise_id=new_exercise.id,
                muscle_group_id=m.muscle_group_id,
                is_primary=m.is_primary,
                contribution_pct=m.contribution_pct
            )
            db.add(mapping)
    else:
        # Default: 100% primary muscle group
        mapping = ExerciseMuscle(
            exercise_id=new_exercise.id,
            muscle_group_id=ex_in.primary_muscle_group_id,
            is_primary=True,
            contribution_pct=100.0
        )
        db.add(mapping)

    # 3. Add media map
    if ex_in.media:
        media_item = ExerciseMedia(
            exercise_id=new_exercise.id,
            video_url=ex_in.media.video_url,
            thumbnail_url=ex_in.media.thumbnail_url
        )
        db.add(media_item)

    db.commit()
    db.refresh(new_exercise)
    return format_exercise(new_exercise)

@router.get("/{exercise_id}/history")
def get_exercise_history(
    exercise_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns user performance history and Epley 1RM curves for a specific exercise.
    """
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")

    # Fetch sets completed by user
    sets = db.query(WorkoutSet).join(WorkoutSession).filter(
        WorkoutSession.user_id == current_user.id,
        WorkoutSet.exercise_id == exercise_id,
        WorkoutSession.ended_at != None
    ).order_by(WorkoutSet.created_at.desc()).all()

    # Fetch personal records
    pr = db.query(PersonalRecord).filter(
        PersonalRecord.user_id == current_user.id,
        PersonalRecord.exercise_id == exercise_id
    ).first()

    # Calculate 1RM history (Epley)
    raw_history = []
    for s in sets:
        est_1rm = s.weight * (1.0 + s.reps / 30.0) if s.reps > 1 else s.weight
        raw_history.append({
            "set_id": s.id,
            "weight": s.weight,
            "reps": s.reps,
            "rpe": s.rpe,
            "is_pr": s.is_pr,
            "date": s.created_at.date() if s.created_at else date.today(),
            "estimated_1rm": round(est_1rm, 1)
        })

    # Group 1RM per date (keep best 1RM per day)
    progress_curve = {}
    for entry in reversed(raw_history):
        d_str = str(entry["date"])
        if d_str not in progress_curve or entry["estimated_1rm"] > progress_curve[d_str]:
            progress_curve[d_str] = entry["estimated_1rm"]

    curve_list = [{"date": k, "estimated_1rm": v} for k, v in progress_curve.items()]

    return {
        "exercise": format_exercise(ex),
        "personal_record": {
            "best_weight": pr.best_weight if pr else 0.0,
            "best_volume": pr.best_volume if pr else 0.0,
            "best_estimated_1rm": pr.best_estimated_1rm if pr else 0.0,
            "record_date": pr.record_date if pr else None
        } if pr else None,
        "sets_history": raw_history,
        "progress_curve": curve_list
    }
