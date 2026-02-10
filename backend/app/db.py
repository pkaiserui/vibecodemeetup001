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

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _migrate_add_zip_code()
    _migrate_add_profile_location_zip()


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


def get_session():
    with Session(engine) as session:
        yield session
