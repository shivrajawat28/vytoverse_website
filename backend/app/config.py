import os
from dotenv import load_dotenv

load_dotenv()

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/vytoverse")

# JWT — the hardcoded default is ONLY for local development
JWT_SECRET = os.getenv("JWT_SECRET", "dev-only-insecure-secret-do-not-use-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# CORS
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# Uploads
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")

# Server
PORT = int(os.getenv("PORT", "8000"))

# Upload limits
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
ALLOWED_DOC_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/zip",
]

# Production storage (optional — configure when cloud storage is ready)
# STORAGE_PROVIDER = os.getenv("STORAGE_PROVIDER", "local")  # "local" or "s3"
# STORAGE_BUCKET = os.getenv("STORAGE_BUCKET", "")
# STORAGE_REGION = os.getenv("STORAGE_REGION", "")
# STORAGE_ACCESS_KEY = os.getenv("STORAGE_ACCESS_KEY", "")
# STORAGE_SECRET_KEY = os.getenv("STORAGE_SECRET_KEY", "")
