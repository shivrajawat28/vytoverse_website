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
# We use a raw psycopg2 connection with autocommit for the enum migration.
# This runs BEFORE any application queries that use the enum.
_db_url = str(engine.url)
if _db_url.startswith("postgresql"):
    try:
        import psycopg2
        # Parse connection string and create a raw autocommit connection
        conn = psycopg2.connect(_db_url)
        conn.autocommit = True
        cur = conn.cursor()

        # First, discover the actual enum type name by querying system catalogs
        cur.execute("""
            SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder)
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            JOIN pg_attribute a ON a.atttypid = t.oid
            JOIN pg_class c ON c.oid = a.attrelid
            WHERE c.relname = 'users' AND a.attname = 'role'
            GROUP BY t.typname
        """)
        row = cur.fetchone()
        if row:
            enum_name = row[0]
            existing_values = row[1] or []
            logger.info(f"PostgreSQL enum '{enum_name}' has values: {existing_values}")

            # Add PRESIDENT if missing
            if 'PRESIDENT' not in existing_values:
                cur.execute(f"ALTER TYPE {enum_name} ADD VALUE IF NOT EXISTS 'PRESIDENT'")
                logger.info(f"Added PRESIDENT to enum '{enum_name}'")

            # Add VICE_PRESIDENT if missing
            if 'VICE_PRESIDENT' not in existing_values:
                cur.execute(f"ALTER TYPE {enum_name} ADD VALUE IF NOT EXISTS 'VICE_PRESIDENT'")
                logger.info(f"Added VICE_PRESIDENT to enum '{enum_name}'")

            # Verify final state
            cur.execute("""
                SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder)
                FROM pg_type t
                JOIN pg_enum e ON t.oid = e.enumtypid
                WHERE t.typname = %s
            """, (enum_name,))
            final_row = cur.fetchone()
            final_values = final_row[0] if final_row and final_row[0] else []
            logger.info(f"Enum '{enum_name}' final values: {final_values}")
        else:
            logger.info("No existing enum found — Base.metadata.create_all will create it with all values")

        cur.close()
        conn.close()
    except ImportError:
        logger.warning("psycopg2 not available — skipping PostgreSQL enum migration")
    except Exception as e:
        logger.warning(f"PostgreSQL enum migration skipped: {e}")

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
