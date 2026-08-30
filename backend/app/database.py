from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import DATABASE_URL

# Build the SQLAlchemy connection URL.
# Render's Internal Database URL may use "postgres://" — SQLAlchemy accepts
# "postgresql://" natively, so normalise the scheme once here.
_sa_url = DATABASE_URL
if _sa_url and _sa_url.startswith("postgres://"):
    _sa_url = _sa_url.replace("postgres://", "postgresql://", 1)

# Production PostgreSQL (e.g. Render) requires SSL.
# Append sslmode=require only when connecting to a remote host.
_connect_args = {}
_engine_kwargs = {"pool_pre_ping": True}

if _sa_url and _sa_url.startswith("sqlite"):
    _connect_args["check_same_thread"] = False
else:
    _engine_kwargs["pool_size"] = 10
    _engine_kwargs["max_overflow"] = 20
    if _sa_url and "localhost" not in _sa_url and "127.0.0.1" not in _sa_url:
        if "sslmode" not in _sa_url:
            sep = "&" if "?" in _sa_url else "?"
            _sa_url = f"{_sa_url}{sep}sslmode=require"
        _connect_args["sslmode"] = "require"

engine = create_engine(
    _sa_url,
    connect_args=_connect_args,
    **_engine_kwargs,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
