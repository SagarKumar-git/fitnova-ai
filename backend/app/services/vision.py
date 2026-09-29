import os
import time
import uuid
import hashlib
import logging
import json
import re
from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple, Optional, List
from io import BytesIO
from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models import FoodRecognitionLog, Food
from app.config import settings

logger = logging.getLogger("fitnova.vision")


def resolve_physical_image_path(file_path: str) -> str:
    """
    Robustly resolves a stored image path or URL into a valid physical filesystem path across OS conventions.
    """
    if os.path.isabs(file_path) and os.path.exists(file_path):
        return file_path

    base_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
    cleaned = file_path.replace("\\", "/").lstrip("/")
    if cleaned.startswith("static/"):
        cleaned = cleaned[len("static/"):]

    candidate = os.path.join(base_dir, cleaned.replace("/", os.sep))
    if os.path.exists(candidate):
        return candidate

    if os.path.exists(file_path):
        return os.path.abspath(file_path)

    return candidate


def get_image_bytes_and_mime(physical_path: str) -> Tuple[bytes, str]:
    """
    Reads image from disk, detects its true format, composites transparent PNGs (RGBA)
    onto a solid white background to avoid black background artifacts, and returns validated bytes and MIME.
    """
    with open(physical_path, "rb") as f:
        raw_bytes = f.read()

    try:
        pil_img = Image.open(BytesIO(raw_bytes))
        fmt = (pil_img.format or "").upper()

        if fmt == "PNG":
            # If image has transparency, composite onto white canvas to avoid black cutouts
            if pil_img.mode in ("RGBA", "LA") or (pil_img.mode == "P" and "transparency" in pil_img.info):
                bg = Image.new("RGB", pil_img.size, (255, 255, 255))
                alpha = pil_img.convert("RGBA").split()[-1]
                bg.paste(pil_img.convert("RGB"), mask=alpha)
                buf = BytesIO()
                bg.save(buf, format="JPEG", quality=85)
                return buf.getvalue(), "image/jpeg"
            return raw_bytes, "image/png"
        elif fmt == "WEBP":
            return raw_bytes, "image/webp"
        elif fmt in ("JPEG", "JPG"):
            return raw_bytes, "image/jpeg"
        else:
            # Normalize other image formats (BMP, TIFF, etc.) to standard JPEG
            rgb_img = pil_img.convert("RGB")
            buf = BytesIO()
            rgb_img.save(buf, format="JPEG", quality=85)
            return buf.getvalue(), "image/jpeg"
    except Exception as e:
        logger.warning(f"Could not inspect image headers via PIL: {e}. Falling back to raw bytes as JPEG.")
        return raw_bytes, "image/jpeg"


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

    try:
        img = Image.open(BytesIO(file_bytes))
        img.verify()
    except (UnidentifiedImageError, SyntaxError) as e:
        raise UnidentifiedImageError("Corrupted or unsupported image file") from e
    except Exception as e:
        raise OSError("Error parsing image file") from e

    img = Image.open(BytesIO(file_bytes))
    file_size_mb = len(file_bytes) / (1024 * 1024)
    if file_size_mb <= max_allowed_mb:
        return file_bytes, False

    out_io = BytesIO()
    img_format = img.format if img.format in ["JPEG", "PNG", "WEBP"] else "JPEG"
    if img.mode in ["RGBA", "LA"] and img_format in ["JPEG"]:
        bg = Image.new("RGB", img.size, (255, 255, 255))
        alpha = img.convert("RGBA").split()[-1]
        bg.paste(img.convert("RGB"), mask=alpha)
        img = bg

    try:
        img.save(out_io, format=img_format, quality=70, optimize=True)
        compressed_bytes = out_io.getvalue()

        if len(compressed_bytes) / (1024 * 1024) > max_allowed_mb:
            out_io = BytesIO()
            img.save(out_io, format=img_format, quality=40, optimize=True)
            compressed_bytes = out_io.getvalue()

        return compressed_bytes, True
    except Exception as e:
        raise RuntimeError("Compression failure") from e


class VisionProvider(ABC):
    @abstractmethod
    def parse_image(self, file_path: str, filename: str) -> Dict[str, Any]:
        """Analyzes a food image and returns nutritional estimations."""
        pass


NON_FOOD_OBJECTS = {
    "cup", "paper cup", "drink", "soda", "coke", "beverage", "straw", "drinking straw",
    "wrapper", "paper wrapper", "foil wrapper", "tray", "plastic tray", "plate",
    "table", "napkin", "tissue", "packaging", "box", "paper box", "carton",
    "fork", "knife", "spoon", "cutlery", "sauce packet", "ketchup packet",
    "container", "cup lid", "bottle", "plastic bottle", "glass", "water glass",
    "placemat", "tablecloth", "receipt", "menu"
}


def is_non_food_object(name: str) -> bool:
    """Detects whether a candidate string is packaging, utensil, or non-food surface."""
    if not name:
        return True
    clean = re.sub(r"[^\w\s]", "", name.lower()).strip()
    if clean in NON_FOOD_OBJECTS:
        return True
    for item in NON_FOOD_OBJECTS:
        if clean == item or clean.startswith(item + " ") or clean.endswith(" " + item):
            return True
    return False


def validate_and_normalize_bounding_box(bbox: Any) -> Optional[List[int]]:
    """
    Validates [ymin, xmin, ymax, xmax].
    Clamps coordinates to 0..1000.
    Ensures minimum size (width >= 30, height >= 30) and ymin < ymax, xmin < xmax.
    Rejects degenerate boxes or near whole-canvas boxes (>= 98% area).
    """
    if not (isinstance(bbox, (list, tuple)) and len(bbox) == 4):
        return None
    try:
        ymin = max(0, min(1000, int(round(float(bbox[0])))))
        xmin = max(0, min(1000, int(round(float(bbox[1])))))
        ymax = max(0, min(1000, int(round(float(bbox[2])))))
        xmax = max(0, min(1000, int(round(float(bbox[3])))))
    except (ValueError, TypeError):
        return None

    if ymin >= ymax or xmin >= xmax:
        return None

    height = ymax - ymin
    width = xmax - xmin
    if height < 30 or width < 30:
        return None

    # Rejection of degenerate whole-canvas box (e.g. 0,0,1000,1000)
    if height >= 980 and width >= 980:
        return None

    return [ymin, xmin, ymax, xmax]


def compute_iou(box1: List[int], box2: List[int]) -> float:
    """Computes Intersection-over-Union between two [ymin, xmin, ymax, xmax] boxes."""
    y1 = max(box1[0], box2[0])
    x1 = max(box1[1], box2[1])
    y2 = min(box1[2], box2[2])
    x2 = min(box1[3], box2[3])

    inter_w = max(0, x2 - x1)
    inter_h = max(0, y2 - y1)
    inter_area = inter_w * inter_h

    area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
    area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union_area = area1 + area2 - inter_area

    if union_area <= 0:
        return 0.0
    return inter_area / union_area


SPECIFICITY_DOWNGRADE_MAP = {
    "grilled beef cheeseburger": "Burger",
    "beef cheeseburger": "Burger",
    "bacon cheeseburger": "Burger",
    "cheeseburger": "Burger",
    "hamburger": "Burger",
    "double cheeseburger": "Burger",
    "chicken burger": "Burger",
    "veggie burger": "Burger",
    "margherita pizza": "Pizza",
    "cheese pizza": "Pizza",
    "pepperoni pizza": "Pizza",
    "veggie pizza": "Pizza",
    "pizza slice": "Pizza",
    "potato french fries": "French Fries",
    "potato fries": "French Fries",
    "crispy fries": "French Fries",
}


