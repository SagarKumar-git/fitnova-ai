import os
import sys
import io
import unittest
from PIL import Image
from fastapi.testclient import TestClient

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ["DATABASE_URL"] = "sqlite:///./test_food_scan.db"

from app.main import app, seed_food_database
from app.database import engine, Base
from app.services.vision import (
    match_and_scale_nutrition,
    is_non_food_object,
    validate_and_normalize_bounding_box,
    compute_iou,
    normalize_food_name_grounded,
    filter_garnishes_and_duplicates,
    GROUNDED_DB_MAPPING,
)
from app.models import Food, User
from app.database import SessionLocal

class TestFoodScannerAI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        seed_food_database()
        cls.client = TestClient(app)

        # Register test user
        reg_payload = {
            "name": "Food Scanner User",
            "email": "scanner@fitnova.ai",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "role": "user"
        }
        res = cls.client.post("/api/auth/register", json=reg_payload)
        assert res.status_code == 201

        login_res = cls.client.post("/api/auth/login", json={
            "email": "scanner@fitnova.ai",
            "password": "Password123!"
        })
        token = login_res.json()["access_token"]
        cls.headers = {"Authorization": f"Bearer {token}"}

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=engine)
        if os.path.exists("./test_food_scan.db"):
            try:
                os.remove("./test_food_scan.db")
            except OSError:
                pass

    def _create_dummy_image(self, format="JPEG", size=(200, 200), color=None):
        import random
        if color is None:
            color = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
        img = Image.new("RGB", size, color=color)
        buf = io.BytesIO()
        img.save(buf, format=format)
        buf.seek(0)
        return buf.getvalue()

    def test_upload_food_image_and_heuristics_cross_reference(self):
        """Tests uploading an image named chicken.jpg which triggers heuristic chicken detection and cross references DB."""
        img_bytes = self._create_dummy_image("JPEG")
        files = {
            "file": ("chicken_breast.jpg", img_bytes, "image/jpeg")
        }

        # Test both /api/v1/ai/food-scan and /api/ai/food-scan endpoints
        response = self.client.post("/api/v1/ai/food-scan", headers=self.headers, files=files)
        self.assertEqual(response.status_code, 201)
        data = response.json()

        self.assertIn("Chicken", data["meal_name"])
        self.assertIsNotNone(data["calories"])
        self.assertIsNotNone(data["protein"])
        self.assertIsNotNone(data["food_id"])
        self.assertIn("estimates", data["recommendation"].lower())

    def test_database_cross_referencing_and_scaling(self):
        """Directly tests match_and_scale_nutrition to verify that DB items are scaled and estimates noted."""
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.email == "scanner@fitnova.ai").first()
            self.assertIsNotNone(user)

            # Test Dal cooked (DB has 150g serving -> 150 kcal, 8g pro, 24g carb, 2.5g fat)
            raw_result = {
                "food_name": "Dal",
                "meal_name": "Yellow Dal",
                "detected_items": ["Dal"],
                "serving_size_estimation": "large",  # 1.5x portion multiplier
                "estimated_weight_g": 300.0,
                "calories": 999.0,  # Arbitrary hallucinated number that should be corrected by verified DB
                "protein": 50.0,
                "carbohydrates": 100.0,
                "fat": 10.0,
                "confidence_score": 0.90,
                "provider": "gemini"
            }

            food_id, scaled = match_and_scale_nutrition(db, user.id, raw_result)
            self.assertIsNotNone(food_id)
            # Dal 150g = 150 kcal. For 300g = 300 kcal (weight ratio 300/150 = 2.0x)
            self.assertEqual(scaled["calories"], 300.0)
            self.assertEqual(scaled["protein"], 16.0)
            self.assertIn("verified database entry", scaled["recommendation"])
            self.assertIn("estimates", scaled["recommendation"])
        finally:
            db.close()

    def test_food_scan_history_and_stats(self):
        """Verifies history retrieval and scan statistics."""
        img_bytes = self._create_dummy_image("JPEG")
        files = {
            "file": ("roti_meal.jpg", img_bytes, "image/jpeg")
        }
        upload_res = self.client.post("/api/v1/ai/food-scan", headers=self.headers, files=files)
        self.assertEqual(upload_res.status_code, 201)

        hist_res = self.client.get("/api/v1/ai/food-scan/history", headers=self.headers)
        self.assertEqual(hist_res.status_code, 200)
        logs = hist_res.json()
        self.assertGreaterEqual(len(logs), 1)

        stats_res = self.client.get("/api/v1/ai/food-scan/stats", headers=self.headers)
        self.assertEqual(stats_res.status_code, 200)
        stats = stats_res.json()
        self.assertGreaterEqual(stats["total_scans"], 1)

    def test_log_scanned_meal_to_nutrition_diary(self):
        """Tests logging a scanned food item into the user's daily nutrition log."""
        # 1. Fetch available food from DB
        db = SessionLocal()
        try:
            food = db.query(Food).filter(Food.name.ilike("%rice%")).first()
            self.assertIsNotNone(food)
            food_id = str(food.food_id)
        finally:
            db.close()

        # 2. Log nutrition entry using existing API
        log_payload = {
            "food_id": food_id,
            "meal_type": "Lunch",
            "servings": 1.5,
            "logged_date": "2026-09-28"
        }
        res = self.client.post("/api/logs/nutrition", json=log_payload, headers=self.headers)
        self.assertEqual(res.status_code, 201)
        logged = res.json()
        self.assertEqual(logged["food_id"], food_id)
        self.assertEqual(logged["servings"], 1.5)

    def test_generic_filename_fallback_no_failure(self):
        """Verifies that an image with a random/camera filename does not cause a 500 error and returns structured data."""
        img_bytes = self._create_dummy_image("JPEG")
        files = {
            "file": ("IMG_20260929_110023.jpg", img_bytes, "image/jpeg")
        }
        res = self.client.post("/api/v1/ai/food-scan", headers=self.headers, files=files)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertIsNotNone(data["meal_name"])
        self.assertEqual(data["status"], "completed")
        self.assertEqual(data["meal_name"], "No Food Detected")
        self.assertEqual(data["calories"], 0.0)
        self.assertEqual(len(data["foods"]), 0)

    def test_transparent_png_upload(self):
        """Verifies transparent RGBA PNG images are processed cleanly without MIME or alpha crashes."""
        img = Image.new("RGBA", (150, 150), (255, 0, 0, 128))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        png_bytes = buf.getvalue()

        files = {
            "file": ("plate_transparent.png", png_bytes, "image/png")
        }
        res = self.client.post("/api/v1/ai/food-scan", headers=self.headers, files=files)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["status"], "completed")

    def test_multi_food_database_scaling(self):
        """Verifies that multiple food items on a plate are independently matched to DB and aggregated."""
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.email == "scanner@fitnova.ai").first()
            self.assertIsNotNone(user)

            raw_result = {
                "meal_name": "Chicken and Rice Bowl",
                "serving_size_estimation": "medium",
                "estimated_weight_g": 350.0,
                "confidence_score": 0.92,
                "foods": [
                    {
                        "name": "Chicken Breast",
                        "portion": "150g fillet",
                        "estimated_weight_g": 150.0,
                        "calories": 999.0, # Hallucinated - should be scaled from DB
                        "protein": 1.0,
                        "carbohydrates": 0.0,
                        "fat": 0.0,
                        "confidence": 0.95
                    },
                    {
                        "name": "White Rice",
                        "portion": "1 cup (150g)",
                        "estimated_weight_g": 150.0,
                        "calories": 888.0, # Hallucinated - should be scaled from DB
                        "protein": 1.0,
                        "carbohydrates": 0.0,
                        "fat": 0.0,
                        "confidence": 0.90
                    }
                ]
            }

            food_id, scaled = match_and_scale_nutrition(db, user.id, raw_result)
            self.assertIsNotNone(food_id)
            self.assertEqual(len(scaled["foods"]), 2)
            for item in scaled["foods"]:
                self.assertTrue(item["is_database_match"])
                self.assertEqual(item["database_match_confidence"], 1.0)
            total_sum = sum(i["calories"] for i in scaled["foods"])
            self.assertAlmostEqual(scaled["calories"], total_sum, places=1)
            self.assertIn("verified database entry", scaled["recommendation"])
            self.assertIn("overall_grounded_confidence", scaled)
            self.assertLessEqual(scaled["overall_grounded_confidence"], 0.95)
            self.assertIn("estimated_weight_range", scaled)
        finally:
            db.close()

    def test_multi_food_keyword_scan(self):
        """
        Verifies that scanning an image with pizza, burger, fries, and tomato in filename
        returns structured multi-food results with separate detected items.
        """
        img = Image.new("RGB", (90, 90), (240, 240, 240))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)
        img_bytes = buf.getvalue()

        files = {
            "file": ("pizza_burger_fries_tomato.jpg", img_bytes, "image/jpeg")
        }
        res = self.client.post("/api/v1/ai/food-scan", headers=self.headers, files=files)
        self.assertEqual(res.status_code, 201)
        data = res.json()

        self.assertEqual(data["status"], "completed")
        self.assertIn("foods", data)
        foods = data["foods"]
        self.assertGreaterEqual(len(foods), 4)

        food_names = [f["name"].lower() for f in foods]
        self.assertTrue(any("pizza" in n for n in food_names))
        self.assertTrue(any("burger" in n for n in food_names))
        self.assertTrue(any("fries" in n for n in food_names))
        self.assertTrue(any("tomato" in n for n in food_names))

        for f in foods:
            self.assertGreater(f["calories"], 0)
            self.assertGreaterEqual(f["protein"], 0)
            self.assertGreaterEqual(f["carbohydrates"], 0)
            self.assertGreaterEqual(f["fat"], 0)
            self.assertGreater(f["confidence"], 0)

        total_cal = sum(f["calories"] for f in foods)
        self.assertAlmostEqual(data["calories"], total_cal, places=1)

    def test_burger_only_image_no_hallucinations(self):
        """
        Verifies that an image containing only a burger (bun + savory patty)
        detects 'Burger' and DOES NOT hallucinate 'Pizza' or 'Tomato'.
        """
        img = Image.new("RGB", (90, 90), (245, 245, 245))
        # Top bun: golden pixels in row 0
        for x in range(20, 70):
            for y in range(10, 35):
                img.putpixel((x, y), (200, 150, 40))
        # Savory patty: brown pixels in row 1
        for x in range(20, 70):
            for y in range(35, 60):
                img.putpixel((x, y), (90, 50, 25))
        # Bottom bun: golden pixels in row 2
        for x in range(20, 70):
            for y in range(60, 80):
                img.putpixel((x, y), (200, 150, 40))

        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)
        img_bytes = buf.getvalue()

        files = {"file": ("camera_meal_001.jpg", img_bytes, "image/jpeg")}
        res = self.client.post("/api/v1/ai/food-scan?force_reanalyze=true", headers=self.headers, files=files)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["status"], "completed")

        food_names = [f["name"].lower() for f in data["foods"]]
        self.assertTrue(any("burger" in n for n in food_names))
        # Must NOT hallucinate pizza or tomato
        self.assertFalse(any("pizza" in n for n in food_names))
        self.assertFalse(any("tomato" in n for n in food_names))

    def test_burger_and_fries_grounding_no_pizza(self):
        """
        Verifies that an image with a burger and french fries
        detects both grounded items, and DOES NOT invent 'Pizza' or 'Tomato'.
        """
        img = Image.new("RGB", (90, 90), (245, 245, 245))
        # Left side: Burger (golden bun + savory patty)
        for x in range(5, 40):
            for y in range(10, 40):
                img.putpixel((x, y), (200, 150, 40))
            for y in range(40, 80):
                img.putpixel((x, y), (90, 50, 25))

        # Right side: French fries (golden fries with no brown patty)
        for x in range(50, 85):
            for y in range(10, 80):
                img.putpixel((x, y), (220, 170, 45))

        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)
        img_bytes = buf.getvalue()

        files = {"file": ("IMG_combo_meal.jpg", img_bytes, "image/jpeg")}
        res = self.client.post("/api/v1/ai/food-scan?force_reanalyze=true", headers=self.headers, files=files)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["status"], "completed")

        food_names = [f["name"].lower() for f in data["foods"]]
        self.assertTrue(any("burger" in n for n in food_names))
        self.assertTrue(any("fries" in n for n in food_names))
        # Must NOT hallucinate pizza or tomato
        self.assertFalse(any("pizza" in n for n in food_names))
        self.assertFalse(any("tomato" in n for n in food_names))

    def test_solid_non_food_image_returns_empty_detection(self):
        """Verifies that a solid/blank non-food image returns 0 foods, 0 calories, and 'No Food Detected'."""
        img = Image.new("RGB", (90, 90), (200, 200, 200)) # Solid neutral grey
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)
        img_bytes = buf.getvalue()

        files = {"file": ("solid_grey_wall.jpg", img_bytes, "image/jpeg")}
        res = self.client.post("/api/v1/ai/food-scan?force_reanalyze=true", headers=self.headers, files=files)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["status"], "completed")
        self.assertEqual(data["meal_name"], "No Food Detected")
        self.assertEqual(data["calories"], 0.0)
        self.assertEqual(len(data["foods"]), 0)

    def test_specificity_downgrade_and_generic_preference(self):
        """Tests that overly specific food labels are normalized down to grounded generic categories."""
        name, spec, _ = normalize_food_name_grounded("Grilled Beef Cheeseburger")
        self.assertEqual(name, "Burger")
        self.assertEqual(spec, "generic")

        name2, spec2, _ = normalize_food_name_grounded("Margherita Pizza")
        self.assertEqual(name2, "Pizza")
        self.assertEqual(spec2, "generic")

        name3, spec3, _ = normalize_food_name_grounded("Potato French Fries")
        self.assertEqual(name3, "French Fries")
        self.assertEqual(spec3, "generic")

    def test_bounding_box_validation_and_clamping(self):
        """Tests that bounding boxes are clamped, checked for minimum dimensions, and degenerate boxes rejected."""
        # Valid box
        box = validate_and_normalize_bounding_box([100, 150, 400, 500])
        self.assertEqual(box, [100, 150, 400, 500])

        # Out-of-bounds coordinates clamped
        box_clamped = validate_and_normalize_bounding_box([-50, 20, 1100, 800])
        self.assertEqual(box_clamped, [0, 20, 1000, 800])

        # Inverted coordinates rejected
        self.assertIsNone(validate_and_normalize_bounding_box([500, 200, 100, 400]))

        # Degenerate whole canvas rejected
        self.assertIsNone(validate_and_normalize_bounding_box([0, 0, 1000, 1000]))

        # Too small box rejected
        self.assertIsNone(validate_and_normalize_bounding_box([100, 100, 110, 110]))

    def test_non_food_object_filtering(self):
        """Tests that packaging, cups, napkins, and non-food surfaces are detected as non-food."""
        self.assertTrue(is_non_food_object("paper cup"))
        self.assertTrue(is_non_food_object("soda"))
        self.assertTrue(is_non_food_object("wrapper"))
        self.assertTrue(is_non_food_object("plastic tray"))
        self.assertTrue(is_non_food_object("straw"))
        self.assertTrue(is_non_food_object("napkin"))

        self.assertFalse(is_non_food_object("Burger"))
        self.assertFalse(is_non_food_object("French Fries"))
        self.assertFalse(is_non_food_object("Pizza"))

    def test_compute_iou(self):
        """Tests Intersection-over-Union bounding box overlap calculation."""
        box1 = [100, 100, 400, 400]
        # Identical box: IoU = 1.0
        self.assertAlmostEqual(compute_iou(box1, box1), 1.0)

        # No overlap: IoU = 0.0
        box2 = [500, 500, 800, 800]
        self.assertEqual(compute_iou(box1, box2), 0.0)

        # Partial overlap
        box3 = [250, 100, 400, 400]
        iou = compute_iou(box1, box3)
        self.assertGreater(iou, 0.0)
        self.assertLess(iou, 1.0)
