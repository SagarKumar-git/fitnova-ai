import os
import sys
import unittest
from datetime import date
from fastapi.testclient import TestClient

# Add current folder to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Force SQLite DB configuration for tests
os.environ["DATABASE_URL"] = "sqlite:///./test_workouts.db"

from app.main import app
from app.database import engine, Base

class TestFitNovaWorkoutsAPI(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Creates the test SQLite database structure and TestClient."""
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        """Drops test tables and clean up DB file."""
        Base.metadata.drop_all(bind=engine)
        if os.path.exists("./test_workouts.db"):
            try:
                os.remove("./test_workouts.db")
            except OSError:
                pass

    def test_complete_workout_flow(self):
        # 1. Register & Login User
        reg_payload = {
            "name": "Workout Warrior",
            "email": "warrior@fitnova.ai",
            "password": "fitnovaSecure123",
            "confirm_password": "fitnovaSecure123",
            "role": "user"
        }
        res = self.client.post("/api/auth/register", json=reg_payload)
        self.assertEqual(res.status_code, 201)

        login_payload = {
            "email": "warrior@fitnova.ai",
            "password": "fitnovaSecure123"
        }
        res = self.client.post("/api/auth/login", json=login_payload)
        token = res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get Muscle Groups
        res = self.client.get("/api/exercises/muscle-groups", headers=headers)
        self.assertEqual(res.status_code, 200)
        muscles = res.json()
        self.assertTrue(len(muscles) >= 5)
        
        # Resolve IDs
        chest_id = next(m["id"] for m in muscles if m["name"] == "Chest")
        triceps_id = next(m["id"] for m in muscles if m["name"] == "Triceps")
        shoulders_id = next(m["id"] for m in muscles if m["name"] == "Shoulders")

        # 3. Search Seeded Exercises
        res = self.client.get("/api/exercises?query=Bench", headers=headers)
        self.assertEqual(res.status_code, 200)
        bench_press = res.json()[0]
        self.assertEqual(bench_press["name"], "Bench Press")
        self.assertEqual(bench_press["primary_muscle_group_name"], "Chest")
        self.assertTrue(len(bench_press["muscles"]) >= 2)
        # Check media
        self.assertIsNotNone(bench_press["media"])
        self.assertEqual(bench_press["media"]["video_url"], "https://assets.mixkit.co/videos/preview/mixkit-man-working-out-on-a-bench-press-34384-large.mp4")

        # 4. Create Custom Exercise
        custom_ex_payload = {
            "name": "Weighted Dips",
            "category": "Strength",
            "equipment": "Bodyweight",
            "description": "Dip on parallel bars with a belt carrying weights.",
            "primary_muscle_group_id": triceps_id,
            "muscles": [
                {
                    "muscle_group_id": triceps_id,
                    "is_primary": True,
                    "contribution_pct": 70.0
                },
                {
                    "muscle_group_id": chest_id,
                    "is_primary": False,
                    "contribution_pct": 30.0
                }
            ],
            "media": {
                "video_url": "https://example.com/dips.mp4",
                "thumbnail_url": "https://example.com/dips.jpg"
            }
        }
        res = self.client.post("/api/exercises", json=custom_ex_payload, headers=headers)
        self.assertEqual(res.status_code, 201)
        custom_ex = res.json()
        self.assertEqual(custom_ex["name"], "Weighted Dips")
        dips_id = custom_ex["id"]

        # 5. Create Workout Template Routine
        template_payload = {
            "name": "Push Strength Routine",
            "description": "Routine for heavy pressing, targets Chest, Shoulders, and Triceps.",
            "exercises": [
                {
                    "exercise_id": bench_press["id"],
                    "order": 1,
                    "target_sets": 3,
                    "target_reps": 5,
                    "target_weight": 80.0,
                    "rest_seconds": 120
                },
                {
                    "exercise_id": dips_id,
                    "order": 2,
                    "target_sets": 3,
                    "target_reps": 10,
                    "target_weight": 20.0,
                    "rest_seconds": 90
                }
            ]
        }
        res = self.client.post("/api/workouts/templates", json=template_payload, headers=headers)
        self.assertEqual(res.status_code, 201)
        template = res.json()
        self.assertEqual(template["name"], "Push Strength Routine")
        self.assertEqual(len(template["exercises"]), 2)
        template_id = template["id"]

        # 6. Start Session
        session_payload = {
            "name": "Push Strength Routine Live",
            "template_id": template_id
        }
        res = self.client.post("/api/workouts/sessions/start", json=session_payload, headers=headers)
        self.assertEqual(res.status_code, 201)
        session = res.json()
        self.assertIsNone(session["ended_at"])
        session_id = session["id"]

        # 7. Log Workout Sets
        # Bench set 1: 80kg * 5 reps (volume: 400kg, Est 1RM: 80 * (1 + 5/30) = 93.3kg)
        set_1_bench = {
            "exercise_id": bench_press["id"],
            "set_number": 1,
            "reps": 5,
            "weight": 80.0,
            "rpe": 9.0,
            "rest_seconds": 120
        }
        res = self.client.post("/api/workouts/sessions/log-set", json=set_1_bench, headers=headers)
        self.assertEqual(res.status_code, 201)
        set_saved = res.json()
        self.assertTrue(set_saved["is_pr"])  # First set is always a PR
        self.assertEqual(set_saved["exercise_name"], "Bench Press")
        set_1_id = set_saved["id"]

        # Log heavier Bench set 2: 85kg * 5 reps (volume: 425kg, Est 1RM: 85 * (1 + 5/30) = 99.2kg)
        set_2_bench = {
            "exercise_id": bench_press["id"],
            "set_number": 2,
            "reps": 5,
            "weight": 85.0,
            "rpe": 9.5,
            "rest_seconds": 120
        }
        res = self.client.post("/api/workouts/sessions/log-set", json=set_2_bench, headers=headers)
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.json()["is_pr"])  # Breaks best weight (85 > 80), best volume, and best 1RM

        # Delete Set 1
        res = self.client.delete(f"/api/workouts/sessions/delete-set/{set_1_id}", headers=headers)
        self.assertEqual(res.status_code, 204)

        # Log Weighted Dips sets
        set_1_dips = {
            "exercise_id": dips_id,
            "set_number": 1,
            "reps": 10,
            "weight": 20.0,
            "rpe": 8.0,
            "rest_seconds": 90
        }
        res = self.client.post("/api/workouts/sessions/log-set", json=set_1_dips, headers=headers)
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.json()["is_pr"])

        # 8. Complete Session
        finish_payload = {
            "notes": "Felt strong on heavy press. Weighted dips were challenging."
        }
        res = self.client.post("/api/workouts/sessions/finish", json=finish_payload, headers=headers)
        self.assertEqual(res.status_code, 200)
        finished_session = res.json()
        self.assertIsNotNone(finished_session["ended_at"])
        # Remaining: Bench Press (85kg*5 = 425kg volume) + Weighted Dips (20kg*10 = 200kg volume) = 625kg total volume
        self.assertEqual(finished_session["total_volume"], 625.0)
        self.assertEqual(finished_session["total_sets"], 2)

        # 9. Get Streaks & Analytics
        res = self.client.get("/api/workout/analytics", headers=headers)
        self.assertEqual(res.status_code, 200)
        analytics = res.json()
        self.assertEqual(analytics["total_workouts"], 1)
        self.assertEqual(analytics["total_volume"], 625.0)
        self.assertEqual(analytics["weekly_workout_frequency"], 1)
        # Streaks
        self.assertEqual(analytics["workout_streak"]["daily_streak"], 1)
        self.assertEqual(analytics["workout_streak"]["weekly_streak"], 1)
        
        # Muscle Volume distribution check
        # Bench Press: 425kg (85% Chest = 361.25kg, 10% Triceps = 42.5kg, 5% Shoulders = 21.25kg)
        # Weighted Dips: 200kg (70% Triceps = 140kg, 30% Chest = 60kg)
        # Total Chest Volume = 361.25 + 60 = 421.25kg
        # Total Triceps Volume = 42.5 + 140 = 182.5kg
        # Total Shoulders Volume = 21.25kg
        # Total calculated = 421.25 + 182.5 + 21.25 = 625kg
        # Chest % = 421.25 / 625 = 67.4%
        # Triceps % = 182.5 / 625 = 29.2%
        # Shoulders % = 21.25 / 625 = 3.4%
        self.assertAlmostEqual(analytics["muscle_volume_breakdown"]["Chest"], 67.4, delta=0.5)
        self.assertAlmostEqual(analytics["muscle_volume_breakdown"]["Triceps"], 29.2, delta=0.5)
        self.assertAlmostEqual(analytics["muscle_volume_breakdown"]["Shoulders"], 3.4, delta=0.5)

        # 10. Set Goals
        goals_payload = {
            "target_workouts_per_week": 4,
            "target_volume": 3000.0,
            "target_strength_goal": "Overhead press bodyweight."
        }
        res = self.client.post("/api/workout/analytics/goals", json=goals_payload, headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["target_workouts_per_week"], 4)

        # 11. Fetch Exercise History
        res = self.client.get(f"/api/exercises/{bench_press['id']}/history", headers=headers)
        self.assertEqual(res.status_code, 200)
        history = res.json()
        self.assertEqual(history["personal_record"]["best_weight"], 85.0)
        # Est 1RM: 85 * (1 + 5/30) = 99.16kg -> rounds to 99.2kg
        self.assertEqual(history["personal_record"]["best_estimated_1rm"], 99.16666666666667)
        self.assertEqual(len(history["sets_history"]), 1)
        self.assertEqual(len(history["progress_curve"]), 1)
        self.assertEqual(history["progress_curve"][0]["estimated_1rm"], 99.2)

if __name__ == "__main__":
    unittest.main()
