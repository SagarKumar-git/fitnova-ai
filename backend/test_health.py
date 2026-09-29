"""
FitNova AI — Sprint 3.7 Wearable Health Backend Integration Tests
Tests authenticated endpoints for health summary, heart rate, HRV, sleep, and recovery.
"""

import os
import sys
import unittest
import uuid
from fastapi.testclient import TestClient

# Add current folder to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Force SQLite DB configuration for tests
os.environ["DATABASE_URL"] = "sqlite:///./test_health.db"

from app.main import app
from app.database import engine, Base

class TestHealthEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)
        # Register and login a test user
        cls.unique_email = f"health_test_{uuid.uuid4().hex[:8]}@example.com"
        cls.password = "HealthPass123!"

        reg_resp = cls.client.post("/api/auth/register", json={
            "name": "Health Test User",
            "email": cls.unique_email,
            "password": cls.password,
            "confirm_password": cls.password,
            "role": "user"
        })
        assert reg_resp.status_code in [200, 201], f"Register failed: {reg_resp.text}"

        login_resp = cls.client.post("/api/auth/login", json={
            "email": cls.unique_email,
            "password": cls.password
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json()["access_token"]
        cls.headers = {"Authorization": f"Bearer {token}"}

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=engine)
        if os.path.exists("./test_health.db"):
            try:
                os.remove("./test_health.db")
            except OSError:
                pass

    def test_01_health_summary_requires_auth(self):
        resp = self.client.get("/api/health/summary")
        self.assertEqual(resp.status_code, 401)

    def test_02_get_health_summary(self):
        resp = self.client.get("/api/health/summary", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "connected")
        self.assertIn("recovery", data)
        self.assertGreaterEqual(data["recovery"]["recovery_score"], 0)
        self.assertLessEqual(data["recovery"]["recovery_score"], 100)
        self.assertGreaterEqual(data["today_steps"], 0)

    def test_03_get_heart_rate(self):
        resp = self.client.get("/api/health/heart-rate", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("current_bpm", data)
        self.assertIn("resting_bpm", data)
        self.assertIn("samples", data)
        self.assertGreater(len(data["samples"]), 0)

    def test_04_get_hrv(self):
        resp = self.client.get("/api/health/hrv", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("current_rmssd_ms", data)
        self.assertIn("status", data)
        self.assertIn(data["status"], ["optimal", "suppressed", "elevated"])
        self.assertIn("samples", data)

    def test_05_get_sleep(self):
        resp = self.client.get("/api/health/sleep", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("total_duration_minutes", data)
        self.assertIn("time_asleep_minutes", data)
        self.assertIn("efficiency_pct", data)
        self.assertIn("stages", data)
        self.assertGreater(len(data["stages"]), 0)

    def test_06_get_recovery(self):
        resp = self.client.get("/api/health/recovery", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("recovery_score", data)
        self.assertIn("readiness_state", data)
        self.assertIn("recommended_intensity", data)
        self.assertIn("contributing_factors", data)
        self.assertIn("data_sources_used", data)


if __name__ == "__main__":
    unittest.main()
