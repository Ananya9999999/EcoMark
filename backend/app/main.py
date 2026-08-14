"""FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.db import create_db_and_tables
from app.routes import balance, claims, swaps, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    _seed_if_needed()
    yield


def _seed_if_needed() -> None:
    """Seed an empty database, and re-sync the in-memory mock chain each
    start so seeded balances and pending swaps survive a restart."""
    from sqlmodel import Session, select

    from app.config import use_mocks
    from app.db import engine
    from app.models import User
    from app.seed import seed, sync_mock_chain

    with Session(engine) as session:
        has_users = session.exec(select(User)).first() is not None
    if not has_users:
        seed()
    elif use_mocks():
        sync_mock_chain()


app = FastAPI(title="Digital Carbon Credit Verification", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(claims.router)
app.include_router(balance.router)
app.include_router(users.router)
app.include_router(swaps.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
