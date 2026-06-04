from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User, UserProfile, FitnessMetrics, WeightHistory
from app.schemas import ProfileCreate, ProfileResponse, WeightHistoryCreate, WeightHistoryResponse
from app.auth import get_current_user

router = APIRouter(prefix="/profile", tags=["User Profile"])

@router.get("", response_model=ProfileResponse)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Fetches the profile details of the authenticated user.
    Merges profile info with their latest fitness metrics log (weights, body fat, deadlines).
    """
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Please complete profile setup."
        )
    
    # Get the latest logged metrics for weight and target tracking
    latest_metrics = db.query(FitnessMetrics).filter(
        FitnessMetrics.user_id == current_user.id
    ).order_by(FitnessMetrics.created_at.desc()).first()
    
    return ProfileResponse(
        profile_id=profile.profile_id,
        user_id=profile.user_id,
        age=profile.age,
        gender=profile.gender,
        height=profile.height,
        weight=profile.weight,
        goal=profile.goal,
        experience_level=profile.experience_level,
        activity_level=profile.activity_level,
        workout_days_per_week=profile.workout_days_per_week,
        gym_access=profile.gym_access,
        created_at=profile.created_at,
        target_weight=latest_metrics.target_weight if latest_metrics else profile.weight,
        current_body_fat=latest_metrics.current_body_fat if latest_metrics else None,
        target_body_fat=latest_metrics.target_body_fat if latest_metrics else None,
        goal_deadline=latest_metrics.goal_deadline if latest_metrics else None
    )

@router.put("", response_model=ProfileResponse)
def update_profile(
    profile_in: ProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates or updates the profile details of the authenticated user.
    Also adds a new record in fitness_metrics to track weight change history over time.
    """
    profile = current_user.profile
    
    if not profile:
        # Create a new profile entry
        profile = UserProfile(
            user_id=current_user.id,
            age=profile_in.age,
            gender=profile_in.gender,
            height=profile_in.height,
            weight=profile_in.weight,
            goal=profile_in.goal,
            experience_level=profile_in.experience_level,
            activity_level=profile_in.activity_level,
            workout_days_per_week=profile_in.workout_days_per_week,
            gym_access=profile_in.gym_access
        )
        db.add(profile)
    else:
        # Update existing profile
        profile.age = profile_in.age
        profile.gender = profile_in.gender
        profile.height = profile_in.height
        profile.weight = profile_in.weight
        profile.goal = profile_in.goal
        profile.experience_level = profile_in.experience_level
        profile.activity_level = profile_in.activity_level
        profile.workout_days_per_week = profile_in.workout_days_per_week
        profile.gym_access = profile_in.gym_access
    
    # Store a new record of weight and body targets in the fitness metrics timeline
    fitness_metric = FitnessMetrics(
        user_id=current_user.id,
        current_weight=profile_in.weight,
        target_weight=profile_in.target_weight,
        current_body_fat=profile_in.current_body_fat,
        target_body_fat=profile_in.target_body_fat,
        goal_deadline=profile_in.goal_deadline
    )
    db.add(fitness_metric)
    
    # Store record in the dedicated weight history table
    weight_hist = WeightHistory(
        user_id=current_user.id,
        weight=profile_in.weight,
        source="profile_update"
    )
    db.add(weight_hist)
    
    db.commit()
    db.refresh(profile)
    
    return ProfileResponse(
        profile_id=profile.profile_id,
        user_id=profile.user_id,
        age=profile.age,
        gender=profile.gender,
        height=profile.height,
        weight=profile.weight,
        goal=profile.goal,
        experience_level=profile.experience_level,
        activity_level=profile.activity_level,
        workout_days_per_week=profile.workout_days_per_week,
        gym_access=profile.gym_access,
        created_at=profile.created_at,
        target_weight=fitness_metric.target_weight,
        current_body_fat=fitness_metric.current_body_fat,
        target_body_fat=fitness_metric.target_body_fat,
        goal_deadline=fitness_metric.goal_deadline
    )

@router.get("/weight-history", response_model=List[WeightHistoryResponse])
def get_weight_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves all weight history logs for the current user, sorted chronologically.
    """
    history = db.query(WeightHistory).filter(
        WeightHistory.user_id == current_user.id
    ).order_by(WeightHistory.recorded_at.asc()).all()
    return history

@router.post("/weight-history", response_model=WeightHistoryResponse, status_code=status.HTTP_201_CREATED)
def log_weight(
    weight_in: WeightHistoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually logs a new weight entry, updating the weight in the user's profile.
    """
    # 1. Update the weight on the main profile (if it exists)
    profile = current_user.profile
    if profile:
        profile.weight = weight_in.weight
        db.add(profile)

    # 2. Add weight history entry
    new_log = WeightHistory(
        user_id=current_user.id,
        weight=weight_in.weight,
        source=weight_in.source or "manual_entry"
    )
    if weight_in.recorded_at:
        new_log.recorded_at = weight_in.recorded_at
        
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log
