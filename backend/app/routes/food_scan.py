import os
import uuid
import logging
from datetime import datetime, date, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.models import User, FoodRecognitionLog, Food
from app.schemas import (
    FoodRecognitionResponse,
    FoodScanStatsResponse,
)
from app.auth import get_current_user
from app.services.storage import StorageProvider, LocalStorageProvider
from app.config import settings
from app.services.vision import (
    VisionProvider,
    HeuristicVisionProvider,
    GeminiVisionProvider,
    calculate_sha256,
    compress_image_if_large,
    process_food_recognition_job,
)

# Logger setup
logger = logging.getLogger("fitnova.food_scan")
logging.basicConfig(level=logging.INFO)

router = APIRouter(prefix="/ai/food-scan", tags=["AI Food Scanner"])

# Dependency Injectors for Providers
def get_vision_provider() -> VisionProvider:
    if settings.GEMINI_API_KEY:
        return GeminiVisionProvider()
    return HeuristicVisionProvider()

def get_storage_provider() -> StorageProvider:
    return LocalStorageProvider()


@router.post("", response_model=FoodRecognitionResponse, status_code=status.HTTP_201_CREATED)
def upload_scan(
    file: UploadFile = File(...),
    force_reanalyze: bool = False,
    current_user: User = Depends(get_current_user),
    vision_provider: VisionProvider = Depends(get_vision_provider),
    storage_provider: StorageProvider = Depends(get_storage_provider),
    db: Session = Depends(get_db)
):
    """
    Upload a food image, perform validation, rate limit check, hash check,
    compress if needed, and recognize nutrients synchronously.
    """
    logger.info("AUDIT: Upload received")
    # 1. API Rate Limiting Check (Max 30 scans per user per hour)
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    hourly_scans = db.query(FoodRecognitionLog).filter(
        FoodRecognitionLog.user_id == current_user.id,
        FoodRecognitionLog.created_at >= one_hour_ago
    ).count()
    if hourly_scans >= 30:
        logger.warning(f"AUDIT: Rate limit exceeded for user {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Maximum 30 scans per hour."
        )

    # 2. Basic file type and empty upload validation
    ext = os.path.splitext(file.filename)[1].lower().lstrip(".")
    if ext not in ["jpg", "jpeg", "png", "webp"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported format. Accepted: jpg, jpeg, png, webp."
        )

    try:
        file_bytes = file.file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read upload stream."
        )

    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Upload is empty."
        )

    # 3. Maximum file size validation (10MB)
    max_size_bytes = 10 * 1024 * 1024 # 10MB
    if len(file_bytes) > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds maximum allowed size of 10MB."
        )

    # 4. Hash-based Deduplication
    image_hash = calculate_sha256(file_bytes)
    existing_scan = None
    if not force_reanalyze:
        existing_scan = db.query(FoodRecognitionLog).filter(
            FoodRecognitionLog.user_id == current_user.id,
            FoodRecognitionLog.image_hash == image_hash,
            FoodRecognitionLog.status == "completed"
        ).first()

    if existing_scan:
        # Reuse previous recognition results directly to prevent re-upload and re-computation
        new_log = FoodRecognitionLog(
            user_id=current_user.id,
            image_filename=existing_scan.image_filename,
            image_hash=image_hash,
            status="completed",
            processing_time_ms=5.0, # minimal overhead time
            food_name=existing_scan.food_name,
            calories=existing_scan.calories,
            protein=existing_scan.protein,
            carbohydrates=existing_scan.carbohydrates,
            fat=existing_scan.fat,
            confidence_score=existing_scan.confidence_score,
            provider=existing_scan.provider,
            food_id=existing_scan.food_id,
            
            # Phase F-3.5 Fields
            meal_name=existing_scan.meal_name,
            detected_items=existing_scan.detected_items,
            confidence_per_item=existing_scan.confidence_per_item,
            serving_size_estimation=existing_scan.serving_size_estimation,
            estimated_weight_g=existing_scan.estimated_weight_g,
            health_score=existing_scan.health_score,
            nutrition_confidence=existing_scan.nutrition_confidence,
            goal_alignment=existing_scan.goal_alignment,
            recommendation=existing_scan.recommendation,
            healthier_alternative=existing_scan.healthier_alternative,
            annotations=existing_scan.annotations
        )
        db.add(new_log)
        db.commit()
        db.refresh(new_log)
        logger.info(f"AUDIT: Reused scan for user {current_user.id} using hash duplicate")
        return new_log

    # 5. PIL image validation & 5MB-10MB Compression
    try:
        final_bytes, compressed = compress_image_if_large(file_bytes, max_allowed_mb=5.0)
        logger.info("AUDIT: Image validated")
    except Exception as e:
        # Corrupted images will raise errors inside compress_image_if_large
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image validation/compression failed: {str(e)}"
        )

    # 6. Save image using swappable StorageProvider
    # Structured by date folder: YYYY/MM
    now = datetime.utcnow()
    subfolder = f"uploads/{now.strftime('%Y')}/{now.strftime('%m')}"
    
    saved_path = None
    try:
        saved_path = storage_provider.save_file(final_bytes, file.filename, subfolder)
    except Exception as e:
        logger.error(f"Storage failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save image file to storage."
        )

    # 7. Initialize Database Record (Transaction-safe)
    new_log = FoodRecognitionLog(
        user_id=current_user.id,
        image_filename=saved_path,
        image_hash=image_hash,
        status="pending"
    )
    
    try:
        db.add(new_log)
        db.commit()
        db.refresh(new_log)
    except Exception as db_err:
        db.rollback()
        # Rollback storage
        storage_provider.delete_file(saved_path)
        logger.error(f"Database save failed, rolled back storage file: {db_err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database save failed. Upload was rolled back."
        )

    # 8. Run Synchronous processing boundary (Worker-ready)
    try:
        process_food_recognition_job(db, new_log.id, vision_provider, saved_path, file.filename)
        db.refresh(new_log)
    except Exception as proc_err:
        logger.error(f"Image processing job failed: {proc_err}")
        # Mark as failed in DB, but the file is kept for logs unless explicitly deleted
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Vision recognition processing failed."
        )

    logger.info(f"AUDIT: Food recognition completed for scan {new_log.id} by user {current_user.id}")
    return new_log


