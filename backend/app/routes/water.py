from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import date
from typing import List

from app.database import get_db
from app.models import User, WaterLog
from app.schemas import WaterLogCreate, WaterLogResponse
from app.auth import get_current_user
from app.services.nutrition_sync import sync_daily_nutrition

router = APIRouter(prefix="/logs/water", tags=["Water Logs"])

@router.get("", response_model=List[WaterLogResponse])
def get_water_logs(
    logged_date: date = Query(default_factory=date.today),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves all water logs for the current user on the specified date.
    """
    logs = db.query(WaterLog).filter(
        WaterLog.user_id == current_user.id,
        WaterLog.logged_date == logged_date
    ).all()
    return logs

@router.post("", response_model=WaterLogResponse, status_code=status.HTTP_201_CREATED)
def log_water(
    log_in: WaterLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Logs water intake (in ml) for the user on a specific date.
    Syncs daily nutrition summaries automatically.
    """
    new_log = WaterLog(
        user_id=current_user.id,
        amount_ml=log_in.amount_ml,
        logged_date=log_in.logged_date
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    # Sync daily summary
    sync_daily_nutrition(db, str(current_user.id), log_in.logged_date)

    return new_log

@router.delete("/{water_log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_water_log(
    water_log_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes a specific water log entry.
    Updates daily water summaries.
    """
    import uuid
    try:
        log_uuid = uuid.UUID(water_log_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid water log ID format"
        )

    log = db.query(WaterLog).filter(
        WaterLog.water_log_id == log_uuid,
        WaterLog.user_id == current_user.id
    ).first()

    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Water log entry not found"
        )

    logged_date = log.logged_date
    db.delete(log)
    db.commit()

    # Recalculate daily totals
    sync_daily_nutrition(db, str(current_user.id), logged_date)

    return None
export_router = router
