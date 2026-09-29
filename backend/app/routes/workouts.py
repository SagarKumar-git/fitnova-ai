import uuid
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    User, WorkoutTemplate, WorkoutTemplateExercise, WorkoutSession,
    WorkoutSet, Exercise, WorkoutIdempotencyRecord
)
from app.schemas import (
    WorkoutTemplateResponse, WorkoutTemplateCreate,
    WorkoutSessionResponse, WorkoutSessionStart, WorkoutSetCreate, WorkoutSetResponse,
    WorkoutSessionFinish, WorkoutSessionUpdate, WorkoutSessionCancel, ExerciseSubstitutionRequest
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
        "status": s.status or "active",
        "rating": s.rating,
        "calories": s.calories or 0.0,
        "version": s.version or 1,
        "created_at": s.created_at,
        "updated_at": s.updated_at,
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
                "is_skipped": st.is_skipped or False,
                "notes": st.notes,
                "substitute_exercise_id": st.substitute_exercise_id,
                "substitute_exercise_name": st.substitute_exercise.name if st.substitute_exercise else None,
                "version": st.version or 1,
                "created_at": st.created_at,
                "exercise_name": st.exercise.name if st.exercise else None
            } for st in sorted(s.sets, key=lambda x: (x.exercise_id, x.set_number))
        ]
    }

import json