@router.get("/history", response_model=List[FoodRecognitionResponse])
def get_scan_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves chronological scan history for the logged-in user."""
    return db.query(FoodRecognitionLog).filter(
        FoodRecognitionLog.user_id == current_user.id
    ).order_by(desc(FoodRecognitionLog.created_at)).all()


@router.get("/stats", response_model=FoodScanStatsResponse)
def get_scan_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves scanner usage statistics for the logged-in user."""
    scans = db.query(FoodRecognitionLog).filter(
        FoodRecognitionLog.user_id == current_user.id,
        FoodRecognitionLog.status == "completed"
    ).all()

    total_scans = len(scans)
    
    # Weekly scans (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    weekly_scans = db.query(FoodRecognitionLog).filter(
        FoodRecognitionLog.user_id == current_user.id,
        FoodRecognitionLog.status == "completed",
        FoodRecognitionLog.created_at >= seven_days_ago
    ).count()

    # Total calories scanned
    total_calories = sum(s.calories or 0.0 for s in scans)

    # Most scanned food (Mode)
    most_scanned = None
    if scans:
        mode_query = db.query(
            FoodRecognitionLog.food_name,
            func.count(FoodRecognitionLog.id).label("cnt")
        ).filter(
            FoodRecognitionLog.user_id == current_user.id,
            FoodRecognitionLog.status == "completed",
            FoodRecognitionLog.food_name != "Unknown Meal"
        ).group_by(
            FoodRecognitionLog.food_name
        ).order_by(
            desc("cnt")
        ).first()
        
        if mode_query:
            most_scanned = mode_query[0]

    return FoodScanStatsResponse(
        total_scans=total_scans,
        weekly_scans=weekly_scans,
        most_scanned_food=most_scanned,
        total_calories_scanned=total_calories
    )


@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scan(
    log_id: str,
    current_user: User = Depends(get_current_user),
    storage_provider: StorageProvider = Depends(get_storage_provider),
    db: Session = Depends(get_db)
):
    """Deletes a food recognition log, removing DB record, cached hash, and physical file."""
    try:
        scan_uuid = uuid.UUID(log_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid log ID format")

    scan = db.query(FoodRecognitionLog).filter(
        FoodRecognitionLog.id == scan_uuid,
        FoodRecognitionLog.user_id == current_user.id
    ).first()

    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan record not found."
        )

    # Remove physical file from disk
    if scan.image_filename:
        # Check if other logs share the same image (due to deduplication reuse)
        shared_logs = db.query(FoodRecognitionLog).filter(
            FoodRecognitionLog.image_filename == scan.image_filename,
            FoodRecognitionLog.id != scan.id
        ).count()
        
        # Only delete physical file if no other logs reference it
        if shared_logs == 0:
            storage_provider.delete_file(scan.image_filename)

    db.delete(scan)
    db.commit()
    logger.info(f"AUDIT: Scan history item {log_id} deleted by user {current_user.id}")
    return None


@router.get("/health")
def get_health_metrics(
    current_user: User = Depends(get_current_user),
    storage_provider: StorageProvider = Depends(get_storage_provider),
    db: Session = Depends(get_db)
):
    """Retrieves health metrics and stats telemetry for the Food AI module."""
    # Compute stats across the whole platform or just current user?
    # Requirement: "health monitoring metrics for Food AI. Track: Total requests, Failed requests, Average processing time, Average confidence, Storage usage"
    # These are platform-wide/system metrics, but protected (e.g. any authenticated user can view, or restrict if necessary, but query for all logs is standard for health health checks)
    total_requests = db.query(FoodRecognitionLog).count()
    failed_requests = db.query(FoodRecognitionLog).filter(FoodRecognitionLog.status == "failed").count()
    
    avg_proc_time = db.query(func.avg(FoodRecognitionLog.processing_time_ms)).filter(
        FoodRecognitionLog.status == "completed"
    ).scalar() or 0.0

    avg_confidence = db.query(func.avg(FoodRecognitionLog.confidence_score)).filter(
        FoodRecognitionLog.status == "completed"
    ).scalar() or 0.0

    # Calculate storage size
    total_storage_bytes = 0
    if isinstance(storage_provider, LocalStorageProvider):
        # Scan self.base_dir recursively
        if os.path.exists(storage_provider.base_dir):
            for root, dirs, files in os.walk(storage_provider.base_dir):
                for f in files:
                    fp = os.path.join(root, f)
                    try:
                        total_storage_bytes += os.path.getsize(fp)
                    except OSError:
                        pass

    return {
        "total_requests": total_requests,
        "failed_requests": failed_requests,
        "average_processing_time_ms": round(avg_proc_time, 2),
        "average_confidence": round(avg_confidence, 2),
        "storage_usage_bytes": total_storage_bytes,
        "storage_usage_mb": round(total_storage_bytes / (1024 * 1024), 2)
    }
