import os
import sys
import unittest
from datetime import date
from fastapi.testclient import TestClient

# Add current folder to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Force sqlite database configuration for local isolated test runs
os.environ["DATABASE_URL"] = "sqlite:///./test_fitnova.db"

from app.main import app, seed_food_database, seed_exercise_database
from app.database import engine, Base

class TestFitNovaAPIPhase2(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        """Creates the SQLite database structure and initializes TestClient."""
        Base.metadata.create_all(bind=engine)
        seed_food_database()
        seed_exercise_database()
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        """Drops test tables and removes the database file from the system."""
        Base.metadata.drop_all(bind=engine)
        if os.path.exists("./test_fitnova.db"):
            try:
                os.remove("./test_fitnova.db")
            except OSError:
                pass

    def test_complete_phase2_flow(self):
        # 1. Register a user
        reg_payload = {
            "name": "Nutrition Pro",
            "email": "nutrition@fitnova.ai",
            "password": "fitnovaSecure123",
            "confirm_password": "fitnovaSecure123",
            "role": "user"
        }
        response = self.client.post("/api/auth/register", json=reg_payload)
        self.assertEqual(response.status_code, 201)
        
        # 2. Login
        login_payload = {
            "email": "nutrition@fitnova.ai",
            "password": "fitnovaSecure123"
        }
        response = self.client.post("/api/auth/login", json=login_payload)
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3. Setup Profile (Weight: 80kg, height: 180cm, age: 25, goal: fat loss)
        profile_payload = {
            "age": 25,
            "gender": "male",
            "height": 180.0,
            "weight": 80.0,
            "target_weight": 75.0,
            "goal": "Fat Loss",
            "experience_level": "Intermediate",
            "activity_level": "Moderate",
            "workout_days_per_week": 4,
            "gym_access": True
        }
        response = self.client.put("/api/profile", json=profile_payload, headers=headers)
        self.assertEqual(response.status_code, 200)

        # 4. Search Seed Foods (Check if Indian foods were seeded)
        response = self.client.get("/api/foods?query=Roti", headers=headers)
        self.assertEqual(response.status_code, 200)
        roti_data = response.json()
        self.assertTrue(len(roti_data) >= 1)
        self.assertEqual(roti_data[0]["name"], "Roti")
        roti_id = roti_data[0]["food_id"]

        response = self.client.get("/api/foods?query=Paneer", headers=headers)
        paneer_data = response.json()
        self.assertEqual(paneer_data[0]["name"], "Paneer Tikka")
        paneer_id = paneer_data[0]["food_id"]

        # 5. Log Foods eaten today (e.g. 2 Rotis for Breakfast, 1 Paneer Tikka for Post Workout)
        today_str = str(date.today())
        
        # Log 2 Rotis
        log_roti_payload = {
            "food_id": roti_id,
            "meal_type": "Breakfast",
            "servings": 2.0,
            "logged_date": today_str
        }
        response = self.client.post("/api/logs/nutrition", json=log_roti_payload, headers=headers)
        self.assertEqual(response.status_code, 201)
        roti_log_id = response.json()["log_id"]

        # Log 1.5 Servings of Paneer Tikka
        log_paneer_payload = {
            "food_id": paneer_id,
            "meal_type": "Post Workout",
            "servings": 1.5,
            "logged_date": today_str
        }
        response = self.client.post("/api/logs/nutrition", json=log_paneer_payload, headers=headers)
        self.assertEqual(response.status_code, 201)

        # 6. Log Water (e.g. 500ml and then 250ml)
        response = self.client.post("/api/logs/water", json={"amount_ml": 500, "logged_date": today_str}, headers=headers)
        self.assertEqual(response.status_code, 201)
        response = self.client.post("/api/logs/water", json={"amount_ml": 250, "logged_date": today_str}, headers=headers)
        self.assertEqual(response.status_code, 201)

        # 7. Check Dashboard - Consumed aggregates should match:
        # 2 Rotis = 2 * 120 kcal = 240 kcal (7g P, 44g C, 1g F)
        # 1.5 Paneer Tikka = 1.5 * 280 kcal = 420 kcal (27g P, 9g C, 30g F)
        # Total Calories = 240 + 420 = 660 kcal
        # Total Protein = 7 + 27 = 34g
        # Total Water = 500 + 250 = 750ml
        response = self.client.get("/api/dashboard", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["calories_consumed"], 660.0)
        self.assertEqual(data["protein_consumed"], 34.0)
        self.assertEqual(data["water_consumed_ml"], 750)

        # 8. Check Weight History Logged
        # Initially profile setup should have logged 1 weight (80.0kg)
        response = self.client.get("/api/profile/weight-history", headers=headers)
        self.assertEqual(response.status_code, 200)
        weight_hist = response.json()
        self.assertEqual(len(weight_hist), 1)
        self.assertEqual(weight_hist[0]["weight"], 80.0)
        self.assertEqual(weight_hist[0]["source"], "profile_update")

        # Manually Log a new weight entry (79.2kg)
        manual_weight = {
            "weight": 79.2,
            "source": "manual_entry"
        }
        response = self.client.post("/api/profile/weight-history", json=manual_weight, headers=headers)
        self.assertEqual(response.status_code, 201)

        # Fetch weight history again - should now have 2 entries
        response = self.client.get("/api/profile/weight-history", headers=headers)
        weight_hist = response.json()
        self.assertEqual(len(weight_hist), 2)
        self.assertEqual(weight_hist[1]["weight"], 79.2)
        self.assertEqual(weight_hist[1]["source"], "manual_entry")

        # 9. Create a Meal Plan Template and apply it
        # Let's create a template called "Workout Meal Plan" with 3 Rotis
        meal_plan_payload = {
            "name": "Workout Meal Plan",
            "items": [
                {
                    "food_id": roti_id,
                    "meal_type": "Pre Workout",
                    "servings": 3.0
                }
            ]
        }
        response = self.client.post("/api/meal-plans", json=meal_plan_payload, headers=headers)
        self.assertEqual(response.status_code, 201)
        plan_id = response.json()["meal_plan_id"]

        # Apply the meal plan to tomorrow
        tomorrow_str = str(date.fromordinal(date.today().toordinal() + 1))
        response = self.client.post(f"/api/meal-plans/{plan_id}/apply?logged_date={tomorrow_str}", headers=headers)
        self.assertEqual(response.status_code, 200)

        # Verify tomorrow's food logs contain 3 Rotis
        response = self.client.get(f"/api/logs/nutrition?logged_date={tomorrow_str}", headers=headers)
        tomorrow_logs = response.json()
        self.assertEqual(len(tomorrow_logs), 1)
        self.assertEqual(tomorrow_logs[0]["meal_type"], "Pre Workout")
        self.assertEqual(tomorrow_logs[0]["servings"], 3.0)

        # 10. Delete a Food Log (e.g. Delete Roti from today)
        response = self.client.delete(f"/api/logs/nutrition/{roti_log_id}", headers=headers)
        self.assertEqual(response.status_code, 204)

        # Verify today's aggregates on dashboard went down:
        # Today should now only have Paneer Tikka (420 kcal, 27g Protein)
        response = self.client.get("/api/dashboard", headers=headers)
        data = response.json()
        self.assertEqual(data["calories_consumed"], 420.0)
        self.assertEqual(data["protein_consumed"], 27.0)

        # 11. AI Meal Planner v1 Endpoints
        # A. Generate meal plan with custom biometric overrides
        ai_payload = {
            "diet_type": "Vegetarian",
            "diet_cuisine": "Indian Diet",
            "goal": "Muscle Gain",
            "weight": 75.0,
            "height": 175.0,
            "age": 28,
            "activity_level": "Moderate"
        }
        response = self.client.post("/api/ai/meal", json=ai_payload, headers=headers)
        self.assertEqual(response.status_code, 200)
        ai_plan = response.json()
        self.assertIn("meals_data", ai_plan)
        self.assertEqual(ai_plan["goal"], "Muscle Gain")
        self.assertEqual(ai_plan["weight"], 75.0)
        self.assertEqual(ai_plan["diet_type"], "Vegetarian")
        ai_plan_id = ai_plan["id"]

        # B. Get latest AI plan
        response = self.client.get("/api/ai/meal", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], ai_plan_id)

        # C. Get AI plan history
        response = self.client.get("/api/ai/meal/history", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.json()) >= 1)
        self.assertEqual(response.json()[0]["id"], ai_plan_id)

        # D. Get Grocery list
        response = self.client.get(f"/api/ai/meal/{ai_plan_id}/grocery", headers=headers)
        self.assertEqual(response.status_code, 200)
        grocery_data = response.json()
        self.assertIsInstance(grocery_data, dict)
        self.assertTrue(len(grocery_data.keys()) > 0)

        # E. Swap a meal (should work with fallback if Gemini API is missing)
        response = self.client.post(f"/api/ai/meal/{ai_plan_id}/swap?meal_type=Breakfast", headers=headers)
        self.assertEqual(response.status_code, 200)
        swapped_plan = response.json()
        self.assertIn("Breakfast", swapped_plan["meals_data"])
        self.assertTrue(len(swapped_plan["meals_data"]["Breakfast"]["name"]) > 0)

        # F. Delete AI meal plan
        response = self.client.delete(f"/api/ai/meal/{ai_plan_id}", headers=headers)
        self.assertEqual(response.status_code, 200)

        # G. Verify history is empty now
        response = self.client.get("/api/ai/meal/history", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertNotIn(ai_plan_id, [p["id"] for p in response.json()])

if __name__ == "__main__":
    unittest.main()
