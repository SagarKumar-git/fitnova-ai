import os
import time
import uuid
import hashlib
from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple
from PIL import Image, UnidentifiedImageError
from io import BytesIO
from sqlalchemy.orm import Session
from app.models import FoodRecognitionLog, Food
from sqlalchemy import or_

class VisionProvider(ABC):
    @abstractmethod
    def parse_image(self, file_path: str, filename: str) -> Dict[str, Any]:
        """Analyzes a food image and returns nutritional estimations."""
        pass

class HeuristicVisionProvider(VisionProvider):
    # Standard 15 foods with macro nutrition profiles per serving (typically 100g or 1 piece)
    FOOD_DATABASE = {
        "rice": {"food_name": "White Rice Cooked", "calories": 195.0, "protein": 4.0, "carbohydrates": 42.0, "fat": 0.5, "confidence_score": 0.85},
        "chicken": {"food_name": "Chicken Breast Cooked", "calories": 165.0, "protein": 31.0, "carbohydrates": 0.0, "fat": 3.6, "confidence_score": 0.90},
        "egg": {"food_name": "Whole Egg", "calories": 70.0, "protein": 6.0, "carbohydrates": 0.6, "fat": 5.0, "confidence_score": 0.88},
        "apple": {"food_name": "Apple", "calories": 95.0, "protein": 0.5, "carbohydrates": 25.0, "fat": 0.3, "confidence_score": 0.85},
        "banana": {"food_name": "Banana", "calories": 105.0, "protein": 1.3, "carbohydrates": 27.0, "fat": 0.3, "confidence_score": 0.87},
        "salad": {"food_name": "Salad", "calories": 45.0, "protein": 1.5, "carbohydrates": 9.0, "fat": 0.2, "confidence_score": 0.80},
        "roti": {"food_name": "Roti", "calories": 120.0, "protein": 3.5, "carbohydrates": 22.0, "fat": 0.5, "confidence_score": 0.82},
        "dal": {"food_name": "Dal cooked", "calories": 150.0, "protein": 8.0, "carbohydrates": 24.0, "fat": 2.5, "confidence_score": 0.84},
        "paneer": {"food_name": "Paneer Tikka", "calories": 280.0, "protein": 18.0, "carbohydrates": 6.0, "fat": 20.0, "confidence_score": 0.86},
        "milk": {"food_name": "Cow Milk", "calories": 150.0, "protein": 8.0, "carbohydrates": 12.0, "fat": 8.0, "confidence_score": 0.85},
        "oats": {"food_name": "Oats cooked", "calories": 150.0, "protein": 5.0, "carbohydrates": 27.0, "fat": 2.5, "confidence_score": 0.83},
        "fish": {"food_name": "Fish Cooked", "calories": 120.0, "protein": 20.0, "carbohydrates": 0.0, "fat": 4.5, "confidence_score": 0.88},
        "idli": {"food_name": "Idli", "calories": 120.0, "protein": 3.0, "carbohydrates": 26.0, "fat": 0.5, "confidence_score": 0.81},
        "dosa": {"food_name": "Dosa Plain", "calories": 150.0, "protein": 3.0, "carbohydrates": 28.0, "fat": 3.0, "confidence_score": 0.83},
        "biryani": {"food_name": "Chicken Biryani", "calories": 350.0, "protein": 15.0, "carbohydrates": 45.0, "fat": 12.0, "confidence_score": 0.89}
    }

    def parse_image(self, file_path: str, filename: str) -> Dict[str, Any]:
        # Perform keyword matching based on the filename/path
        search_target = (filename + " " + os.path.basename(file_path)).lower()
        
        for key, info in self.FOOD_DATABASE.items():
            if key in search_target:
                # Return a copy to avoid mutating base database
                return info.copy()
                
        # Unknown meal fallback
        return {
            "food_name": "Unknown Meal",
            "calories": 0.0,
            "protein": 0.0,
            "carbohydrates": 0.0,
            "fat": 0.0,
            "confidence_score": 0.30
        }

def calculate_sha256(file_bytes: bytes) -> str:
    """Calculates SHA256 hash of image bytes."""
    return hashlib.sha256(file_bytes).hexdigest()

