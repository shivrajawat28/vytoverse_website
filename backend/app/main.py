import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .config import FRONTEND_URL, UPLOAD_DIR, BACKEND_URL, PORT, DATABASE_URL
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

# ── Helper: normalise a DATABASE_URL for psycopg2 ────────────────────
# Render provides "postgres://..." — psycopg2 expects "postgresql://...".
# We also remove any sslmode query parameter (psycopg2 uses connect kwarg).
def _normalise_for_psycopg2(url: str) -> str:
    if not url:
        return url
    # Fix scheme
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    # Remove sslmode query param (psycopg2 handles it via connect kwargs)
    if "sslmode=" in url:
        # Split on ? or & around sslmode
        if "?" in url:
            base, query = url.split("?", 1)
            params = [p for p in query.split("&") if not p.startswith("sslmode=")]
            url = base if not params else f"{base}?{'&'.join(params)}"
    return url


# ── Database Initialization ──────────────────────────────────────────
# Create tables (safe for fresh production databases — no drops)
Base.metadata.create_all(bind=engine)

# ── PostgreSQL Enum Migration ────────────────────────────────────────
# ALTER TYPE ... ADD VALUE cannot run inside a transaction in PostgreSQL.
# We use a raw psycopg2 connection with autocommit for the enum migration.
# This runs BEFORE any application queries that use the enum.
_is_prod = DATABASE_URL and "localhost" not in DATABASE_URL and "127.0.0.1" not in DATABASE_URL

if DATABASE_URL and DATABASE_URL.startswith("postgresql"):
    try:
        import psycopg2

        _psycopg_url = _normalise_for_psycopg2(DATABASE_URL)
        logger.info(f"Connecting to PostgreSQL for enum migration (host extracted from URL)")

        conn = psycopg2.connect(_psycopg_url)
        conn.autocommit = True
        cur = conn.cursor()

        # Discover the actual enum type name by querying system catalogs
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
        logger.info("PostgreSQL enum migration completed successfully")
    except ImportError:
        msg = "psycopg2 not available — cannot run PostgreSQL enum migration"
        if _is_prod:
            logger.error(msg)
            raise RuntimeError(msg)
        else:
            logger.warning(msg)
    except Exception as e:
        msg = f"PostgreSQL enum migration failed: {e}"
        if _is_prod:
            # In production, a broken DB means the service cannot function.
            # Fail fast instead of serving traffic with a broken schema.
            logger.error(msg)
            raise RuntimeError(msg)
        else:
            logger.warning(f"{msg} (continuing in dev mode)")

# ── Production Admin Bootstrap ──────────────────────────────────────
# If INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD are set, create or
# verify the admin account exists. This is idempotent and safe.
_initial_admin_email = os.getenv("INITIAL_ADMIN_EMAIL")
_initial_admin_password = os.getenv("INITIAL_ADMIN_PASSWORD")
if _initial_admin_email and _initial_admin_password:
    try:
        from .models.user import User, UserRole, ADMIN_LEVEL_ROLES
        from .auth.password import hash_password
        from .database import SessionLocal

        _db = SessionLocal()
        try:
            _existing = _db.query(User).filter(User.email == _initial_admin_email).first()
            if not _existing:
                _new_admin = User(
                    name="Admin",
                    email=_initial_admin_email,
                    password_hash=hash_password(_initial_admin_password),
                    role=UserRole.ADMIN,
                )
                _db.add(_new_admin)
                _db.commit()
                logger.info(f"Created initial admin account: {_initial_admin_email}")
            elif _existing.role not in ADMIN_LEVEL_ROLES:
                _existing.role = UserRole.ADMIN
                _db.commit()
                logger.info(f"Promoted existing user to admin: {_initial_admin_email}")
            else:
                logger.info(f"Initial admin account already exists: {_initial_admin_email}")
        finally:
            _db.close()
    except Exception as e:
        logger.warning(f"Initial admin bootstrap failed: {e}")

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
