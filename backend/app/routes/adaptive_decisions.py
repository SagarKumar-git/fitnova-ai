import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, AdaptiveDecision, AdaptivePreference, SafetyEvent
from app.schemas import (
    AdaptiveDecisionCreate, AdaptiveDecisionResponse, AdaptiveDecisionUpdate,
    AdaptivePreferenceUpdate, AdaptivePreferenceResponse,
    SafetyEventCreate, SafetyEventResponse
)
from app.auth import get_current_user

router = APIRouter(prefix="/workouts/adaptive", tags=["Adaptive Training"])

# ==========================================
# ADAPTIVE DECISIONS
# ==========================================

@router.get("/decisions", response_model=List[AdaptiveDecisionResponse])
def get_adaptive_decisions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    decisions = db.query(AdaptiveDecision).filter(AdaptiveDecision.user_id == current_user.id).order_by(AdaptiveDecision.created_at.desc()).all()
    return decisions

@router.post("/decisions", response_model=AdaptiveDecisionResponse, status_code=status.HTTP_201_CREATED)
def create_adaptive_decision(
    decision_in: AdaptiveDecisionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_decision = AdaptiveDecision(
        user_id=current_user.id,
        session_id=decision_in.session_id,
        decision_type=decision_in.decision_type,
        original_plan=decision_in.original_plan,
        adaptive_plan=decision_in.adaptive_plan,
        reasons=decision_in.reasons,
        supporting_signals=decision_in.supporting_signals,
        confidence=decision_in.confidence,
        safety_limits_applied=decision_in.safety_limits_applied,
        user_action=decision_in.user_action,
        resulting_outcome=decision_in.resulting_outcome
    )
    db.add(new_decision)
    db.commit()
    db.refresh(new_decision)
    return new_decision

@router.get("/decisions/{decision_id}", response_model=AdaptiveDecisionResponse)
def get_adaptive_decision(
    decision_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    decision = db.query(AdaptiveDecision).filter(
        AdaptiveDecision.id == decision_id,
        AdaptiveDecision.user_id == current_user.id
    ).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    return decision

@router.patch("/decisions/{decision_id}", response_model=AdaptiveDecisionResponse)
@router.put("/decisions/{decision_id}", response_model=AdaptiveDecisionResponse)
def update_adaptive_decision(
    decision_id: uuid.UUID,
    update_in: AdaptiveDecisionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    decision = db.query(AdaptiveDecision).filter(
        AdaptiveDecision.id == decision_id,
        AdaptiveDecision.user_id == current_user.id
    ).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    if update_in.user_action is not None:
        decision.user_action = update_in.user_action
    if update_in.resulting_outcome is not None:
        decision.resulting_outcome = update_in.resulting_outcome
        
    db.commit()
    db.refresh(decision)
    return decision

# ==========================================
# SAFETY EVENTS
# ==========================================

@router.post("/safety-events", response_model=SafetyEventResponse, status_code=status.HTTP_201_CREATED)
def create_safety_event(
    event_in: SafetyEventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Idempotency check: prevent duplicate entries for identical event submissions
    existing_event = db.query(SafetyEvent).filter(
        SafetyEvent.user_id == current_user.id,
        SafetyEvent.session_id == event_in.session_id,
        SafetyEvent.event_type == event_in.event_type,
        SafetyEvent.client_timestamp == event_in.client_timestamp
    ).first()
    if existing_event:
        return existing_event

    new_event = SafetyEvent(
        user_id=current_user.id,
        session_id=event_in.session_id,
        event_type=event_in.event_type,
        safety_state=event_in.safety_state,
        intervention=event_in.intervention,
        confidence=event_in.confidence,
        freshness=event_in.freshness,
        provider=event_in.provider,
        client_timestamp=event_in.client_timestamp
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event

# ==========================================
# ADAPTIVE PREFERENCES
# ==========================================

@router.get("/preferences", response_model=AdaptivePreferenceResponse)
def get_adaptive_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    prefs = db.query(AdaptivePreference).filter(AdaptivePreference.user_id == current_user.id).first()
    if not prefs:
        prefs = AdaptivePreference(user_id=current_user.id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return prefs

@router.patch("/preferences", response_model=AdaptivePreferenceResponse)
def update_adaptive_preferences(
    update_in: AdaptivePreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    prefs = db.query(AdaptivePreference).filter(AdaptivePreference.user_id == current_user.id).first()
    if not prefs:
        prefs = AdaptivePreference(user_id=current_user.id)
        db.add(prefs)
    
    update_data = update_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(prefs, key, value)

    db.commit()
    db.refresh(prefs)
    return prefs
