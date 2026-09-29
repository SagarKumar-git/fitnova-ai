import os
import sys
import unittest
from fastapi.testclient import TestClient

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ["DATABASE_URL"] = "sqlite:///./test_food_database.db"

from app.main import app, seed_food_database
from app.database import engine, Base, SessionLocal
from app.models import Food, User
from app.services.food_importer import import_food_catalog

class TestFoodDatabaseAndCatalog(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        seed_food_database()
        cls.client = TestClient(app)

        # Register test user
        reg_payload = {
            "name": "Catalog QA",
            "email": "catalog_qa@fitnova.ai",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "role": "user"
        }
        res = cls.client.post("/api/auth/register", json=reg_payload)
        assert res.status_code == 201

        login_res = cls.client.post("/api/auth/login", json={
            "email": "catalog_qa@fitnova.ai",
            "password": "Password123!"
        })
        token = login_res.json()["access_token"]
        cls.headers = {"Authorization": f"Bearer {token}"}

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=engine)
        if os.path.exists("test_food_database.db"):
            try:
                os.remove("test_food_database.db")
            except Exception:
                pass

    def test_01_catalog_import_idempotency(self):
        """Verify that importing the master food catalog a second time doesn't duplicate records."""
        db = SessionLocal()
        try:
            initial_count = db.query(Food).count()
            self.assertGreaterEqual(initial_count, 150)

            # Re-run import
            report = import_food_catalog(db)
            self.assertEqual(report["inserted"], 0, "No duplicate records should be inserted on second run")
            self.assertGreater(report["skipped_duplicate"] + report["updated"], 0)

            after_count = db.query(Food).count()
            self.assertEqual(initial_count, after_count, "Database food count must remain identical")
        finally:
            db.close()

    def test_02_regional_and_alias_search(self):
        """Test search by food name, common name, and aliases across regions."""
        # 1. Alias search: 'butter paneer' should match 'Paneer Butter Masala'
        res = self.client.get("/api/foods?query=butter paneer", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        items = res.json()
        self.assertTrue(any("Paneer Butter Masala" in f["name"] for f in items))

        # 2. Regional search: 'litti' should match 'Litti Chokha'
        res = self.client.get("/api/foods?query=litti", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        items = res.json()
        self.assertTrue(any("Litti" in f["name"] for f in items))
        self.assertEqual(items[0]["cuisine"], "Bihari & Jharkhandi")

        # 3. South Indian: 'dosa'
        res = self.client.get("/api/foods?query=dosa", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        items = res.json()
        self.assertTrue(any("Dosa" in f["name"] for f in items))

        # 4. Global cuisine: 'sushi'
        res = self.client.get("/api/foods?query=sushi", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        items = res.json()
        self.assertTrue(any("Sushi" in f["name"] for f in items))

    def test_03_category_and_cuisine_filtering(self):
        """Verify filtering by cuisine, category, and dietary preferences."""
        # Filter by cuisine 'Bihari & Jharkhandi' (pass via params to properly encode &)
        res = self.client.get("/api/foods", params={"cuisine": "Bihari & Jharkhandi"}, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        items = res.json()
        self.assertGreaterEqual(len(items), 3)
        for item in items:
            self.assertEqual(item["cuisine"], "Bihari & Jharkhandi")

        # Filter by cuisine 'Italian'
        res = self.client.get("/api/foods?cuisine=Italian", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        items = res.json()
        self.assertGreaterEqual(len(items), 2)
        for item in items:
            self.assertEqual(item["cuisine"], "Italian")

        # Filter by category 'Breads & Flatbreads' (pass via params to properly encode &)
        res = self.client.get("/api/foods", params={"category": "Breads & Flatbreads"}, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        items = res.json()
        self.assertGreaterEqual(len(items), 5)
        for item in items:
            self.assertEqual(item["category"], "Breads & Flatbreads")

        # Filter vegetarian only
        res = self.client.get("/api/foods?is_vegetarian=true", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        items = res.json()
        self.assertTrue(all(f["is_vegetarian"] is True for f in items))

    def test_04_paginated_search_contract(self):
        """Verify the paginated /api/foods/search endpoint."""
        res = self.client.get("/api/foods/search?limit=10&offset=0", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)
        self.assertIn("total", data)
        self.assertIn("limit", data)
        self.assertIn("offset", data)
        self.assertIn("has_more", data)
        self.assertEqual(len(data["items"]), 10)
        self.assertGreaterEqual(data["total"], 150)
        self.assertTrue(data["has_more"])

        # Next page
        res_p2 = self.client.get("/api/foods/search?limit=10&offset=10", headers=self.headers)
        self.assertEqual(res_p2.status_code, 200)
        data_p2 = res_p2.json()
        self.assertEqual(len(data_p2["items"]), 10)
        self.assertNotEqual(data["items"][0]["food_id"], data_p2["items"][0]["food_id"])

    def test_05_metadata_endpoints(self):
        """Verify /api/foods/categories and /api/foods/cuisines return distinct lists."""
        res_cat = self.client.get("/api/foods/categories", headers=self.headers)
        self.assertEqual(res_cat.status_code, 200)
        categories = res_cat.json()
        self.assertIn("Main Course", categories)
        self.assertIn("Breads & Flatbreads", categories)

        res_cui = self.client.get("/api/foods/cuisines", headers=self.headers)
        self.assertEqual(res_cui.status_code, 200)
        cuisines = res_cui.json()
        self.assertIn("North Indian", cuisines)
        self.assertIn("Bihari & Jharkhandi", cuisines)
        self.assertIn("Italian", cuisines)
        self.assertIn("Japanese", cuisines)

if __name__ == "__main__":
    unittest.main()
