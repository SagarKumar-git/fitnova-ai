import os
import sys
import unittest
import uuid
from fastapi.testclient import TestClient

# Add current folder to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Force SQLite DB configuration for tests
os.environ["DATABASE_URL"] = "sqlite:///./test_security.db"

from app.main import app, seed_food_database, seed_exercise_database
from app.database import engine, Base

class TestFitNovaWorkoutSecurityAndIdempotency(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Creates the test SQLite database structure and TestClient."""
        Base.metadata.create_all(bind=engine)
        seed_food_database()
        seed_exercise_database()
        cls.client = TestClient(app)

        # Register User A
        reg_a = {
            "name": "User Alpha",
            "email": "alpha@fitnova.ai",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "role": "user"
        }
        res_a = cls.client.post("/api/auth/register", json=reg_a)
        assert res_a.status_code == 201

        login_a = {"email": "alpha@fitnova.ai", "password": "Password123!"}
        token_a = cls.client.post("/api/auth/login", json=login_a).json()["access_token"]
        cls.headers_a = {"Authorization": f"Bearer {token_a}"}

        # Register User B
        reg_b = {
            "name": "User Beta",
            "email": "beta@fitnova.ai",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "role": "user"
        }
        res_b = cls.client.post("/api/auth/register", json=reg_b)
        assert res_b.status_code == 201

        login_b = {"email": "beta@fitnova.ai", "password": "Password123!"}
        token_b = cls.client.post("/api/auth/login", json=login_b).json()["access_token"]
        cls.headers_b = {"Authorization": f"Bearer {token_b}"}

    @classmethod
    def tearDownClass(cls):
        """Drops test tables and cleans up DB file."""
        Base.metadata.drop_all(bind=engine)
        if os.path.exists("./test_security.db"):
            try:
                os.remove("./test_security.db")
            except OSError:
                pass

    def setUp(self):
        """Ensures isolated state by cancelling any dangling active sessions."""
        self.client.post("/api/workouts/sessions/cancel", headers=self.headers_a)
        self.client.post("/api/workouts/sessions/cancel", headers=self.headers_b)

    def test_idor_protection_across_users(self):
        """
        Verifies that User B cannot access, read, modify, or delete User A's
        workout sessions, sets, templates, history, or PRs.
        """
        # 1. User A fetches an exercise
        exercises = self.client.get("/api/exercises?query=Bench", headers=self.headers_a).json()
        bench_id = exercises[0]["id"]

        # 2. User A creates a template
        template_payload = {
            "name": "Alpha Push Template",
            "description": "User Alpha private routine",
            "exercises": [
                {
                    "exercise_id": bench_id,
                    "order": 1,
                    "target_sets": 3,
                    "target_reps": 10,
                    "target_weight": 80.0,
                    "rest_seconds": 90
                }
            ]
        }
        res_t = self.client.post("/api/workouts/templates", json=template_payload, headers=self.headers_a)
        self.assertEqual(res_t.status_code, 201)
        template_a_id = res_t.json()["id"]

        # 3. User B tries to start a session using User A's template -> Must be rejected (404)
        res_bad_start = self.client.post(
            "/api/workouts/sessions/start",
            json={"name": "Attacker Session", "template_id": template_a_id},
            headers=self.headers_b
        )
        self.assertEqual(res_bad_start.status_code, 404)
        self.assertIn("Template not found", res_bad_start.json()["detail"])

        # 4. User A starts their session
        res_sess_a = self.client.post(
            "/api/workouts/sessions/start",
            json={"name": "Alpha Live Workout", "template_id": template_a_id},
            headers=self.headers_a
        )
        self.assertEqual(res_sess_a.status_code, 201)
        session_a_id = res_sess_a.json()["id"]

        # 5. User B tries to GET User A's session by ID -> 404 (IDOR Defense)
        res_idor_get = self.client.get(f"/api/workouts/sessions/{session_a_id}", headers=self.headers_b)
        self.assertEqual(res_idor_get.status_code, 404)

        # 6. User B tries to UPDATE User A's session -> 404
        res_idor_put = self.client.put(
            f"/api/workouts/sessions/{session_a_id}",
            json={"notes": "Hacked notes"},
            headers=self.headers_b
        )
        self.assertEqual(res_idor_put.status_code, 404)

        # 7. User B tries to CANCEL User A's session -> 404
        res_idor_cancel = self.client.post(
            f"/api/workouts/sessions/{session_a_id}/cancel",
            headers=self.headers_b
        )
        self.assertEqual(res_idor_cancel.status_code, 404)

        # 8. User A logs a set
        set_payload = {
            "exercise_id": bench_id,
            "set_number": 1,
            "reps": 10,
            "weight": 85.0,
            "rpe": 8.0,
            "rest_seconds": 90
        }
        res_set = self.client.post("/api/workouts/sessions/log-set", json=set_payload, headers=self.headers_a)
        self.assertEqual(res_set.status_code, 201)
        set_a_id = res_set.json()["id"]

        # 9. User B tries to DELETE User A's set -> 404
        res_del_idor = self.client.delete(f"/api/workouts/sessions/delete-set/{set_a_id}", headers=self.headers_b)
        self.assertEqual(res_del_idor.status_code, 404)

        # 10. User A finishes workout
        res_finish = self.client.post(
            "/api/workouts/sessions/finish",
            json={"notes": "Strong finish by Alpha", "rating": 5, "calories": 420.0},
            headers=self.headers_a
        )
        self.assertEqual(res_finish.status_code, 200)
        self.assertEqual(res_finish.json()["status"], "completed")
        self.assertEqual(res_finish.json()["rating"], 5)
        self.assertEqual(res_finish.json()["calories"], 420.0)

        # 11. User B checks workout history and PRs -> User A's data must NEVER leak
        res_b_history = self.client.get("/api/workouts/sessions", headers=self.headers_b).json()
        b_session_ids = [s["id"] for s in res_b_history]
        self.assertNotIn(session_a_id, b_session_ids)

        # User A's session must be in User A's history
        res_a_history = self.client.get("/api/workouts/sessions", headers=self.headers_a).json()
        a_session_ids = [s["id"] for s in res_a_history]
        self.assertIn(session_a_id, a_session_ids)

    def test_idempotent_mutations(self):
        """
        Verifies that sending duplicate mutation requests with the same idempotency key
        safely returns the cached response without creating duplicate sessions or sets.
        """
        key_start = f"idemp_start_{uuid.uuid4()}"
        headers = {**self.headers_b, "X-Idempotency-Key": key_start}

        # 1. Start session with idempotency key
        res1 = self.client.post("/api/workouts/sessions/start", json={"name": "Beta Idempotency Workout"}, headers=headers)
        self.assertEqual(res1.status_code, 201)
        session_id = res1.json()["id"]

        # 2. Resend same start request with same idempotency key -> Must return same session
        res2 = self.client.post("/api/workouts/sessions/start", json={"name": "Beta Idempotency Workout"}, headers=headers)
        self.assertEqual(res2.status_code, 201)
        self.assertEqual(res2.json()["id"], session_id)

        # 3. Log set with idempotency key
        exercises = self.client.get("/api/exercises?query=Bench", headers=self.headers_b).json()
        bench_id = exercises[0]["id"]

        key_set = f"idemp_set_{uuid.uuid4()}"
        set_headers = {**self.headers_b, "X-Idempotency-Key": key_set}
        set_payload = {
            "exercise_id": bench_id,
            "set_number": 1,
            "reps": 12,
            "weight": 70.0,
            "rpe": 7.5,
            "rest_seconds": 60,
            "notes": "First working set"
        }

        res_set1 = self.client.post("/api/workouts/sessions/log-set", json=set_payload, headers=set_headers)
        self.assertEqual(res_set1.status_code, 201)
        set_id = res_set1.json()["id"]

        # 4. Resend exact same set request with same idempotency key
        res_set2 = self.client.post("/api/workouts/sessions/log-set", json=set_payload, headers=set_headers)
        self.assertEqual(res_set2.status_code, 201)
        self.assertEqual(res_set2.json()["id"], set_id)

        # Verify active session has exactly 1 set, not 2
        active_sess = self.client.get("/api/workouts/sessions/active", headers=self.headers_b).json()
        self.assertEqual(len(active_sess["sets"]), 1)
        self.assertEqual(active_sess["total_volume"], 70.0 * 12)

        # 5. Finish session with idempotency key
        key_finish = f"idemp_finish_{uuid.uuid4()}"
        finish_headers = {**self.headers_b, "X-Idempotency-Key": key_finish}
        res_fin1 = self.client.post(
            "/api/workouts/sessions/finish",
            json={"notes": "Idempotent finish", "rating": 4, "calories": 300.0},
            headers=finish_headers
        )
        self.assertEqual(res_fin1.status_code, 200)

        # Resend finish
        res_fin2 = self.client.post(
            "/api/workouts/sessions/finish",
            json={"notes": "Idempotent finish", "rating": 4, "calories": 300.0},
            headers=finish_headers
        )
        self.assertEqual(res_fin2.status_code, 200)
        self.assertEqual(res_fin2.json()["id"], session_id)

    def test_exercise_substitution_and_cancellation(self):
        """
        Verifies exercise substitution persistence and session cancellation flow.
        """
        # User B starts a new session
        res_start = self.client.post(
            "/api/workouts/sessions/start",
            json={"name": "Substitution and Cancel Test"},
            headers=self.headers_b
        )
        self.assertEqual(res_start.status_code, 201)
        session_id = res_start.json()["id"]

        exercises = self.client.get("/api/exercises", headers=self.headers_b).json()
        orig_ex_id = exercises[0]["id"]
        sub_ex_id = exercises[1]["id"]

        # Log a normal set with original exercise
        self.client.post(
            "/api/workouts/sessions/log-set",
            json={"exercise_id": orig_ex_id, "set_number": 1, "reps": 8, "weight": 50.0},
            headers=self.headers_b
        )

        # Substitute exercise
        sub_payload = {
            "original_exercise_id": orig_ex_id,
            "substitute_exercise_id": sub_ex_id,
            "reason": "Machine occupied, switched to dumbbell"
        }
        res_sub = self.client.post("/api/workouts/sessions/substitute-exercise", json=sub_payload, headers=self.headers_b)
        self.assertEqual(res_sub.status_code, 200)

        # Cancel the session
        res_cancel = self.client.post(
            "/api/workouts/sessions/cancel",
            json={"reason": "Emergency gym closure"},
            headers=self.headers_b
        )
        self.assertEqual(res_cancel.status_code, 200)
        self.assertEqual(res_cancel.json()["status"], "cancelled")
        self.assertIn("Cancelled: Emergency gym closure", res_cancel.json()["notes"])

        # Confirm no active session remains
        active_res = self.client.get("/api/workouts/sessions/active", headers=self.headers_b)
        self.assertIsNone(active_res.json())

    def test_optimistic_locking_conflict(self):
        """
        Verifies that updating a session with a stale version returns HTTP 409 Conflict.
        """
        res_start = self.client.post(
            "/api/workouts/sessions/start",
            json={"name": "Concurrency Test Session"},
            headers=self.headers_b
        )
        session_id = res_start.json()["id"]

        # Session starts at version 1
        # Successfully update session with version 1
        res_up1 = self.client.put(
            f"/api/workouts/sessions/{session_id}",
            json={"notes": "First update", "version": 1},
            headers=self.headers_b
        )
        self.assertEqual(res_up1.status_code, 200)
        self.assertEqual(res_up1.json()["version"], 2)

        # Stale update with version 1 when server is at version 2 -> 409 Conflict
        res_conflict = self.client.put(
            f"/api/workouts/sessions/{session_id}",
            json={"notes": "Stale update", "version": 1},
            headers=self.headers_b
        )
        self.assertEqual(res_conflict.status_code, 409)
        self.assertIn("Conflict: Session has been modified", res_conflict.json()["detail"])

        # Clean up
        self.client.post("/api/workouts/sessions/cancel", headers=self.headers_b)

    def test_adaptive_training_cross_user_isolation(self):
        """
        Verifies that User B cannot read, update (PUT/PATCH), or list User A's
        adaptive decisions or adaptive preferences.
        """
        # 1. User A creates an adaptive decision
        session_id = str(uuid.uuid4())
        dec_payload = {
            "session_id": session_id,
            "decision_type": "volume_reduction",
            "original_plan": {"exercises": 4, "total_sets": 12},
            "adaptive_plan": {"exercises": 3, "total_sets": 9},
            "reasons": ["High fatigue signal"],
            "supporting_signals": ["elevated_rhr"],
            "confidence": 0.88,
            "safety_limits_applied": ["cap_max_sets"],
            "user_action": "accepted"
        }
        res_create = self.client.post("/api/workouts/adaptive/decisions", json=dec_payload, headers=self.headers_a)
        self.assertEqual(res_create.status_code, 201)
        dec_a_id = res_create.json()["id"]

        # 2. User B tries to GET User A's decision -> 404
        res_idor_get = self.client.get(f"/api/workouts/adaptive/decisions/{dec_a_id}", headers=self.headers_b)
        self.assertEqual(res_idor_get.status_code, 404)
        self.assertIn("Decision not found", res_idor_get.json()["detail"])

        # 3. User B tries to PATCH User A's decision -> 404
        res_idor_patch = self.client.patch(
            f"/api/workouts/adaptive/decisions/{dec_a_id}",
            json={"user_action": "rejected"},
            headers=self.headers_b
        )
        self.assertEqual(res_idor_patch.status_code, 404)

        # 4. User B tries to PUT User A's decision -> 404
        res_idor_put = self.client.put(
            f"/api/workouts/adaptive/decisions/{dec_a_id}",
            json={"user_action": "rejected"},
            headers=self.headers_b
        )
        self.assertEqual(res_idor_put.status_code, 404)

        # 5. User B lists decisions -> User A's decision must NOT appear
        res_b_list = self.client.get("/api/workouts/adaptive/decisions", headers=self.headers_b)
        self.assertEqual(res_b_list.status_code, 200)
        b_ids = [d["id"] for d in res_b_list.json()]
        self.assertNotIn(dec_a_id, b_ids)

        # 6. User A updates adaptive preferences
        pref_update = {
            "automatic_intensity_reduction_allowed": False
        }
        res_pref_a = self.client.patch("/api/workouts/adaptive/preferences", json=pref_update, headers=self.headers_a)
        self.assertEqual(res_pref_a.status_code, 200)
        self.assertEqual(res_pref_a.json()["automatic_intensity_reduction_allowed"], False)

        # 7. User B gets their own preferences -> Must not have User A's modified preference
        res_pref_b = self.client.get("/api/workouts/adaptive/preferences", headers=self.headers_b)
        self.assertEqual(res_pref_b.status_code, 200)
        self.assertEqual(res_pref_b.json()["automatic_intensity_reduction_allowed"], True)  # default is True

    def test_unauthenticated_health_access_rejection(self):
        """
        Verifies that health and wearable endpoints strictly reject unauthenticated requests.
        """
        res_summary = self.client.get("/api/health/summary")
        self.assertEqual(res_summary.status_code, 401)

        res_hr = self.client.get("/api/health/heart-rate")
        self.assertEqual(res_hr.status_code, 401)

        res_recovery = self.client.get("/api/health/recovery")
        self.assertEqual(res_recovery.status_code, 401)

        res_sleep = self.client.get("/api/health/sleep")
        self.assertEqual(res_sleep.status_code, 401)

if __name__ == "__main__":
    unittest.main()
