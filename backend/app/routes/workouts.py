import uuid
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, WorkoutTemplate, WorkoutTemplateExercise, WorkoutSession, WorkoutSet, Exercise
from app.schemas import (
    WorkoutTemplateResponse, WorkoutTemplateCreate,
    WorkoutSessionResponse, WorkoutSessionStart, WorkoutSetCreate, WorkoutSetResponse, WorkoutSessionFinish
)
from app.auth import get_current_user
from app.services.workout_sync import sync_session_totals, check_and_update_pr, update_workout_streaks

router = APIRouter(prefix="/workouts", tags=["Workouts"])

def format_exercise_brief(ex: Exercise) -> dict:
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
        "primary_muscle_group_name": ex.primary_muscle_group.name if ex.primary_muscle_group else None
    }

def format_template(t: WorkoutTemplate) -> dict:
    return {
        "id": t.id,
        "user_id": t.user_id,
        "name": t.name,
        "description": t.description,
        "created_at": t.created_at,
        "exercises": [
            {
                "id": te.id,
                "template_id": te.template_id,
                "exercise_id": te.exercise_id,
                "order": te.order,
                "target_sets": te.target_sets,
                "target_reps": te.target_reps,
                "target_weight": te.target_weight,
                "rest_seconds": te.rest_seconds,
                "exercise": format_exercise_brief(te.exercise) if te.exercise else None
            } for te in sorted(t.exercises, key=lambda x: x.order)
        ]
    }

def format_session(s: WorkoutSession) -> dict:
    return {
        "id": s.id,
        "user_id": s.user_id,
        "template_id": s.template_id,
        "name": s.name,
        "started_at": s.started_at,
        "ended_at": s.ended_at,
        "duration_seconds": s.duration_seconds,
        "notes": s.notes,
        "total_volume": s.total_volume,
        "total_sets": s.total_sets,
        "created_at": s.created_at,
        "sets": [
            {
                "id": st.id,
                "session_id": st.session_id,
                "exercise_id": st.exercise_id,
                "set_number": st.set_number,
                "reps": st.reps,
                "weight": st.weight,
                "rpe": st.rpe,
                "rest_seconds": st.rest_seconds,
                "is_pr": st.is_pr,
                "created_at": st.created_at,
                "exercise_name": st.exercise.name if st.exercise else None
            } for st in sorted(s.sets, key=lambda x: (x.exercise_id, x.set_number))
        ]
    }

# ==========================================
# WORKOUT TEMPLATES API
# ==========================================

@router.get("/templates", response_model=List[WorkoutTemplateResponse])
def get_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch all workout templates created by the user.
    """
    templates = db.query(WorkoutTemplate).filter(WorkoutTemplate.user_id == current_user.id).all()
    return [format_template(t) for t in templates]

@router.post("/templates", response_model=WorkoutTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(
    t_in: WorkoutTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a workout template containing multiple exercises and targets.
    """
    new_template = WorkoutTemplate(
        user_id=current_user.id,
        name=t_in.name,
        description=t_in.description
    )
    db.add(new_template)
    db.flush()

    for idx, ex in enumerate(t_in.exercises):
        # Verify exercise exists
        exercise = db.query(Exercise).filter(Exercise.id == ex.exercise_id).first()
        if not exercise:
            raise HTTPException(status_code=404, detail=f"Exercise {ex.exercise_id} not found")

        template_ex = WorkoutTemplateExercise(
            template_id=new_template.id,
            exercise_id=ex.exercise_id,
            order=ex.order,
            target_sets=ex.target_sets,
            target_reps=ex.target_reps,
            target_weight=ex.target_weight,
            rest_seconds=ex.rest_seconds
        )
        db.add(template_ex)

    db.commit()
    db.refresh(new_template)
    return format_template(new_template)

@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a workout template.
    """
    template = db.query(WorkoutTemplate).filter(
        WorkoutTemplate.id == template_id,
        WorkoutTemplate.user_id == current_user.id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    db.delete(template)
    db.commit()
    return None

# ==========================================
# WORKOUT SESSIONS API
# ==========================================

@router.get("/sessions/active", response_model=Optional[WorkoutSessionResponse])
def get_active_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the user's active session, if any exists.
    """
    session = db.query(WorkoutSession).filter(
        WorkoutSession.user_id == current_user.id,
        WorkoutSession.ended_at == None
    ).first()
    if not session:
        return None
    return format_session(session)

