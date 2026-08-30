"""
Test suite for Supabase Storage integration and profile image upload flow.
"""

import os
import io
import json
import unittest
from unittest.mock import patch, MagicMock
import urllib.error

# Ensure test DB is SQLite
os.environ["DATABASE_URL"] = "sqlite:///./test_supabase.db"
os.environ["JWT_SECRET"] = "test-secret-key-12345"

from app.database import Base, engine, SessionLocal
from app.models.user import User, UserRole
from app.auth.password import hash_password
from app.auth.jwt import create_access_token
from app.storage import (
    is_supabase_configured,
    get_storage_provider,
    get_supabase_bucket,
    upload_file,
    get_public_url,
    _ensure_supabase_bucket,
)
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


class TestSupabaseStorage(unittest.TestCase):

    def setUp(self):
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        self.db = SessionLocal()

        # Seed test user
        self.user = User(
            name="Supabase Test User",
            email="supatest@vytoverse.com",
            password_hash=hash_password("password123"),
            role=UserRole.USER,
            team_membership=1,
            team_role="Member",
        )
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

        self.token = create_access_token({"user_id": self.user.id, "role": self.user.role.value})
        self.auth_headers = {"Authorization": f"Bearer {self.token}"}

    def tearDown(self):
        self.db.close()

    def test_01_configuration_helpers(self):
        """Verify configuration helpers with and without env vars."""
        with patch.dict(os.environ, {"SUPABASE_URL": "", "SUPABASE_SERVICE_ROLE_KEY": ""}, clear=False):
            self.assertFalse(is_supabase_configured())

        with patch.dict(os.environ, {
            "SUPABASE_URL": "https://testproject.supabase.co",
            "SUPABASE_SERVICE_ROLE_KEY": "dummy-service-role-key",
            "SUPABASE_STORAGE_BUCKET": "my-bucket",
        }, clear=False):
            self.assertTrue(is_supabase_configured())
            self.assertEqual(get_storage_provider(), "supabase")
            self.assertEqual(get_supabase_bucket(), "my-bucket")

    @patch("urllib.request.urlopen")
    def test_02_upload_supabase_file_success(self, mock_urlopen):
        """Verify upload_file uploads to Supabase REST endpoint with proper headers and upsert."""
        # Mock 200 response from Supabase
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = json.dumps({"Key": "my-bucket/profiles/profile_1.jpg"}).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_response

        with patch.dict(os.environ, {
            "SUPABASE_URL": "https://testproject.supabase.co",
            "SUPABASE_SERVICE_ROLE_KEY": "secret-service-role-key",
            "SUPABASE_STORAGE_BUCKET": "vytoverse-uploads",
        }, clear=False):
            test_image_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
            public_url = upload_file(test_image_bytes, "profiles/profile_1.png", "image/png")

            expected_url = "https://testproject.supabase.co/storage/v1/object/public/vytoverse-uploads/profiles/profile_1.png"
            self.assertEqual(public_url, expected_url)

            # Verify request headers and URL
            req = mock_urlopen.call_args[0][0]
            self.assertEqual(req.get_method(), "POST")
            self.assertEqual(req.full_url, "https://testproject.supabase.co/storage/v1/object/vytoverse-uploads/profiles/profile_1.png")
            self.assertEqual(req.headers.get("Authorization"), "Bearer secret-service-role-key")
            self.assertEqual(req.headers.get("Apikey"), "secret-service-role-key")
            self.assertEqual(req.headers.get("X-upsert"), "true")
            self.assertEqual(req.headers.get("Content-type"), "image/png")

    @patch("urllib.request.urlopen")
    def test_03_profile_image_upload_endpoint(self, mock_urlopen):
        """Test POST /users/me/profile-image with Supabase configured."""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = b'{"Key":"created"}'
        mock_urlopen.return_value.__enter__.return_value = mock_response

        with patch.dict(os.environ, {
            "SUPABASE_URL": "https://xyz.supabase.co",
            "SUPABASE_SERVICE_ROLE_KEY": "test-key-abc",
            "SUPABASE_STORAGE_BUCKET": "vytoverse-uploads",
        }, clear=False):
            file_data = io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"A" * 100)
            response = client.post(
                "/users/me/profile-image",
                headers=self.auth_headers,
                files={"file": ("avatar.jpg", file_data, "image/jpeg")},
            )
            self.assertEqual(response.status_code, 200, response.text)
            data = response.json()

            expected_url = f"https://xyz.supabase.co/storage/v1/object/public/vytoverse-uploads/profiles/profile_{self.user.id}.jpg"
            self.assertEqual(data["profile_image"], expected_url)

            # Verify saved in database
            self.db.expire_all()
            db_user = self.db.query(User).filter(User.id == self.user.id).first()
            self.assertEqual(db_user.profile_image, expected_url)

    def test_04_render_without_supabase_fails_clearly(self):
        """Verify that on Render, uploads fail with HTTP 500 naming missing variables rather than saving to ephemeral disk."""
        with patch.dict(os.environ, {
            "RENDER": "true",
            "SUPABASE_URL": "",
            "SUPABASE_SERVICE_ROLE_KEY": "",
            "STORAGE_PROVIDER": "supabase",
        }, clear=False):
            file_data = io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"A" * 100)
            response = client.post(
                "/users/me/profile-image",
                headers=self.auth_headers,
                files={"file": ("avatar.jpg", file_data, "image/jpeg")},
            )
            self.assertEqual(response.status_code, 500)
            detail = response.json()["detail"]
            self.assertIn("SUPABASE_URL", detail)
            self.assertIn("SUPABASE_SERVICE_ROLE_KEY", detail)

    def test_05_health_endpoint_safe_diagnostics(self):
        """Verify /health returns safe boolean flags and no secrets."""
        with patch.dict(os.environ, {
            "SUPABASE_URL": "https://xyz.supabase.co",
            "SUPABASE_SERVICE_ROLE_KEY": "super-secret-service-role-key-xyz",
            "SUPABASE_STORAGE_BUCKET": "vytoverse-uploads",
        }, clear=False):
            response = client.get("/health")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["status"], "healthy")
            storage_info = data["storage"]
            self.assertEqual(storage_info["provider"], "supabase")
            self.assertTrue(storage_info["supabase_storage_configured"])
            self.assertTrue(storage_info["has_supabase_url"])
            self.assertTrue(storage_info["has_service_role_key"])
            self.assertEqual(storage_info["bucket"], "vytoverse-uploads")

            # CRITICAL SECURITY CHECK: Ensure secret key is NEVER exposed in the response
            raw_text = response.text
            self.assertNotIn("super-secret-service-role-key-xyz", raw_text)


if __name__ == "__main__":
    unittest.main()
