import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, and_, case
from typing import List, Optional

from app.database import get_db
from app.models import User, Food
from app.schemas import FoodCreate, FoodResponse, FoodSearchResponse
from app.auth import get_current_user

router = APIRouter(prefix="/foods", tags=["Foods"])

def build_food_query(
    db: Session,
    user_id: uuid.UUID,
    query: Optional[str] = None,
    barcode: Optional[str] = None,
    category: Optional[str] = None,
    cuisine: Optional[str] = None,
    is_vegetarian: Optional[bool] = None,
    is_vegan: Optional[bool] = None
):
    base_query = db.query(Food).filter(
        or_(
            Food.is_custom == False,
            Food.created_by == user_id
        )
    )

    if barcode:
        base_query = base_query.filter(Food.barcode == barcode.strip())
        return base_query

    if query:
        q_cleaned = query.strip()
        # Search by exact or partial match across name, common_name, or aliases
        terms = [t for t in q_cleaned.split() if len(t) >= 2]
        if len(terms) > 1:
            # Match each term in either name, common_name, or aliases
            term_filters = []
            for term in terms:
                term_filters.append(
                    or_(
                        Food.name.ilike(f"%{term}%"),
                        Food.common_name.ilike(f"%{term}%"),
                        Food.aliases.ilike(f"%{term}%")
                    )
                )
            base_query = base_query.filter(
                or_(
                    Food.name.ilike(f"%{q_cleaned}%"),
                    Food.common_name.ilike(f"%{q_cleaned}%"),
                    Food.aliases.ilike(f"%{q_cleaned}%"),
                    and_(*term_filters)
                )
            )
        else:
            base_query = base_query.filter(
                or_(
                    Food.name.ilike(f"%{q_cleaned}%"),
                    Food.common_name.ilike(f"%{q_cleaned}%"),
                    Food.aliases.ilike(f"%{q_cleaned}%")
                )
            )

    if category and category.strip().lower() != "all":
        base_query = base_query.filter(Food.category.ilike(category.strip()))

    if cuisine and cuisine.strip().lower() != "all":
        base_query = base_query.filter(Food.cuisine.ilike(cuisine.strip()))

    if is_vegetarian is not None:
        base_query = base_query.filter(Food.is_vegetarian == is_vegetarian)

    if is_vegan is not None:
        base_query = base_query.filter(Food.is_vegan == is_vegan)

    if query:
        q_cleaned = query.strip()
        order_case = case(
            (Food.name.ilike(q_cleaned), 1),
            (Food.name.ilike(f"{q_cleaned}%"), 2),
            (Food.name.ilike(f"%{q_cleaned}%"), 3),
            (Food.common_name.ilike(f"%{q_cleaned}%"), 4),
            else_=5
        )
        base_query = base_query.order_by(order_case, func.length(Food.name).asc(), Food.name.asc())
    else:
        base_query = base_query.order_by(Food.name.asc())

    return base_query


@router.get("", response_model=List[FoodResponse])
def get_foods(
    query: Optional[str] = Query(None, min_length=1),
    barcode: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    cuisine: Optional[str] = Query(None),
    is_vegetarian: Optional[bool] = Query(None),
    is_vegan: Optional[bool] = Query(None),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search and list foods in the catalog.
    Supports full-text query, barcode lookup, category & cuisine filters, and pagination.
    Maintains 100% backward compatibility with existing clients.
    """
    q = build_food_query(
        db, current_user.id,
        query=query, barcode=barcode,
        category=category, cuisine=cuisine,
        is_vegetarian=is_vegetarian, is_vegan=is_vegan
    )
    return q.order_by(Food.name.asc()).offset(offset).limit(limit).all()


@router.get("/search", response_model=FoodSearchResponse)
def search_foods_paginated(
    query: Optional[str] = Query(None, min_length=1),
    barcode: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    cuisine: Optional[str] = Query(None),
    is_vegetarian: Optional[bool] = Query(None),
    is_vegan: Optional[bool] = Query(None),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Paginated search endpoint returning total count, items, and pagination controls.
    """
    q = build_food_query(
        db, current_user.id,
        query=query, barcode=barcode,
        category=category, cuisine=cuisine,
        is_vegetarian=is_vegetarian, is_vegan=is_vegan
    )
    total = q.count()
    items = q.order_by(Food.name.asc()).offset(offset).limit(limit).all()
    has_more = (offset + limit) < total

    return FoodSearchResponse(
        total=total,
        items=items,
        limit=limit,
        offset=offset,
        has_more=has_more
    )


@router.get("/categories", response_model=List[str])
def get_food_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns a distinct list of non-null food categories present in the catalog.
    """
    cats = db.query(Food.category).filter(
        Food.category.isnot(None),
        or_(Food.is_custom == False, Food.created_by == current_user.id)
    ).distinct().order_by(Food.category.asc()).all()
    return [c[0] for c in cats if c[0]]


@router.get("/cuisines", response_model=List[str])
def get_food_cuisines(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns a distinct list of non-null food cuisines present in the catalog.
    """
    cuis = db.query(Food.cuisine).filter(
        Food.cuisine.isnot(None),
        or_(Food.is_custom == False, Food.created_by == current_user.id)
    ).distinct().order_by(Food.cuisine.asc()).all()
    return [c[0] for c in cuis if c[0]]


@router.get("/{food_id}", response_model=FoodResponse)
def get_food_by_id(
    food_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves a single food record by its UUID.
    """
    food = db.query(Food).filter(
        Food.food_id == food_id,
        or_(Food.is_custom == False, Food.created_by == current_user.id)
    ).first()

    if not food:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Food item not found"
        )
    return food


@router.post("", response_model=FoodResponse, status_code=status.HTTP_201_CREATED)
def create_custom_food(
    food_in: FoodCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a custom user-defined food item with expanded nutritional fields.
    """
    new_food = Food(
        name=food_in.name.strip(),
        common_name=food_in.common_name.strip() if food_in.common_name else None,
        aliases=food_in.aliases.strip() if food_in.aliases else None,
        brand=food_in.brand.strip() if food_in.brand else None,
        barcode=food_in.barcode.strip() if food_in.barcode else None,
        category=food_in.category.strip() if food_in.category else "Custom",
        cuisine=food_in.cuisine.strip() if food_in.cuisine else "General",
        country_or_region=food_in.country_or_region.strip() if food_in.country_or_region else None,
        serving_size=food_in.serving_size,
        serving_unit=food_in.serving_unit,
        calories=food_in.calories,
        protein=food_in.protein,
        carbohydrates=food_in.carbohydrates,
        fat=food_in.fat,
        fiber=food_in.fiber,
        sugar=food_in.sugar,
        sodium=food_in.sodium,
        saturated_fat=food_in.saturated_fat,
        cholesterol=food_in.cholesterol,
        micronutrients=food_in.micronutrients,
        ingredients=food_in.ingredients,
        preparation_method=food_in.preparation_method,
        is_vegetarian=food_in.is_vegetarian,
        is_vegan=food_in.is_vegan,
        food_type=food_in.food_type or "cooked",
        source="user_created",
        source_id=food_in.source_id,
        confidence_score=food_in.confidence_score,
        is_custom=True,
        created_by=current_user.id
    )
    db.add(new_food)
    db.commit()
    db.refresh(new_food)
    return new_food