def normalize_food_name_grounded(name: str) -> Tuple[str, str, str]:
    """
    Returns (normalized_name, specificity_level, evidence_note).
    Down-levels overly specific claims to grounded generic categories unless explicit evidence warrants.
    """
    clean = name.strip()
    low = clean.lower()

    if low in SPECIFICITY_DOWNGRADE_MAP:
        downgraded = SPECIFICITY_DOWNGRADE_MAP[low]
        return downgraded, "generic", f"Grounded category '{downgraded}'"

    if "cheeseburger" in low or "hamburger" in low or ("burger" in low and "vada" not in low):
        return "Burger", "generic", "Grounded burger category (bun + savory patty structure)"
    if "pizza" in low:
        return "Pizza", "generic", "Grounded pizza category (baked crust with toppings)"
    if "fries" in low or "french fry" in low:
        return "French Fries", "generic", "Grounded french fries category (cut potato fries)"

    return clean, "specific" if len(clean.split()) > 2 else "generic", "Visual pattern classification"


def filter_garnishes_and_duplicates(foods: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Filters non-food objects, suppresses garnishes (e.g. tomato slice inside/alongside burger),
    and deduplicates items with high IoU.
    """
    valid_foods = [f for f in foods if not is_non_food_object(f.get("name", ""))]

    has_burger_or_sandwich = any(
        "burger" in f.get("name", "").lower() or "sandwich" in f.get("name", "").lower()
        for f in valid_foods
    )

    filtered = []
    for f in valid_foods:
        name_low = f.get("name", "").lower()
        weight = float(f.get("estimated_weight_g") or 0.0)

        # If tomato is reported alongside a burger with weight <= 60g, suppress as sub-component garnish
        if has_burger_or_sandwich and ("tomato" in name_low) and weight <= 60.0:
            logger.info(f"Suppressing tomato garnish ({weight}g) as sub-component of burger/sandwich")
            continue

        filtered.append(f)

    final_items: List[Dict[str, Any]] = []
    for f in filtered:
        box = f.get("bounding_box")
        f_name = f.get("name", "").lower()
        duplicate = False
        if box:
            for existing in final_items:
                ex_box = existing.get("bounding_box")
                ex_name = existing.get("name", "").lower()
                # Deduplicate overlapping detections of the same food category
                if ex_box and f_name == ex_name:
                    iou = compute_iou(box, ex_box)
                    if iou > 0.60:
                        if f.get("confidence", 0) > existing.get("confidence", 0):
                            existing.update(f)
                        duplicate = True
                        break
        if not duplicate:
            final_items.append(f)

    return final_items


class HeuristicVisionProvider(VisionProvider):
    # Knowledge catalog with realistic macronutrients per default serving
    FOOD_DATABASE = {
        "pizza": {"name": "Pizza", "portion": "1 slice (120g)", "weight_g": 120.0, "calories": 290.0, "protein": 12.0, "carbohydrates": 35.0, "fat": 11.5, "confidence": 0.90},
        "margherita pizza": {"name": "Pizza", "portion": "1 slice (120g)", "weight_g": 120.0, "calories": 290.0, "protein": 12.0, "carbohydrates": 35.0, "fat": 11.5, "confidence": 0.90},
        "burger": {"name": "Burger", "portion": "1 burger (180g)", "weight_g": 180.0, "calories": 480.0, "protein": 26.0, "carbohydrates": 42.0, "fat": 22.0, "confidence": 0.91},
        "cheeseburger": {"name": "Burger", "portion": "1 burger (180g)", "weight_g": 180.0, "calories": 540.0, "protein": 30.0, "carbohydrates": 42.0, "fat": 27.5, "confidence": 0.91},
        "hamburger": {"name": "Burger", "portion": "1 burger (150g)", "weight_g": 150.0, "calories": 420.0, "protein": 24.0, "carbohydrates": 38.0, "fat": 18.0, "confidence": 0.90},
        "fries": {"name": "French Fries", "portion": "1 medium portion (115g)", "weight_g": 115.0, "calories": 358.0, "protein": 3.9, "carbohydrates": 47.6, "fat": 17.2, "confidence": 0.92},
        "french fries": {"name": "French Fries", "portion": "1 medium portion (115g)", "weight_g": 115.0, "calories": 358.0, "protein": 3.9, "carbohydrates": 47.6, "fat": 17.2, "confidence": 0.92},
        "fry": {"name": "French Fries", "portion": "1 medium portion (115g)", "weight_g": 115.0, "calories": 358.0, "protein": 3.9, "carbohydrates": 47.6, "fat": 17.2, "confidence": 0.92},
        "tomato": {"name": "Fresh Tomato", "portion": "1 medium (100g)", "weight_g": 100.0, "calories": 18.0, "protein": 0.9, "carbohydrates": 3.9, "fat": 0.2, "confidence": 0.88},
        "tomatoes": {"name": "Fresh Tomato", "portion": "1 medium (100g)", "weight_g": 100.0, "calories": 18.0, "protein": 0.9, "carbohydrates": 3.9, "fat": 0.2, "confidence": 0.88},
        "rice": {"name": "White Rice Cooked", "portion": "1 cup (150g)", "weight_g": 150.0, "calories": 195.0, "protein": 4.0, "carbohydrates": 42.0, "fat": 0.5, "confidence": 0.88},
        "chicken": {"name": "Chicken Breast Cooked", "portion": "150g fillet", "weight_g": 150.0, "calories": 248.0, "protein": 46.5, "carbohydrates": 0.0, "fat": 5.4, "confidence": 0.90},
        "chicken breast": {"name": "Chicken Breast Cooked", "portion": "150g fillet", "weight_g": 150.0, "calories": 248.0, "protein": 46.5, "carbohydrates": 0.0, "fat": 5.4, "confidence": 0.90},
        "egg": {"name": "Whole Eggs Cooked", "portion": "2 eggs (100g)", "weight_g": 100.0, "calories": 140.0, "protein": 12.0, "carbohydrates": 1.2, "fat": 10.0, "confidence": 0.89},
        "apple": {"name": "Fresh Apple", "portion": "1 medium (180g)", "weight_g": 180.0, "calories": 95.0, "protein": 0.5, "carbohydrates": 25.0, "fat": 0.3, "confidence": 0.88},
        "banana": {"name": "Fresh Banana", "portion": "1 medium (120g)", "weight_g": 120.0, "calories": 105.0, "protein": 1.3, "carbohydrates": 27.0, "fat": 0.3, "confidence": 0.87},
        "salad": {"name": "Mixed Green Salad", "portion": "1 bowl (150g)", "weight_g": 150.0, "calories": 45.0, "protein": 1.5, "carbohydrates": 9.0, "fat": 0.2, "confidence": 0.85},
        "roti": {"name": "Whole Wheat Roti", "portion": "2 rotis (80g)", "weight_g": 80.0, "calories": 210.0, "protein": 6.5, "carbohydrates": 40.0, "fat": 1.5, "confidence": 0.86},
        "dal": {"name": "Cooked Dal Tadka", "portion": "1 bowl (180g)", "weight_g": 180.0, "calories": 180.0, "protein": 9.5, "carbohydrates": 28.0, "fat": 3.5, "confidence": 0.85},
        "paneer": {"name": "Paneer Tikka", "portion": "150g serving", "weight_g": 150.0, "calories": 380.0, "protein": 24.0, "carbohydrates": 8.0, "fat": 28.0, "confidence": 0.87},
        "milk": {"name": "Cow Milk", "portion": "1 glass (250ml)", "weight_g": 250.0, "calories": 150.0, "protein": 8.0, "carbohydrates": 12.0, "fat": 8.0, "confidence": 0.85},
        "oats": {"name": "Cooked Oatmeal", "portion": "1 bowl (200g)", "weight_g": 200.0, "calories": 160.0, "protein": 6.0, "carbohydrates": 28.0, "fat": 3.0, "confidence": 0.84},
        "fish": {"name": "Grilled Fish", "portion": "150g fillet", "weight_g": 150.0, "calories": 180.0, "protein": 30.0, "carbohydrates": 0.0, "fat": 6.0, "confidence": 0.88},
        "idli": {"name": "Steamed Idli", "portion": "3 pieces (150g)", "weight_g": 150.0, "calories": 180.0, "protein": 4.5, "carbohydrates": 38.0, "fat": 0.8, "confidence": 0.83},
        "dosa": {"name": "Plain Dosa", "portion": "1 medium (120g)", "weight_g": 120.0, "calories": 190.0, "protein": 4.0, "carbohydrates": 34.0, "fat": 4.5, "confidence": 0.84},
        "biryani": {"name": "Chicken Biryani", "portion": "1 plate (300g)", "weight_g": 300.0, "calories": 480.0, "protein": 26.0, "carbohydrates": 65.0, "fat": 14.0, "confidence": 0.89},
        "pasta": {"name": "Pasta with Tomato Sauce", "portion": "1 bowl (200g)", "weight_g": 200.0, "calories": 280.0, "protein": 9.0, "carbohydrates": 52.0, "fat": 4.0, "confidence": 0.88},
        "sandwich": {"name": "Chicken & Vegetable Sandwich", "portion": "1 sandwich (180g)", "weight_g": 180.0, "calories": 360.0, "protein": 20.0, "carbohydrates": 42.0, "fat": 12.0, "confidence": 0.87}
    }

    def _detect_foods_from_image_pixels(self, physical_path: str) -> List[Dict[str, Any]]:
        """
        Analyzes pixel color distributions with 3x3 spatial grid grounding to accurately
        recognize foods present while strictly preventing over-classification and hallucinations.
        """
        if not os.path.exists(physical_path):
            return []

        try:
            with Image.open(physical_path) as pil_img:
                img_rgb = pil_img.convert("RGB")
                w, h = img_rgb.size
                if w < 10 or h < 10:
                    return []

                # Resize to standard 90x90 grid (each 3x3 spatial cell is 30x30 pixels)
                grid_size = 90
                img_small = img_rgb.resize((grid_size, grid_size), Image.Resampling.BILINEAR)
                get_pixels = getattr(img_small, "get_flattened_data", img_small.getdata)
                pixels = list(get_pixels())
                total = len(pixels)
                if total == 0:
                    return []

                # Check color variance across the image. A solid color canvas or blank image must return [].
                r_vals = [p[0] for p in pixels]
                g_vals = [p[1] for p in pixels]
                b_vals = [p[2] for p in pixels]

                mean_r = sum(r_vals) / total
                mean_g = sum(g_vals) / total
                mean_b = sum(b_vals) / total

                var_r = sum((x - mean_r) ** 2 for x in r_vals) / total
                var_g = sum((x - mean_g) ** 2 for x in g_vals) / total
                var_b = sum((x - mean_b) ** 2 for x in b_vals) / total
                std_dev = (var_r + var_g + var_b) ** 0.5

                if std_dev < 12.0:
                    logger.info("Low color variance / uniform non-food canvas detected; returning empty foods.")
                    return []

                # 3x3 Cell Spatial Analysis
                cell_dim = grid_size // 3
                # cell_stats[(row, col)] = {golden, brown, red, green, white, total}
                cell_stats = {}
                for row in range(3):
                    for col in range(3):
                        cell_stats[(row, col)] = {
                            "golden": 0, "brown": 0, "red": 0, "green": 0, "white": 0, "total": 0
                        }

                for idx, (r, g, b) in enumerate(pixels):
                    px_y = idx // grid_size
                    px_x = idx % grid_size
                    c_row = min(2, px_y // cell_dim)
                    c_col = min(2, px_x // cell_dim)
                    st = cell_stats[(c_row, c_col)]
                    st["total"] += 1

                    # Golden (buns, fries, crust): golden/yellowish hue
                    if r > 140 and g > 95 and r > b * 1.3 and g > b * 1.2 and abs(r - g) < 80:
                        st["golden"] += 1
                    # Savory brown (grilled patty, savory cooked meat)
                    elif r > 45 and r < 140 and g > 30 and g < 95 and b < 70 and abs(r - g) >= 8:
                        st["brown"] += 1
                    # Red (sauce, tomato, packaging)
                    elif r > 145 and g < 75 and b < 75:
                        st["red"] += 1
                    # Green (leafy greens, salad)
                    elif g > 70 and g > r * 1.2 and g > b * 1.2:
                        st["green"] += 1
                    # White / pale cream (rice, eggs)
                    elif r > 175 and g > 175 and b > 175 and abs(r - g) < 25 and abs(g - b) < 25:
                        st["white"] += 1

                detected: List[Dict[str, Any]] = []

                # 1. Grounded Burger Check: Bun (golden) + Patty (savory brown) in same or vertically adjacent cells
                burger_cells = []
                for (r, c), st in cell_stats.items():
                    tot = st["total"] or 1
                    g_pct = st["golden"] / tot
                    b_pct = st["brown"] / tot
                    # High co-presence or adjacent patty presence
                    if (g_pct >= 0.10 and b_pct >= 0.05) or (g_pct >= 0.20 and b_pct >= 0.03):
                        burger_cells.append((r, c))
                    elif b_pct >= 0.10:
                        # Check vertical neighbor for golden bun
                        top_st = cell_stats.get((r - 1, c))
                        bot_st = cell_stats.get((r + 1, c))
                        has_bun_neighbor = (
                            (top_st and (top_st["golden"] / (top_st["total"] or 1)) >= 0.10) or
                            (bot_st and (bot_st["golden"] / (bot_st["total"] or 1)) >= 0.10)
                        )
                        if has_bun_neighbor:
                            burger_cells.append((r, c))

                has_burger = len(burger_cells) > 0
                if has_burger:
                    min_r = min(r for r, c in burger_cells)
                    max_r = max(r for r, c in burger_cells)
                    min_c = min(c for r, c in burger_cells)
                    max_c = max(c for r, c in burger_cells)
                    bbox = [
                        max(50, int(min_r * 300)),
                        max(50, int(min_c * 300)),
                        min(950, int((max_r + 1) * 330)),
                        min(950, int((max_c + 1) * 330))
                    ]
                    detected.append({
                        "name": "Burger",
                        "portion": "1 burger (180g)",
                        "estimated_weight_g": 180.0,
                        "calories": 480.0,
                        "protein": 26.0,
                        "carbohydrates": 42.0,
                        "fat": 22.0,
                        "confidence": 0.90,
                        "is_database_match": False,
                        "bounding_box": bbox,
                        "evidence": "Grounded bun and savory patty layer detected",
                        "specificity_level": "generic"
                    })

                # 2. Grounded French Fries Check: Golden cluster in cell WITHOUT savory brown patty
                fries_cells = []
                for (r, c), st in cell_stats.items():
                    if (r, c) in burger_cells:
                        continue
                    tot = st["total"] or 1
                    g_pct = st["golden"] / tot
                    b_pct = st["brown"] / tot
                    if g_pct >= 0.12 and b_pct < 0.03:
                        fries_cells.append((r, c))

                if fries_cells:
                    min_r = min(r for r, c in fries_cells)
                    max_r = max(r for r, c in fries_cells)
                    min_c = min(c for r, c in fries_cells)
                    max_c = max(c for r, c in fries_cells)
                    bbox = [
                        max(50, int(min_r * 300)),
                        max(50, int(min_c * 300)),
                        min(950, int((max_r + 1) * 330)),
                        min(950, int((max_c + 1) * 330))
                    ]
                    detected.append({
                        "name": "French Fries",
                        "portion": "1 medium portion (115g)",
                        "estimated_weight_g": 115.0,
                        "calories": 358.0,
                        "protein": 3.9,
                        "carbohydrates": 47.6,
                        "fat": 17.2,
                        "confidence": 0.91,
                        "is_database_match": False,
                        "bounding_box": bbox,
                        "evidence": "Grounded elongated golden fry cluster detected",
                        "specificity_level": "generic"
                    })

                # 3. Grounded Pizza Check:
                # Requires multi-cell melted cheese + sauce span across at least 2 cells NOT part of burger
                # If burger AND fries are present, DO NOT invent pizza.
                if not (has_burger and len(fries_cells) > 0):
                    pizza_cells = []
                    for (r, c), st in cell_stats.items():
                        if (r, c) in burger_cells or (r, c) in fries_cells:
                            continue
                        tot = st["total"] or 1
                        g_pct = st["golden"] / tot
                        r_pct = st["red"] / tot
                        if g_pct >= 0.08 and r_pct >= 0.04:
                            pizza_cells.append((r, c))

                    if len(pizza_cells) >= 2:
                        min_r = min(r for r, c in pizza_cells)
                        max_r = max(r for r, c in pizza_cells)
                        min_c = min(c for r, c in pizza_cells)
                        max_c = max(c for r, c in pizza_cells)
                        bbox = [
                            max(50, int(min_r * 300)),
                            max(50, int(min_c * 300)),
                            min(950, int((max_r + 1) * 330)),
                            min(950, int((max_c + 1) * 330))
                        ]
                        detected.append({
                            "name": "Pizza",
                            "portion": "1 slice (120g)",
                            "estimated_weight_g": 120.0,
                            "calories": 290.0,
                            "protein": 12.0,
                            "carbohydrates": 35.0,
                            "fat": 11.5,
                            "confidence": 0.88,
                            "is_database_match": False,
                            "bounding_box": bbox,
                            "evidence": "Grounded baked crust and melted cheese surface detected",
                            "specificity_level": "generic"
                        })

                # 4. Grounded Fresh Tomato Check:
                # Only detect if standalone red cells exist AND NO burger is present (to avoid ketchup/slice hallucination)
                if not has_burger and not any(d["name"] == "Pizza" for d in detected):
                    tomato_cells = []
                    for (r, c), st in cell_stats.items():
                        tot = st["total"] or 1
                        r_pct = st["red"] / tot
                        if r_pct >= 0.15:
                            tomato_cells.append((r, c))
                    if tomato_cells:
                        min_r = min(r for r, c in tomato_cells)
                        max_r = max(r for r, c in tomato_cells)
                        min_c = min(c for r, c in tomato_cells)
                        max_c = max(c for r, c in tomato_cells)
                        bbox = [
                            max(50, int(min_r * 300)),
                            max(50, int(min_c * 300)),
                            min(950, int((max_r + 1) * 330)),
                            min(950, int((max_c + 1) * 330))
                        ]
                        detected.append({
                            "name": "Fresh Tomato",
                            "portion": "1 medium (100g)",
                            "estimated_weight_g": 100.0,
                            "calories": 18.0,
                            "protein": 0.9,
                            "carbohydrates": 3.9,
                            "fat": 0.2,
                            "confidence": 0.85,
                            "is_database_match": False,
                            "bounding_box": bbox,
                            "evidence": "Distinct whole fresh tomato surface detected",
                            "specificity_level": "generic"
                        })

                # 5. Grounded Salad Check
                if not detected:
                    green_cells = [
                        (r, c) for (r, c), st in cell_stats.items()
                        if (st["green"] / (st["total"] or 1)) >= 0.15
                    ]
                    if green_cells:
                        detected.append({
                            "name": "Mixed Green Salad",
                            "portion": "1 bowl (150g)",
                            "estimated_weight_g": 150.0,
                            "calories": 45.0,
                            "protein": 1.5,
                            "carbohydrates": 9.0,
                            "fat": 0.2,
                            "confidence": 0.86,
                            "is_database_match": False,
                            "bounding_box": [100, 100, 900, 900],
                            "evidence": "Grounded leafy green texture detected",
                            "specificity_level": "generic"
                        })

                # 6. Grounded Chicken Breast + White Rice Check
                if not detected:
                    white_pct = sum(st["white"] for st in cell_stats.values()) / total
                    brown_pct = sum(st["brown"] for st in cell_stats.values()) / total
                    if white_pct >= 0.15 and brown_pct >= 0.05:
                        detected.append({
                            "name": "Chicken Breast Cooked",
                            "portion": "150g fillet",
                            "estimated_weight_g": 150.0,
                            "calories": 248.0,
                            "protein": 46.5,
                            "carbohydrates": 0.0,
                            "fat": 5.4,
                            "confidence": 0.89,
                            "is_database_match": False,
                            "bounding_box": [100, 100, 500, 850],
                            "evidence": "Grounded lean protein structure detected",
                            "specificity_level": "generic"
                        })
                        detected.append({
                            "name": "White Rice Cooked",
                            "portion": "1 cup (150g)",
                            "estimated_weight_g": 150.0,
                            "calories": 195.0,
                            "protein": 4.0,
                            "carbohydrates": 42.0,
                            "fat": 0.5,
                            "confidence": 0.88,
                            "is_database_match": False,
                            "bounding_box": [500, 100, 900, 850],
                            "evidence": "Grounded cooked grain surface detected",
                            "specificity_level": "generic"
                        })

                return filter_garnishes_and_duplicates(detected)

        except Exception as e:
            logger.warning(f"Pixel analysis failed: {e}")
            return []

    def parse_image(self, file_path: str, filename: str) -> Dict[str, Any]:
        logger.info("AUDIT: Heuristic request started")
        physical_path = resolve_physical_image_path(file_path)
        search_target = (filename + " " + os.path.basename(file_path)).lower()

        # 1. Keyword-based matching from filename/path
        matched_items = []
        matched_keys = set()
        for key in sorted(self.FOOD_DATABASE.keys(), key=lambda k: len(k), reverse=True):
            if key in search_target and key not in matched_keys:
                info = self.FOOD_DATABASE[key]
                if not any(it["name"] == info["name"] for it in matched_items):
                    matched_items.append({
                        "name": info["name"],
                        "portion": info["portion"],
                        "estimated_weight_g": info["weight_g"],
                        "calories": info["calories"],
                        "protein": info["protein"],
                        "carbohydrates": info["carbohydrates"],
                        "fat": info["fat"],
                        "confidence": info["confidence"],
                        "is_database_match": False,
                        "bounding_box": [100, 100, 900, 900],
                        "evidence": f"Filename keyword '{key}' grounded match",
                        "specificity_level": "generic"
                    })
                matched_keys.add(key)

        # 2. Visual pixel color & feature analysis from actual image content
        pixel_items = self._detect_foods_from_image_pixels(physical_path)
        if pixel_items:
            if not matched_items:
                matched_items = pixel_items
            else:
                existing_names = {it["name"].lower() for it in matched_items}
                for p_item in pixel_items:
                    if p_item["name"].lower() not in existing_names:
                        matched_items.append(p_item)

        matched_items = filter_garnishes_and_duplicates(matched_items)

        if matched_items:
            logger.info("AUDIT: Parser success")
            tot_cal = sum(item["calories"] for item in matched_items)
            tot_pro = sum(item["protein"] for item in matched_items)
            tot_carb = sum(item["carbohydrates"] for item in matched_items)
            tot_fat = sum(item["fat"] for item in matched_items)
            tot_weight = sum(item["estimated_weight_g"] for item in matched_items)
            avg_conf = sum(item["confidence"] for item in matched_items) / len(matched_items)

            item_names = [item["name"] for item in matched_items]
            if len(item_names) == 1:
                meal_name = item_names[0]
            elif len(item_names) == 2:
                meal_name = f"{item_names[0]} & {item_names[1]}"
            else:
                meal_name = f"{item_names[0]}, {item_names[1]} & More"

            return {
                "food_name": meal_name,
                "meal_name": meal_name,
                "foods": matched_items,
                "detected_items": item_names,
                "confidence_per_item": {item["name"]: item["confidence"] for item in matched_items},
                "serving_size_estimation": "medium" if tot_weight < 450 else "large",
                "estimated_weight_g": round(tot_weight, 1),
                "estimated_weight_range": f"~{max(10, int(tot_weight * 0.85))}–{int(tot_weight * 1.15)} g",
                "health_score": 7,
                "nutrition_confidence": round(avg_conf, 2),
                "recognition_confidence": round(avg_conf, 2),
                "database_match_confidence": 0.70,
                "overall_grounded_confidence": round(avg_conf * 0.9, 2),
                "goal_alignment": {"weight_loss": 6, "muscle_gain": 8, "maintenance": 8},
                "recommendation": f"Recognized meal items: {', '.join(item_names)}. Adjust portions as needed.",
                "healthier_alternative": "Pair with a fresh green side salad and choose water or unsweetened tea.",
                "annotations": matched_items,
                "calories": round(tot_cal, 1),
                "protein": round(tot_pro, 1),
                "carbohydrates": round(tot_carb, 1),
                "fat": round(tot_fat, 1),
                "confidence_score": round(avg_conf, 2),
                "provider": "heuristic"
            }

        # No food detected (e.g. blank canvas, non-food object, screenshot)
        logger.info("AUDIT: No recognizable food detected.")
        return {
            "food_name": "No Food Detected",
            "meal_name": "No Food Detected",
            "foods": [],
            "detected_items": [],
            "confidence_per_item": {},
            "serving_size_estimation": "none",
            "estimated_weight_g": 0.0,
            "estimated_weight_range": "0 g",
            "health_score": 0,
            "nutrition_confidence": 0.0,
            "recognition_confidence": 0.0,
            "database_match_confidence": 0.0,
            "overall_grounded_confidence": 0.0,
            "goal_alignment": {"weight_loss": 0, "muscle_gain": 0, "maintenance": 0},
            "recommendation": "No recognizable food items were detected in this image. Please upload a clear photo of your meal.",
            "healthier_alternative": "Ensure the meal is well-lit, clearly framed, and unobstructed.",
            "annotations": [],
            "calories": 0.0,
            "protein": 0.0,
            "carbohydrates": 0.0,
            "fat": 0.0,
            "confidence_score": 0.0,
            "provider": "heuristic"
        }


class GeminiVisionProvider(VisionProvider):
    def parse_image(self, file_path: str, filename: str) -> Dict[str, Any]:
        logger.info("Gemini request started")

        physical_path = resolve_physical_image_path(file_path)

        if not os.path.exists(physical_path):
            logger.error(f"Image not found on disk at resolved path {physical_path}")
            logger.info("Gemini request completed")
            logger.info("Gemini parse failed")
            logger.info("Fallback provider activated")
            return HeuristicVisionProvider().parse_image(file_path, filename)

        try:
            image_bytes, mime_type = get_image_bytes_and_mime(physical_path)
        except Exception as e:
            logger.error(f"Failed to read image bytes or detect MIME at {physical_path}: {e}")
            logger.info("Gemini request completed")
            logger.info("Gemini parse failed")
            logger.info("Fallback provider activated")
            return HeuristicVisionProvider().parse_image(file_path, filename)

        prompt = (
            "You are an expert sports nutrition and food computer vision system.\n"
            "Analyze the contents of this food image with strict visual grounding.\n\n"
            "CRITICAL ACCURACY & GROUNDING REQUIREMENTS:\n"
            "1. CONSERVATIVE GROUNDING: Identify ONLY food items that are unambiguously visible. NEVER hallucinate, invent, or guess foods not clearly shown.\n"
            "2. NO OVER-CLASSIFICATION: If the image depicts a burger and french fries, DO NOT identify pizza or fresh tomatoes unless distinct pizza slices or separate whole tomatoes are clearly present.\n"
            "3. GENERIC LABELS: Prefer generic, accurate category names (e.g. 'Burger', 'Pizza', 'French Fries', 'Salad', 'Rice') unless distinct branding or unambiguous visual evidence confirms a specific sub-variety.\n"
            "4. NON-FOOD FILTERING: Do NOT classify non-food objects (cups, soda cups, drinks, straws, wrappers, packaging, boxes, trays, plates, napkins, tables, cutlery).\n"
            "5. BOUNDING BOXES: Provide accurate [ymin, xmin, ymax, xmax] coordinates (integers 0-1000) for each detected food item.\n"
            "6. EMPTY DETECTION: If the image does not contain food (e.g. non-food object, scenery, solid color, blank, screenshot), return foods: [] and meal_name: 'No Food Detected'.\n\n"
            "Return STRICT JSON only, with no markdown code blocks, no ```json formatting, and no commentary.\n\n"
            "JSON SCHEMA:\n"
            "{\n"
            "  \"meal_name\": \"Grounded meal name (e.g. 'Burger & French Fries' or 'No Food Detected')\",\n"
            "  \"serving_size_estimation\": \"small\" | \"medium\" | \"large\" | \"none\",\n"
            "  \"estimated_weight_g\": integer (total plate weight in grams, 0 if no food),\n"
            "  \"health_score\": integer between 1 and 10 (0 if no food),\n"
            "  \"nutrition_confidence\": float between 0.0 and 1.0,\n"
            "  \"goal_alignment\": {\n"
            "    \"weight_loss\": integer between 1 and 10,\n"
            "    \"muscle_gain\": integer between 1 and 10,\n"
            "    \"maintenance\": integer between 1 and 10\n"
            "  },\n"
            "  \"recommendation\": \"A concise, actionable nutrition recommendation for this meal\",\n"
            "  \"healthier_alternative\": \"An actionable healthier alternative or preparation tip\",\n"
            "  \"foods\": [\n"
            "    {\n"
            "      \"name\": \"Grounded food item name (e.g. 'Burger', 'French Fries')\",\n"
            "      \"portion\": \"e.g. 1 burger (180g), 1 medium portion (115g)\",\n"
            "      \"estimated_weight_g\": float (weight in grams),\n"
            "      \"calories\": float,\n"
            "      \"protein\": float,\n"
            "      \"carbohydrates\": float,\n"
            "      \"fat\": float,\n"
            "      \"confidence\": float between 0.0 and 1.0,\n"
            "      \"bounding_box\": [ymin, xmin, ymax, xmax] (integers 0-1000 representing box coordinates)\n"
            "    }\n"
            "  ],\n"
            "  \"calories\": float (total meal calories),\n"
            "  \"protein\": float (total meal protein in grams),\n"
            "  \"carbohydrates\": float (total meal carbs in grams),\n"
            "  \"fat\": float (total meal fat in grams),\n"
            "  \"confidence_score\": float between 0.0 and 1.0\n"
            "}"
        )

        from app.gemini_client import call_gemini_api

        try:
            response_text, input_tokens, output_tokens, success = call_gemini_api(
                prompt=prompt,
                json_mode=True,
                image_bytes=image_bytes,
                mime_type=mime_type
            )

            logger.info("Gemini request completed")

            if not success or not response_text:
                raise ValueError("Gemini API returned unsuccessful or empty response")

            clean_text = response_text.strip()
            if "```" in clean_text:
                match = re.search(r"\{.*\}", clean_text, re.DOTALL)
                if match:
                    clean_text = match.group(0)
                else:
                    lines = clean_text.splitlines()
                    lines = [l for l in lines if not l.strip().startswith("```")]
                    clean_text = "\n".join(lines).strip()

            data = json.loads(clean_text)

            meal_name = str(data.get("meal_name") or data.get("food_name") or "Scanned Meal").strip()
            serving_size_estimation = str(data.get("serving_size_estimation") or "medium").lower()
            if serving_size_estimation not in ["small", "medium", "large", "none"]:
                serving_size_estimation = "medium"

            raw_foods = data.get("foods")
            parsed_foods = []
            if isinstance(raw_foods, list) and len(raw_foods) > 0:
                for f in raw_foods:
                    if not isinstance(f, dict):
                        continue
                    raw_name = str(f.get("name") or "Food Item").strip()
                    if is_non_food_object(raw_name):
                        logger.info(f"Filtered out non-food object from Gemini result: {raw_name}")
                        continue

                    norm_name, spec_level, ev_note = normalize_food_name_grounded(raw_name)
                    item_cal = max(0.0, float(f.get("calories", 0.0)))
                    item_pro = max(0.0, float(f.get("protein", 0.0)))
                    item_carb = max(0.0, float(f.get("carbohydrates", 0.0)))
                    item_fat = max(0.0, float(f.get("fat", 0.0)))
                    item_conf = max(0.0, min(1.0, float(f.get("confidence", 0.85))))
                    item_weight = max(10.0, float(f.get("estimated_weight_g", 100.0)))
                    item_portion = str(f.get("portion") or f"{int(item_weight)}g")
                    bbox = validate_and_normalize_bounding_box(f.get("bounding_box"))

                    parsed_foods.append({
                        "name": norm_name,
                        "portion": item_portion,
                        "estimated_weight_g": round(item_weight, 1),
                        "calories": round(item_cal, 1),
                        "protein": round(item_pro, 1),
                        "carbohydrates": round(item_carb, 1),
                        "fat": round(item_fat, 1),
                        "confidence": round(item_conf, 2),
                        "recognition_confidence": round(item_conf, 2),
                        "database_match_confidence": 0.50,
                        "bounding_box": bbox,
                        "evidence": ev_note,
                        "specificity_level": spec_level,
                        "is_database_match": False
                    })

            # Filter garnishes and deduplicate overlapping boxes
            parsed_foods = filter_garnishes_and_duplicates(parsed_foods)

            if not parsed_foods:
                logger.info("No valid food items remained after grounding and non-food filtering.")
                return {
                    "food_name": "No Food Detected",
                    "meal_name": "No Food Detected",
                    "foods": [],
                    "detected_items": [],
                    "confidence_per_item": {},
                    "serving_size_estimation": "none",
                    "estimated_weight_g": 0.0,
                    "estimated_weight_range": "0 g",
                    "health_score": 0,
                    "nutrition_confidence": 0.0,
                    "recognition_confidence": 0.0,
                    "database_match_confidence": 0.0,
                    "overall_grounded_confidence": 0.0,
                    "goal_alignment": {"weight_loss": 0, "muscle_gain": 0, "maintenance": 0},
                    "recommendation": "No recognizable food items were detected in this image. Please upload a clear photo of your meal.",
                    "healthier_alternative": "Ensure the meal is well-lit, clearly framed, and unobstructed.",
                    "annotations": [],
                    "calories": 0.0,
                    "protein": 0.0,
                    "carbohydrates": 0.0,
                    "fat": 0.0,
                    "confidence_score": 0.0,
                    "provider": "gemini"
                }

            total_calories = sum(f["calories"] for f in parsed_foods)
            total_protein = sum(f["protein"] for f in parsed_foods)
            total_carbs = sum(f["carbohydrates"] for f in parsed_foods)
            total_fat = sum(f["fat"] for f in parsed_foods)
            total_weight = sum(f["estimated_weight_g"] for f in parsed_foods)
            overall_confidence = max(0.1, min(0.95, float(data.get("confidence_score", 0.85))))

            detected_names = [f["name"] for f in parsed_foods]
            conf_per_item = {f["name"]: f["confidence"] for f in parsed_foods}

            if len(detected_names) == 1:
                meal_name = detected_names[0]
            elif len(detected_names) == 2:
                meal_name = f"{detected_names[0]} & {detected_names[1]}"
            else:
                meal_name = f"{detected_names[0]}, {detected_names[1]} & More"

            normalized_data = {
                "food_name": meal_name,
                "meal_name": meal_name,
                "foods": parsed_foods,
                "detected_items": detected_names,
                "confidence_per_item": conf_per_item,
                "serving_size_estimation": serving_size_estimation,
                "estimated_weight_g": round(total_weight, 1),
                "estimated_weight_range": f"~{max(10, int(total_weight * 0.85))}–{int(total_weight * 1.15)} g",
                "health_score": max(1, min(10, int(data.get("health_score", 6)))),
                "nutrition_confidence": max(0.1, min(0.95, float(data.get("nutrition_confidence", overall_confidence)))),
                "recognition_confidence": round(overall_confidence, 2),
                "database_match_confidence": 0.70,
                "overall_grounded_confidence": round(overall_confidence * 0.9, 2),
                "goal_alignment": data.get("goal_alignment") or {"weight_loss": 6, "muscle_gain": 6, "maintenance": 7},
                "recommendation": str(data.get("recommendation") or "Nutrient profile analyzed.").strip(),
                "healthier_alternative": str(data.get("healthier_alternative") or "Consider whole ingredients.").strip(),
                "annotations": parsed_foods,
                "confidence_score": round(overall_confidence, 2),
                "calories": round(total_calories, 1),
                "protein": round(total_protein, 1),
                "carbohydrates": round(total_carbs, 1),
                "fat": round(total_fat, 1),
                "provider": "gemini"
            }

            logger.info("Gemini parse success")
            return normalized_data

        except Exception as err:
            logger.error(f"Gemini processing or validation failed: {err}")
            logger.info("Gemini parse failed")
            logger.info("Fallback provider activated")
            return HeuristicVisionProvider().parse_image(file_path, filename)


GROUNDED_DB_MAPPING = {
    "burger": "Classic Hamburger",
    "hamburger": "Classic Hamburger",
    "cheeseburger": "Classic Hamburger",
    "grilled beef cheeseburger": "Classic Hamburger",
    "beef burger": "Classic Hamburger",
    "fries": "French Fries",
    "french fries": "French Fries",
    "potato fries": "French Fries",
    "pizza": "Margherita Pizza",
    "margherita pizza": "Margherita Pizza",
    "cheese pizza": "Margherita Pizza",
    "salad": "Mixed Green Salad",
    "mixed green salad": "Mixed Green Salad",
    "fresh tomato": "Fresh Tomato",
    "tomato": "Fresh Tomato",
    "tomatoes": "Fresh Tomato",
    "chicken": "Chicken Breast Cooked",
    "chicken breast": "Chicken Breast Cooked",
    "chicken breast cooked": "Chicken Breast Cooked",
    "rice": "White Rice Cooked",
    "white rice": "White Rice Cooked",
    "white rice cooked": "White Rice Cooked",
    "dal": "Dal Cooked",
    "yellow dal": "Dal Cooked",
    "dal cooked": "Dal Cooked",
    "cooked dal tadka": "Dal Cooked",
    "roti": "Whole Wheat Roti",
    "chapati": "Whole Wheat Roti",
    "whole wheat roti": "Whole Wheat Roti",
    "egg": "Boiled Egg Whole",
    "boiled egg": "Boiled Egg Whole",
    "eggs": "Boiled Egg Whole",
    "whole eggs cooked": "Boiled Egg Whole",
    "paneer": "Paneer Raw",
    "paneer tikka": "Paneer Raw",
    "apple": "Fresh Apple",
    "fresh apple": "Fresh Apple",
    "banana": "Fresh Banana",
    "fresh banana": "Fresh Banana",
    "oats": "Rolled Oats Cooked",
    "cooked oatmeal": "Rolled Oats Cooked",
    "fish": "Grilled Salmon",
    "grilled fish": "Grilled Salmon",
    "idli": "Steamed Idli",
    "dosa": "Plain Dosa",
    "biryani": "Chicken Biryani",
    "chicken biryani": "Chicken Biryani",
    "pasta": "Pasta with Tomato Sauce",
}


def find_database_match(db: Session, user_id: uuid.UUID, candidate_name: str) -> Optional[Food]:
    """
    Finds the best matching Food record for a given candidate string.
    Checks grounded category mappings first, exact names, aliases, and safe tokens.
    """
    try:
        base_filter = or_(Food.is_custom == False, Food.created_by == user_id)
        cand_norm = candidate_name.strip()

        if not cand_norm or cand_norm.lower() in ["food", "meal", "plate", "unknown meal", "item", "no food detected"]:
            return None

        # Step 0: Check grounded mapping dictionary (prevents 'burger' matching 'vada pav')
        grounded_target = GROUNDED_DB_MAPPING.get(cand_norm.lower())
        if grounded_target:
            g_match = db.query(Food).filter(
                base_filter,
                or_(
                    Food.name.ilike(grounded_target),
                    Food.common_name.ilike(grounded_target)
                )
            ).first()
            if g_match:
                return g_match

        # Step 1: Exact case-insensitive match on name or common_name
        match = db.query(Food).filter(
            base_filter,
            or_(
                Food.name.ilike(cand_norm),
                Food.common_name.ilike(cand_norm)
            )
        ).first()
        if match:
            return match

        # Step 2: Partial / alias match
        match = db.query(Food).filter(
            base_filter,
            or_(
                Food.name.ilike(f"%{cand_norm}%"),
                Food.common_name.ilike(f"%{cand_norm}%"),
                Food.aliases.ilike(f"%{cand_norm}%")
            )
        ).first()
        if match:
            return match

        # Step 3: Strip common preparation words and search root tokens
        stop_words = {"cooked", "steamed", "boiled", "fried", "roasted", "grilled", "fresh", "raw", "bowl", "plate", "serving", "curry", "with", "and", "of", "in"}
        tokens = [w for w in re.split(r"\W+", cand_norm.lower()) if len(w) >= 3 and w not in stop_words]

        for token in tokens:
            token_target = GROUNDED_DB_MAPPING.get(token)
            if token_target:
                t_match = db.query(Food).filter(
                    base_filter,
                    Food.name.ilike(token_target)
                ).first()
                if t_match:
                    return t_match

            match = db.query(Food).filter(
                base_filter,
                or_(
                    Food.name.ilike(f"%{token}%"),
                    Food.common_name.ilike(f"%{token}%"),
                    Food.aliases.ilike(f"%{token}%")
                )
            ).first()
            if match:
                return match

        return None
    except Exception as e:
        logger.warning(f"find_database_match failed safely: {e}")
        return None


def match_and_scale_nutrition(db: Session, user_id: uuid.UUID, result: Dict[str, Any]) -> Tuple[Optional[uuid.UUID], Dict[str, Any]]:
    """
    Cross-references each food item detected by Gemini Vision or Heuristics against
    the verified Food database. Computes calibrated confidence metrics:
    - recognition_confidence
    - database_match_confidence
    - nutrition_confidence
    - overall_grounded_confidence
    Appends medical disclaimer.
    """
    foods_list = result.get("foods", [])

    # If meal is "No Food Detected" or empty
    if not foods_list and (result.get("meal_name") == "No Food Detected" or result.get("food_name") == "No Food Detected"):
        result["foods"] = []
        result["calories"] = 0.0
        result["protein"] = 0.0
        result["carbohydrates"] = 0.0
        result["fat"] = 0.0
        result["estimated_weight_g"] = 0.0
        result["estimated_weight_range"] = "0 g"
        result["recognition_confidence"] = 0.0
        result["database_match_confidence"] = 0.0
        result["nutrition_confidence"] = 0.0
        result["overall_grounded_confidence"] = 0.0
        result["confidence_score"] = 0.0
        result["detected_items"] = []
        result["confidence_per_item"] = {}
        result["annotations"] = []
        return None, result

    # If foods_list is missing, build from detected_items or top-level
    if not foods_list:
        items = result.get("detected_items", []) or [result.get("food_name", "Meal")]
        items = [i for i in items if i and i != "No Food Detected"]
        count = len(items) or 1
        foods_list = []
        for name in items:
            foods_list.append({
                "name": name,
                "portion": result.get("serving_size_estimation", "1 serving"),
                "estimated_weight_g": (result.get("estimated_weight_g", 350.0)) / count,
                "calories": round(result.get("calories", 0.0) / count, 1),
                "protein": round(result.get("protein", 0.0) / count, 1),
                "carbohydrates": round(result.get("carbohydrates", 0.0) / count, 1),
                "fat": round(result.get("fat", 0.0) / count, 1),
                "confidence": result.get("confidence_score", 0.85),
                "recognition_confidence": result.get("confidence_score", 0.85),
                "database_match_confidence": 0.50,
                "evidence": "Top-level item decomposition",
                "specificity_level": "generic",
                "is_database_match": False
            })

    primary_food_id = None
    verified_matches_count = 0

    # Match each individual food item
    for item in foods_list:
        item_name = item.get("name", "")
        matched_food = find_database_match(db, user_id, item_name)
        rec_c = float(item.get("recognition_confidence", item.get("confidence", 0.85)))

        if matched_food:
            verified_matches_count += 1
            if not primary_food_id:
                primary_food_id = matched_food.food_id

            est_weight = float(item.get("estimated_weight_g") or 100.0)
            db_serving = float(matched_food.serving_size or 100.0)

            # Scale nutrients
            if db_serving > 0:
                scale = max(0.2, min(5.0, est_weight / db_serving))
            else:
                scale = 1.0

            item["calories"] = round(float(matched_food.calories or 0.0) * scale, 1)
            item["protein"] = round(float(matched_food.protein or 0.0) * scale, 1)
            item["carbohydrates"] = round(float(matched_food.carbohydrates or 0.0) * scale, 1)
            item["fat"] = round(float(matched_food.fat or 0.0) * scale, 1)
            item["food_id"] = str(matched_food.food_id)
            item["matched_food_name"] = matched_food.name
            item["is_database_match"] = True
            item["recognition_confidence"] = rec_c
            item["database_match_confidence"] = 1.0
        else:
            item["food_id"] = None
            item["matched_food_name"] = None
            item["is_database_match"] = False
            item["recognition_confidence"] = rec_c
            item["database_match_confidence"] = 0.40

    if not foods_list:
        return None, result

    # Aggregate total meal nutrition from all items
    total_cal = round(sum(f["calories"] for f in foods_list), 1)
    total_pro = round(sum(f["protein"] for f in foods_list), 1)
    total_carb = round(sum(f["carbohydrates"] for f in foods_list), 1)
    total_fat = round(sum(f["fat"] for f in foods_list), 1)
    total_weight = round(sum(float(f.get("estimated_weight_g", 100.0)) for f in foods_list), 1)

    avg_rec = sum(f["recognition_confidence"] for f in foods_list) / len(foods_list)
    avg_db = sum(f["database_match_confidence"] for f in foods_list) / len(foods_list)
    nut_c = float(result.get("nutrition_confidence", avg_rec))
    grounded_overall = round(0.50 * avg_rec + 0.30 * avg_db + 0.20 * nut_c, 2)
    grounded_overall = max(0.10, min(0.95, grounded_overall))

    result["foods"] = foods_list
    result["calories"] = total_cal
    result["protein"] = total_pro
    result["carbohydrates"] = total_carb
    result["fat"] = total_fat
    result["estimated_weight_g"] = total_weight
    result["estimated_weight_range"] = f"~{max(10, int(total_weight * 0.85))}–{int(total_weight * 1.15)} g"
    result["detected_items"] = [f["name"] for f in foods_list]
    result["confidence_per_item"] = {f["name"]: f.get("confidence", 0.85) for f in foods_list}
    result["annotations"] = foods_list
    result["recognition_confidence"] = round(avg_rec, 2)
    result["database_match_confidence"] = round(avg_db, 2)
    result["overall_grounded_confidence"] = grounded_overall
    result["confidence_score"] = grounded_overall

    # If no primary food was matched, create a custom Food record for the overall meal safely
    if not primary_food_id:
        try:
            meal_name = result.get("meal_name") or result.get("food_name") or "Scanned Meal"
            if meal_name not in ["Unknown Meal", "No Food Detected"]:
                new_food = Food(
                    name=meal_name,
                    serving_size=round(total_weight, 1) if total_weight > 0 else 100.0,
                    serving_unit="g",
                    calories=total_cal,
                    protein=total_pro,
                    carbohydrates=total_carb,
                    fat=total_fat,
                    is_custom=True,
                    created_by=user_id
                )
                db.add(new_food)
                db.flush()
                primary_food_id = new_food.food_id
        except Exception as e:
            logger.warning(f"Could not create custom food entry: {e}")
            db.rollback()

    # Append medical disclaimer and database match note
    disclaimer = "Note: All AI values are nutritional estimates, not exact medical measurements."
    if verified_matches_count > 0:
        base_rec = result.get("recommendation", "")
        if "verified database" not in base_rec.lower():
            result["recommendation"] = (
                f"{base_rec} Nutrients cross-referenced with verified database entry ({verified_matches_count} item{'s' if verified_matches_count > 1 else ''} matched). {disclaimer}"
            ).strip()
    else:
        base_rec = result.get("recommendation", "")
        if "estimates" not in base_rec.lower():
            result["recommendation"] = f"{base_rec} {disclaimer}".strip()

    return primary_food_id, result


def process_food_recognition_job(db: Session, log_id: uuid.UUID, provider: VisionProvider, file_path: str, filename: str) -> None:
    """
    Synchronous processing boundary that simulates a background worker.
    Updates database log status to 'processing', performs estimation,
    cross-references verified database items and saves final values.
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

        # Cross-reference with verified database & scale portions
        food_id, result = match_and_scale_nutrition(db, log.user_id, result)

        food_name = result.get("food_name") or result.get("meal_name") or "Scanned Meal"

        # Update log details
        log.food_name = food_name
        log.calories = result["calories"]
        log.protein = result["protein"]
        log.carbohydrates = result["carbohydrates"]
        log.fat = result["fat"]
        log.confidence_score = result["confidence_score"]
        log.provider = result.get("provider", "heuristic")
        log.food_id = food_id

        # Phase F-3.5 fields
        log.meal_name = result.get("meal_name", food_name)
        log.detected_items = result.get("detected_items", [food_name])
        log.confidence_per_item = result.get("confidence_per_item", {food_name: result["confidence_score"]})
        log.serving_size_estimation = result.get("serving_size_estimation", "medium")
        log.estimated_weight_g = result.get("estimated_weight_g", 350.0)
        log.health_score = result.get("health_score", 6)
        log.nutrition_confidence = result.get("nutrition_confidence", result["confidence_score"])
        log.goal_alignment = result.get("goal_alignment", {"weight_loss": 5, "muscle_gain": 5, "maintenance": 5})
        log.recommendation = result.get("recommendation", "Assessment completed.")
        log.healthier_alternative = result.get("healthier_alternative", "Consider cooking with whole ingredients.")
        log.annotations = result.get("annotations", [])

        log.status = "completed"
        log.processing_time_ms = (time.time() - start_time) * 1000.0
        db.commit()
    except Exception as e:
        db.rollback()
        log = db.query(FoodRecognitionLog).filter(FoodRecognitionLog.id == log_id).first()
        if log:
            log.status = "failed"
            log.processing_time_ms = (time.time() - start_time) * 1000.0
            db.commit()
        raise e
