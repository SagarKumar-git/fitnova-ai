from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional

from app.database import get_db
from app.models import User, Food
from app.schemas import FoodCreate, FoodResponse
from app.auth import get_current_user

router = APIRouter(prefix="/foods", tags=["Foods"])

@router.get("", response_model=List[FoodResponse])
def search_foods(
    query: Optional[str] = Query(None, min_length=1),
    barcode: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search for foods in the database.
    Can search by text query or lookup by barcode.
    Returns global foods and the user's custom foods.
    """
    base_query = db.query(Food).filter(
        or_(
            Food.is_custom == False,
            Food.created_by == current_user.id
        )
    )

    if barcode:
        return base_query.filter(Food.barcode == barcode).all()

    if query:
        return base_query.filter(Food.name.ilike(f"%{query}%")).all()

    # Default to returning top seeded items if no query
    return base_query.limit(20).all()

@router.post("", response_model=FoodResponse, status_code=status.HTTP_201_CREATED)
def create_custom_food(
    food_in: FoodCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a custom user-defined food item.
    """
    new_food = Food(
        name=food_in.name,
        brand=food_in.brand,
        barcode=food_in.barcode,
        serving_size=food_in.serving_size,
        serving_unit=food_in.serving_unit,
        calories=food_in.calories,
        protein=food_in.protein,
        carbohydrates=food_in.carbohydrates,
        fat=food_in.fat,
        is_custom=True,
        created_by=current_user.id
    )
    db.add(new_food)
    db.commit()
    db.refresh(new_food)
    return new_food
