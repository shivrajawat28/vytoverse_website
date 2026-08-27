import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .config import FRONTEND_URL, UPLOAD_DIR, BACKEND_URL, PORT
from .database import engine, Base
from .routes import (
    auth_router,
    users_router,
    events_router,
    library_router,
    admin_router,
    stats_router,
    team_router,
    tasks_router,
    posters_router,
    important_links_router,
)

logger = logging.getLogger("vytoverse")

# ── Database Initialization ──────────────────────────────────────────
# Create tables (safe for fresh production databases — no drops)
Base.metadata.create_all(bind=engine)

# Add columns if they don't exist (lightweight migration for new fields)
try:
    with engine.connect() as conn:
        conn.execute(
            __import__('sqlalchemy').text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS team_membership INTEGER DEFAULT 0 NOT NULL"
            )
        )
        conn.execute(
            __import__('sqlalchemy').text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS team_role VARCHAR(100)"
            )
        )
        conn.execute(
            __import__('sqlalchemy').text(
                "ALTER TABLE events ADD COLUMN IF NOT EXISTS poster_url VARCHAR(500)"
            )
        )
        conn.execute(
            __import__('sqlalchemy').text(
                "ALTER TABLE events ADD COLUMN IF NOT EXISTS invitation_url VARCHAR(500)"
            )
        )
        conn.commit()
except Exception:
    pass  # Columns already exist or different DB dialect

# ── FastAPI App ──────────────────────────────────────────────────────
app = FastAPI(
    title="VytoVerse API",
    description="Backend API for VytoVerse - College Technology Club Platform",
    version="1.0.0",
)

# ── CORS ─────────────────────────────────────────────────────────────
# Build allowed origins list from environment
allowed_origins = [FRONTEND_URL]

# Always allow localhost origins for local development
_dev_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]
for origin in _dev_origins:
    if origin not in allowed_origins:
        allowed_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static Files (uploads) ──────────────────────────────────────────
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ── Routes ───────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(events_router)
app.include_router(library_router)
app.include_router(admin_router)
app.include_router(stats_router)
app.include_router(team_router)
app.include_router(tasks_router)
app.include_router(posters_router)
app.include_router(important_links_router)


@app.get("/")
def root():
    return {
        "name": "VytoVerse API",
        "version": "1.0.0",
        "docs": f"{BACKEND_URL}/docs",
    }


@app.get("/health")
def health():
    """Lightweight health check — no auth required."""
    return {"status": "healthy"}
