"""Database engine and session helpers."""

from __future__ import annotations

from collections.abc import Iterator

from sqlmodel import Session, SQLModel, create_engine

from app.config import DATABASE_URL, ensure_directories

ensure_directories()

# check_same_thread=False because background tasks run on a worker thread.
engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)


def create_db_and_tables() -> None:
    """Create every table declared on SQLModel's metadata."""
    # Importing models registers them on SQLModel.metadata before create_all.
    from app import models  # noqa: F401

    ensure_directories()
    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    """FastAPI dependency yielding a request-scoped session."""
    with Session(engine) as session:
        yield session
