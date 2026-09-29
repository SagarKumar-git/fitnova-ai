"""
FitNova AI - Production Food Importer Service
Handles idempotent batch ingestion of verified food datasets into the database.
Prevents duplicate entries, enriches existing foods with regional metadata and aliases,
and logs structured import metrics.
"""

import json
import logging
import os
import re
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Food

logger = logging.getLogger("fitnova.food_importer")

def normalize_name(name: str) -> str:
    """Normalizes food name for collision detection: lowercase, strip punctuation and whitespace."""
    if not name:
        return ""
    return re.sub(r"[^a-z0-9]", "", name.lower())

def import_food_catalog(
    db: Optional[Session] = None,
    catalog_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Idempotently imports the master food catalog JSON into the database.
    Enriches existing records with aliases, cuisine, category, micronutrients if missing.
    Returns audit report dictionary.
    """
    close_db_on_exit = False
    if db is None:
        db = SessionLocal()
        close_db_on_exit = True

    if catalog_path is None:
        catalog_path = os.path.join(os.path.dirname(__file__), "..", "data", "food_catalog.json")

    report = {
        "discovered": 0,
        "valid": 0,
        "inserted": 0,
        "updated": 0,
        "skipped_duplicate": 0,
        "invalid": 0,
        "errors": []
    }

    try:
        if not os.path.exists(catalog_path):
            raise FileNotFoundError(f"Catalog file not found at: {catalog_path}")

        with open(catalog_path, "r", encoding="utf-8") as f:
            items = json.load(f)

        report["discovered"] = len(items)

        # 1. Preload existing foods into normalized memory lookup
        existing_foods = db.query(Food).all()
        existing_by_norm = {normalize_name(f.name): f for f in existing_foods if f.name}
        existing_by_barcode = {f.barcode: f for f in existing_foods if f.barcode}

        new_foods_to_insert = []

        for item in items:
            name = item.get("name")
            if not name:
                report["invalid"] += 1
                continue

            # Validate numerical values
            try:
                serving_size = float(item.get("serving_size", 100.0) or 100.0)
                calories = float(item.get("calories", 0.0) or 0.0)
                protein = float(item.get("protein", 0.0) or 0.0)
                carbs = float(item.get("carbohydrates", 0.0) or 0.0)
                fat = float(item.get("fat", 0.0) or 0.0)
            except (ValueError, TypeError) as val_err:
                report["invalid"] += 1
                report["errors"].append(f"Invalid nutrition values for '{name}': {val_err}")
                continue

            report["valid"] += 1
            norm = normalize_name(name)
            barcode = item.get("barcode")

            existing_record = None
            if barcode and barcode in existing_by_barcode:
                existing_record = existing_by_barcode[barcode]
            elif norm in existing_by_norm:
                existing_record = existing_by_norm[norm]

            if existing_record:
                # Check if we can enrich existing record with new metadata
                updated = False
                if not existing_record.aliases and item.get("aliases"):
                    existing_record.aliases = item["aliases"]
                    updated = True
                if not existing_record.common_name and item.get("common_name"):
                    existing_record.common_name = item["common_name"]
                    updated = True
                if not existing_record.cuisine and item.get("cuisine"):
                    existing_record.cuisine = item["cuisine"]
                    updated = True
                if not existing_record.category and item.get("category"):
                    existing_record.category = item["category"]
                    updated = True
                if not existing_record.country_or_region and item.get("country_or_region"):
                    existing_record.country_or_region = item["country_or_region"]
                    updated = True
                if not existing_record.source and item.get("source"):
                    existing_record.source = item["source"]
                    existing_record.source_id = item.get("source_id")
                    existing_record.confidence_score = float(item.get("confidence_score", 1.0) or 1.0)
                    updated = True

                if updated:
                    report["updated"] += 1
                else:
                    report["skipped_duplicate"] += 1
            else:
                # Create brand new Food record
                new_food = Food(
                    name=name,
                    common_name=item.get("common_name"),
                    aliases=item.get("aliases"),
                    brand=item.get("brand", "Standard"),
                    barcode=barcode,
                    category=item.get("category", "Main Course"),
                    cuisine=item.get("cuisine", "Global"),
                    country_or_region=item.get("country_or_region"),
                    serving_size=serving_size,
                    serving_unit=item.get("serving_unit", "g"),
                    calories=calories,
                    protein=protein,
                    carbohydrates=carbs,
                    fat=fat,
                    fiber=float(item.get("fiber", 0.0) or 0.0) if item.get("fiber") is not None else None,
                    sugar=float(item.get("sugar", 0.0) or 0.0) if item.get("sugar") is not None else None,
                    sodium=float(item.get("sodium", 0.0) or 0.0) if item.get("sodium") is not None else None,
                    saturated_fat=float(item.get("saturated_fat", 0.0) or 0.0) if item.get("saturated_fat") is not None else None,
                    cholesterol=float(item.get("cholesterol", 0.0) or 0.0) if item.get("cholesterol") is not None else None,
                    micronutrients=item.get("micronutrients"),
                    ingredients=item.get("ingredients"),
                    preparation_method=item.get("preparation_method"),
                    is_vegetarian=bool(item.get("is_vegetarian", True)),
                    is_vegan=bool(item.get("is_vegan", False)),
                    food_type=item.get("food_type", "cooked"),
                    source=item.get("source", "Standard"),
                    source_id=item.get("source_id"),
                    confidence_score=float(item.get("confidence_score", 1.0) or 1.0),
                    is_custom=False
                )
                new_foods_to_insert.append(new_food)
                existing_by_norm[norm] = new_food
                if barcode:
                    existing_by_barcode[barcode] = new_food
                report["inserted"] += 1

        if new_foods_to_insert:
            db.add_all(new_foods_to_insert)

        db.commit()
        logger.info(
            f"Catalog Import Complete: {report['inserted']} inserted, "
            f"{report['updated']} updated, {report['skipped_duplicate']} skipped duplicates."
        )
        return report

    except Exception as e:
        db.rollback()
        logger.error(f"Catalog Import Failed: {e}", exc_info=True)
        report["errors"].append(str(e))
        return report
    finally:
        if close_db_on_exit:
            db.close()

if __name__ == "__main__":
    import sys
    print("=" * 60)
    print("FitNova AI - Master Food Catalog Importer")
    print("=" * 60)
    res = import_food_catalog()
    print("\n--- IMPORT SUMMARY REPORT ---")
    print(f"Total Discovered:   {res['discovered']}")
    print(f"Validated Items:    {res['valid']}")
    print(f"New Inserted:       {res['inserted']}")
    print(f"Existing Enriched:  {res['updated']}")
    print(f"Duplicates Skipped: {res['skipped_duplicate']}")
    print(f"Invalid/Rejected:   {res['invalid']}")
    if res["errors"]:
        print(f"Errors ({len(res['errors'])}):")
        for err in res["errors"][:5]:
            print(f" - {err}")
    print("=" * 60)
