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

# ── PostgreSQL Enum Migration ────────────────────────────────────────
# ALTER TYPE ... ADD VALUE cannot run inside a transaction in PostgreSQL.
# We need an autocommit connection for this specific operation.
# This is safe and idempotent — it only adds values if they don't exist.
_db_url = str(engine.url)
if _db_url.startswith("postgresql"):
    try:
        # Create a separate autocommit engine for enum migration
        from sqlalchemy import create_engine as _create_engine
        _autocommit_engine = _create_engine(_db_url, isolation_level="AUTOCOMMIT")
        with _autocommit_engine.connect() as _conn:
            _conn.execute(
                __import__('sqlalchemy').text(
                    "DO $$ BEGIN "
                    "ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'PRESIDENT'; "
                    "EXCEPTION WHEN duplicate_object THEN NULL; "
                    "END $$;"
                )
            )
            _conn.execute(
                __import__('sqlalchemy').text(
                    "DO $$ BEGIN "
                    "ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'VICE_PRESIDENT'; "
                    "EXCEPTION WHEN duplicate_object THEN NULL; "
                    "END $$;"
                )
            )
            logger.info("PostgreSQL enum migration complete: PRESIDENT, VICE_PRESIDENT added")
        _autocommit_engine.dispose()
    except Exception as e:
        # If enum doesn't exist yet (fresh DB), Base.metadata.create_all will create it
        # with the correct values from the SQLAlchemy model. Log and continue.
        logger.warning(f"Enum migration skipped (may be fresh DB): {e}")

# ── Column Migrations (additive only, safe for all DBs) ─────────────
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
        conn.execute(
            __import__('sqlalchemy').text(
                "ALTER TABLE events ADD COLUMN IF NOT EXISTS category VARCHAR(200)"
            )
        )
        conn.commit()
except Exception:
    pass  # Columns already exist or different DB dialect (SQLite)

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
