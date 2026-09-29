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
from app.services.vision import match_and_scale_nutrition
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