@router.post("/sessions/start", response_model=WorkoutSessionResponse, status_code=status.HTTP_201_CREATED)
def start_session(
    start_in: WorkoutSessionStart,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Starts a new live workout session.
    """
    # Check if there is an active session
    active = db.query(WorkoutSession).filter(
        WorkoutSession.user_id == current_user.id,
        WorkoutSession.ended_at == None
    ).first()
    if active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An active session is already in progress. Please finish it first."
        )

    # Resolve template details if provided
    template_id = start_in.template_id
    if template_id:
        template = db.query(WorkoutTemplate).filter(WorkoutTemplate.id == template_id).first()
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

    new_session = WorkoutSession(
        user_id=current_user.id,
        template_id=template_id,
        name=start_in.name,
        started_at=datetime.utcnow()
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return format_session(new_session)

@router.post("/sessions/log-set", response_model=WorkoutSetResponse, status_code=status.HTTP_201_CREATED)
def log_workout_set(
    set_in: WorkoutSetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Append or overwrite a logged set inside the active workout session.
    """
    session = db.query(WorkoutSession).filter(
        WorkoutSession.user_id == current_user.id,
        WorkoutSession.ended_at == None
    ).first()
    if not session:
        raise HTTPException(status_code=400, detail="No active workout session found")

    # Verify exercise
    exercise = db.query(Exercise).filter(Exercise.id == set_in.exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")

    new_set = WorkoutSet(
        session_id=session.id,
        exercise_id=set_in.exercise_id,
        set_number=set_in.set_number,
        reps=set_in.reps,
        weight=set_in.weight,
        rpe=set_in.rpe,
        rest_seconds=set_in.rest_seconds
    )
    db.add(new_set)
    db.flush()

    # Sync session volume & check if this set breaks a personal record
    sync_session_totals(db, session.id)
    is_pr = check_and_update_pr(db, current_user.id, new_set.id)
    db.refresh(new_set)

    return {
        "id": new_set.id,
        "session_id": new_set.session_id,
        "exercise_id": new_set.exercise_id,
        "set_number": new_set.set_number,
        "reps": new_set.reps,
        "weight": new_set.weight,
        "rpe": new_set.rpe,
        "rest_seconds": new_set.rest_seconds,
        "is_pr": is_pr,
        "created_at": new_set.created_at,
        "exercise_name": exercise.name
    }

@router.delete("/sessions/delete-set/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout_set(
    set_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes a completed set and synchronizes session total volume.
    """
    w_set = db.query(WorkoutSet).join(WorkoutSession).filter(
        WorkoutSet.id == set_id,
        WorkoutSession.user_id == current_user.id,
        WorkoutSession.ended_at == None
    ).first()
    if not w_set:
        raise HTTPException(status_code=404, detail="Logged set not found in active session")

    session_id = w_set.session_id
    db.delete(w_set)
    db.flush()

    sync_session_totals(db, session_id)
    db.commit()
    return None

@router.post("/sessions/finish", response_model=WorkoutSessionResponse)
def finish_session(
    finish_in: WorkoutSessionFinish,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Complete the active workout session, compute duration, and trigger streaks increment.
    """
    session = db.query(WorkoutSession).filter(
        WorkoutSession.user_id == current_user.id,
        WorkoutSession.ended_at == None
    ).first()
    if not session:
        raise HTTPException(status_code=400, detail="No active workout session found")

    session.ended_at = datetime.utcnow()
    session.duration_seconds = int((session.ended_at - session.started_at).total_seconds())
    if finish_in.notes:
        session.notes = finish_in.notes

    # Compute final metrics and cache streak increment
    sync_session_totals(db, session.id)
    update_workout_streaks(db, current_user.id, session.ended_at.date())

    db.commit()
    db.refresh(session)
    return format_session(session)