def to_json_safe(data):
    def serializer(obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if isinstance(obj, uuid.UUID):
            return str(obj)
        return str(obj)
    return json.loads(json.dumps(data, default=serializer))

def check_idempotency(db: Session, user_id: uuid.UUID, idempotency_key: Optional[str]) -> Optional[dict]:
    if not idempotency_key:
        return None
    rec = db.query(WorkoutIdempotencyRecord).filter(
        WorkoutIdempotencyRecord.user_id == user_id,
        WorkoutIdempotencyRecord.idempotency_key == idempotency_key
    ).first()
    if rec:
        return rec.response_payload
    return None

def record_idempotency(db: Session, user_id: uuid.UUID, idempotency_key: Optional[str], endpoint: str, status_code: int, payload: dict):
    if not idempotency_key:
        return
    try:
        existing = db.query(WorkoutIdempotencyRecord).filter(
            WorkoutIdempotencyRecord.user_id == user_id,
            WorkoutIdempotencyRecord.idempotency_key == idempotency_key
        ).first()
        if not existing:
            rec = WorkoutIdempotencyRecord(
                user_id=user_id,
                idempotency_key=idempotency_key,
                endpoint=endpoint,
                status_code=status_code,
                response_payload=to_json_safe(payload)
            )
            db.add(rec)
            db.commit()
    except Exception:
        db.rollback()

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

@router.get("/sessions", response_model=List[WorkoutSessionResponse])
def get_workout_sessions(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch completed workout session history for the current user.
    """
    sessions = db.query(WorkoutSession).filter(
        WorkoutSession.user_id == current_user.id,
        WorkoutSession.ended_at != None
    ).order_by(WorkoutSession.ended_at.desc()).offset(offset).limit(limit).all()
    return [format_session(s) for s in sessions]

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
        WorkoutSession.status == "active",
        WorkoutSession.ended_at == None
    ).first()
    if not session:
        return None
    return format_session(session)

@router.get("/sessions/{session_id}", response_model=WorkoutSessionResponse)
def get_session_by_id(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch a single workout session by ID, ensuring strict user ownership (IDOR defense).
    """
    session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Workout session not found")
    return format_session(session)

@router.post("/sessions/start", response_model=WorkoutSessionResponse, status_code=status.HTTP_201_CREATED)
def start_session(
    start_in: WorkoutSessionStart,
    x_idempotency_key: Optional[str] = Header(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Starts a new live workout session with idempotency and ownership verification.
    """
    idempotency_key = x_idempotency_key or start_in.idempotency_key
    cached = check_idempotency(db, current_user.id, idempotency_key)
    if cached:
        return cached

    # Check if there is an active session
    active = db.query(WorkoutSession).filter(
        WorkoutSession.user_id == current_user.id,
        WorkoutSession.status == "active",
        WorkoutSession.ended_at == None
    ).first()
    if active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An active session is already in progress. Please finish it first."
        )

    # Resolve template details if provided, enforcing ownership check
    template_id = start_in.template_id
    if template_id:
        template = db.query(WorkoutTemplate).filter(
            WorkoutTemplate.id == template_id,
            WorkoutTemplate.user_id == current_user.id
        ).first()
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

    new_session = WorkoutSession(
        user_id=current_user.id,
        template_id=template_id,
        name=start_in.name,
        started_at=datetime.utcnow(),
        status="active",
        version=1
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    res_data = format_session(new_session)
    record_idempotency(db, current_user.id, idempotency_key, "/workouts/sessions/start", 201, res_data)
    return res_data

@router.post("/sessions/log-set", response_model=WorkoutSetResponse, status_code=status.HTTP_201_CREATED)
def log_workout_set(
    set_in: WorkoutSetCreate,
    x_idempotency_key: Optional[str] = Header(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Append or overwrite a logged set inside the active workout session with idempotency protection.
    """
    idempotency_key = x_idempotency_key or set_in.idempotency_key
    cached = check_idempotency(db, current_user.id, idempotency_key)
    if cached:
        return cached

    session = db.query(WorkoutSession).filter(
        WorkoutSession.user_id == current_user.id,
        WorkoutSession.status == "active",
        WorkoutSession.ended_at == None
    ).first()
    if not session:
        raise HTTPException(status_code=400, detail="No active workout session found")

    # Verify exercise exists
    exercise = db.query(Exercise).filter(Exercise.id == set_in.exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")

    # If substitute exercise ID provided, verify it exists
    if set_in.substitute_exercise_id:
        sub_ex = db.query(Exercise).filter(Exercise.id == set_in.substitute_exercise_id).first()
        if not sub_ex:
            raise HTTPException(status_code=404, detail="Substitute exercise not found")

    new_set = WorkoutSet(
        session_id=session.id,
        exercise_id=set_in.exercise_id,
        set_number=set_in.set_number,
        reps=set_in.reps,
        weight=set_in.weight,
        rpe=set_in.rpe,
        rest_seconds=set_in.rest_seconds,
        is_skipped=set_in.is_skipped or False,
        notes=set_in.notes,
        substitute_exercise_id=set_in.substitute_exercise_id,
        version=1
    )
    db.add(new_set)
    session.version = (session.version or 1) + 1
    db.flush()

    # Sync session volume & check if this set breaks a personal record (if not skipped)
    sync_session_totals(db, session.id)
    is_pr = False
    if not set_in.is_skipped:
        is_pr = check_and_update_pr(db, current_user.id, new_set.id)
    db.refresh(new_set)

    sub_name = new_set.substitute_exercise.name if new_set.substitute_exercise else None
    res_data = {
        "id": new_set.id,
        "session_id": new_set.session_id,
        "exercise_id": new_set.exercise_id,
        "set_number": new_set.set_number,
        "reps": new_set.reps,
        "weight": new_set.weight,
        "rpe": new_set.rpe,
        "rest_seconds": new_set.rest_seconds,
        "is_pr": is_pr,
        "is_skipped": new_set.is_skipped,
        "notes": new_set.notes,
        "substitute_exercise_id": new_set.substitute_exercise_id,
        "substitute_exercise_name": sub_name,
        "version": new_set.version,
        "created_at": new_set.created_at,
        "exercise_name": exercise.name
    }
    record_idempotency(db, current_user.id, idempotency_key, "/workouts/sessions/log-set", 201, res_data)
    return res_data

@router.delete("/sessions/delete-set/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout_set(
    set_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes a completed set and synchronizes session total volume with ownership check.
    """
    w_set = db.query(WorkoutSet).join(WorkoutSession).filter(
        WorkoutSet.id == set_id,
        WorkoutSession.user_id == current_user.id,
        WorkoutSession.ended_at == None
    ).first()
    if not w_set:
        raise HTTPException(status_code=404, detail="Logged set not found in active session")

    session_id = w_set.session_id
    session = db.query(WorkoutSession).filter(WorkoutSession.id == session_id).first()
    if session:
        session.version = (session.version or 1) + 1

    db.delete(w_set)
    db.flush()

    sync_session_totals(db, session_id)
    db.commit()
    return None

@router.post("/sessions/finish", response_model=WorkoutSessionResponse)
def finish_session(
    finish_in: WorkoutSessionFinish,
    x_idempotency_key: Optional[str] = Header(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Complete the active workout session, compute duration, calories, and trigger streak increments.
    """
    idempotency_key = x_idempotency_key or finish_in.idempotency_key
    cached = check_idempotency(db, current_user.id, idempotency_key)
    if cached:
        return cached

    session = db.query(WorkoutSession).filter(
        WorkoutSession.user_id == current_user.id,
        WorkoutSession.status == "active",
        WorkoutSession.ended_at == None
    ).first()
    if not session:
        raise HTTPException(status_code=400, detail="No active workout session found")

    session.ended_at = datetime.utcnow()
    calc_duration = int((session.ended_at - session.started_at).total_seconds())
    session.duration_seconds = finish_in.duration_seconds if finish_in.duration_seconds is not None else calc_duration
    if finish_in.notes is not None:
        session.notes = finish_in.notes
    if finish_in.rating is not None:
        session.rating = finish_in.rating
    if finish_in.calories is not None:
        session.calories = finish_in.calories
    else:
        session.calories = round((session.duration_seconds or 0) * 0.12, 1)

    session.status = "completed"
    session.version = (session.version or 1) + 1

    # Compute final metrics and cache streak increment
    sync_session_totals(db, session.id)
    update_workout_streaks(db, current_user.id, session.ended_at.date())

    db.commit()
    db.refresh(session)
    res_data = format_session(session)
    record_idempotency(db, current_user.id, idempotency_key, "/workouts/sessions/finish", 200, res_data)
    return res_data

@router.post("/sessions/cancel", response_model=WorkoutSessionResponse)
@router.post("/sessions/{session_id}/cancel", response_model=WorkoutSessionResponse)
def cancel_session(
    session_id: Optional[uuid.UUID] = None,
    cancel_in: Optional[WorkoutSessionCancel] = None,
    x_idempotency_key: Optional[str] = Header(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel an active workout session safely without corrupting workout history or metrics.
    """
    idempotency_key = x_idempotency_key or (cancel_in.idempotency_key if cancel_in else None)
    cached = check_idempotency(db, current_user.id, idempotency_key)
    if cached:
        return cached

    if session_id:
        session = db.query(WorkoutSession).filter(
            WorkoutSession.id == session_id,
            WorkoutSession.user_id == current_user.id
        ).first()
    else:
        session = db.query(WorkoutSession).filter(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.status == "active",
            WorkoutSession.ended_at == None
        ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Active workout session not found")

    session.status = "cancelled"
    session.ended_at = datetime.utcnow()
    if cancel_in and cancel_in.reason:
        session.notes = f"{session.notes or ''} [Cancelled: {cancel_in.reason}]".strip()
    session.version = (session.version or 1) + 1

    db.commit()
    db.refresh(session)
    res_data = format_session(session)
    record_idempotency(db, current_user.id, idempotency_key, "/workouts/sessions/cancel", 200, res_data)
    return res_data

@router.put("/sessions/{session_id}", response_model=WorkoutSessionResponse)
def update_session(
    session_id: uuid.UUID,
    update_in: WorkoutSessionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update session metadata (notes, rating, calories, status) with optimistic concurrency validation.
    """
    session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Workout session not found")

    # Optimistic locking check: if client sent an older version
    if update_in.version is not None and update_in.version < session.version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Conflict: Session has been modified (server version: {session.version}, client version: {update_in.version}). Please reload."
        )

    if update_in.name is not None:
        session.name = update_in.name
    if update_in.notes is not None:
        session.notes = update_in.notes
    if update_in.rating is not None:
        session.rating = update_in.rating
    if update_in.calories is not None:
        session.calories = update_in.calories
    if update_in.duration_seconds is not None:
        session.duration_seconds = update_in.duration_seconds
    if update_in.status is not None:
        session.status = update_in.status

    session.version = (session.version or 1) + 1
    db.commit()
    db.refresh(session)
    return format_session(session)

@router.post("/sessions/substitute-exercise", response_model=WorkoutSessionResponse)
def substitute_exercise(
    sub_in: ExerciseSubstitutionRequest,
    x_idempotency_key: Optional[str] = Header(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Substitute an exercise in the active workout session and record the substitution.
    """
    idempotency_key = x_idempotency_key or sub_in.idempotency_key
    cached = check_idempotency(db, current_user.id, idempotency_key)
    if cached:
        return cached

    session = db.query(WorkoutSession).filter(
        WorkoutSession.user_id == current_user.id,
        WorkoutSession.status == "active",
        WorkoutSession.ended_at == None
    ).first()
    if not session:
        raise HTTPException(status_code=400, detail="No active workout session found")

    orig_ex = db.query(Exercise).filter(Exercise.id == sub_in.original_exercise_id).first()
    if not orig_ex:
        raise HTTPException(status_code=404, detail="Original exercise not found")

    sub_ex = db.query(Exercise).filter(Exercise.id == sub_in.substitute_exercise_id).first()
    if not sub_ex:
        raise HTTPException(status_code=404, detail="Substitute exercise not found")

    # Update uncompleted/future sets of original exercise in this session
    session.version = (session.version or 1) + 1
    for st in session.sets:
        if st.exercise_id == sub_in.original_exercise_id and not st.is_pr:
            st.substitute_exercise_id = sub_in.substitute_exercise_id
            if sub_in.reason:
                st.notes = f"{st.notes or ''} [Substituted: {sub_in.reason}]".strip()

    db.commit()
    db.refresh(session)
    res_data = format_session(session)
    record_idempotency(db, current_user.id, idempotency_key, "/workouts/sessions/substitute-exercise", 200, res_data)
    return res_data