def compress_image_if_large(file_bytes: bytes, max_allowed_mb: float = 5.0) -> Tuple[bytes, bool]:
    """
    Validates the image and compresses it if it exceeds max_allowed_mb (default 5MB).
    Raises UnidentifiedImageError or OSError if the image is corrupted.
    """
    if not file_bytes:
        raise ValueError("Upload cannot be empty")

    # Open PIL image to validate it is a valid format
    try:
        img = Image.open(BytesIO(file_bytes))
        img.verify() # Verify image integrity
    except (UnidentifiedImageError, SyntaxError) as e:
        raise UnidentifiedImageError("Corrupted or unsupported image file") from e
    except Exception as e:
        raise OSError("Error parsing image file") from e

    # Re-open for actual processing (since verify() renders image unusable for further operations)
    img = Image.open(BytesIO(file_bytes))
    
    file_size_mb = len(file_bytes) / (1024 * 1024)
    if file_size_mb <= max_allowed_mb:
        return file_bytes, False

    # Compress the image
    out_io = BytesIO()
    # Save with reduced quality
    img_format = img.format if img.format in ["JPEG", "PNG", "WEBP"] else "JPEG"
    if img.mode in ["RGBA", "LA"] and img_format in ["JPEG"]:
        img = img.convert("RGB") # Remove alpha channel for JPEG saving
        
    try:
        img.save(out_io, format=img_format, quality=70, optimize=True)
        compressed_bytes = out_io.getvalue()
        
        # If still larger than 5MB, keep compressing aggressively
        if len(compressed_bytes) / (1024 * 1024) > max_allowed_mb:
            out_io = BytesIO()
            img.save(out_io, format=img_format, quality=40, optimize=True)
            compressed_bytes = out_io.getvalue()
            
        return compressed_bytes, True
    except Exception as e:
        raise RuntimeError("Compression failure") from e

def process_food_recognition_job(db: Session, log_id: uuid.UUID, provider: VisionProvider, file_path: str, filename: str) -> None:
    """
    Synchronous processing boundary that simulates a background worker.
    Updates database log status to 'processing', performs estimation,
    queries food database to link corresponding food items, and saves final values.
    """
    start_time = time.time()
    
    log = db.query(FoodRecognitionLog).filter(FoodRecognitionLog.id == log_id).first()
    if not log:
        return

    log.status = "processing"
    db.commit()

    try:
        # Run recognition provider
        result = provider.parse_image(file_path, filename)
        
        # Determine food_id: reuse existing food if a similar name exists
        food_name = result["food_name"]
        
        existing_food = db.query(Food).filter(
            Food.name.ilike(food_name.strip()),
            or_(Food.is_custom == False, Food.created_by == log.user_id)
        ).first()
        
        food_id = None
        if existing_food:
            food_id = existing_food.food_id
        else:
            # If not found and it's not Unknown Meal, we can create a custom food item
            if food_name != "Unknown Meal":
                new_food = Food(
                    name=food_name,
                    serving_size=100.0,
                    serving_unit="g",
                    calories=result["calories"],
                    protein=result["protein"],
                    carbohydrates=result["carbohydrates"],
                    fat=result["fat"],
                    is_custom=True,
                    created_by=log.user_id
                )
                db.add(new_food)
                db.flush() # Populate new_food.food_id
                food_id = new_food.food_id

        # Update log details
        log.food_name = food_name
        log.calories = result["calories"]
        log.protein = result["protein"]
        log.carbohydrates = result["carbohydrates"]
        log.fat = result["fat"]
        log.confidence_score = result["confidence_score"]
        log.food_id = food_id
        log.status = "completed"
        log.processing_time_ms = (time.time() - start_time) * 1000.0
        db.commit()
    except Exception as e:
        db.rollback()
        # Mark as failed
        log = db.query(FoodRecognitionLog).filter(FoodRecognitionLog.id == log_id).first()
        if log:
            log.status = "failed"
            log.processing_time_ms = (time.time() - start_time) * 1000.0
            db.commit()
        raise e
