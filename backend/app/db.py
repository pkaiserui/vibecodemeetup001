import os

from dotenv import load_dotenv
from sqlmodel import SQLModel, Session, create_engine

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

if DATABASE_URL.startswith("https://"):
    raise ValueError(
        "DATABASE_URL must be a database connection string (e.g. postgresql://... or sqlite:///...), "
        "not the Supabase API URL. Get the Postgres URL from Supabase: Project Settings → Database → Connection string."
    )

connect_args: dict = {}
engine_kwargs: dict = {"echo": False}

if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    # PostgreSQL connection pool tuning
    engine_kwargs.update(
        pool_size=5,         # Maintain 5 persistent connections
        max_overflow=10,     # Allow up to 10 extra connections under load
        pool_pre_ping=True,  # Verify connections are alive before use (avoids stale-connection errors)
        pool_recycle=300,    # Recycle connections every 5 min to avoid server-side timeouts
    )

engine = create_engine(DATABASE_URL, connect_args=connect_args, **engine_kwargs)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _migrate_add_zip_code()
    _migrate_add_profile_location_zip()
    _migrate_add_project_tools_used()


def _migrate_add_zip_code() -> None:
    """Add zip_code column to event table if missing."""
    from sqlalchemy import text

    with engine.connect() as conn:
        if "postgresql" in (DATABASE_URL or ""):
            conn.execute(text("ALTER TABLE event ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10)"))
        elif "sqlite" in (DATABASE_URL or ""):
            try:
                conn.execute(text("ALTER TABLE event ADD COLUMN zip_code VARCHAR(10)"))
            except Exception:
                pass  # Column may already exist
        conn.commit()


def _migrate_add_profile_location_zip() -> None:
    """Add location_zip column to profile table if missing."""
    from sqlalchemy import text

    with engine.connect() as conn:
        if "postgresql" in (DATABASE_URL or ""):
            conn.execute(text("ALTER TABLE profile ADD COLUMN IF NOT EXISTS location_zip VARCHAR(10)"))
        elif "sqlite" in (DATABASE_URL or ""):
            try:
                conn.execute(text("ALTER TABLE profile ADD COLUMN location_zip VARCHAR(10)"))
            except Exception:
                pass
        conn.commit()


def _migrate_add_project_tools_used() -> None:
    """Add tools_used column to project table if missing (JSON array of tool names)."""
    from sqlalchemy import text

    with engine.connect() as conn:
        if "postgresql" in (DATABASE_URL or ""):
            conn.execute(text("ALTER TABLE project ADD COLUMN IF NOT EXISTS tools_used TEXT"))
        elif "sqlite" in (DATABASE_URL or ""):
            try:
                conn.execute(text("ALTER TABLE project ADD COLUMN tools_used TEXT"))
            except Exception:
                pass
        conn.commit()


def get_session():
    with Session(engine) as session:
        yield session
