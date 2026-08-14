"""Database engine and session helpers."""

from __future__ import annotations

from collections.abc import Iterator

from sqlmodel import Session, SQLModel, create_engine

from app.config import DATABASE_URL, ensure_directories, is_sqlite

ensure_directories()

# check_same_thread is a SQLite-only argument; background tasks run on a
# worker thread, so it has to be off. Server databases need pool_pre_ping
# instead, to survive connections dropped while idle.
if is_sqlite():
    engine = create_engine(
        DATABASE_URL,
        echo=False,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)


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
