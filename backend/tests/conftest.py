"""Shared fixtures.

Tests run against a temporary SQLite database and the mock integrations,
with the mock's 3-second sleep patched out so the suite stays fast — the
sleep exists to exercise the UI, not the unit tests.
"""

from __future__ import annotations

import os
import uuid

import pytest

os.environ["USE_MOCKS"] = "true"

from sqlmodel import Session, SQLModel, create_engine

import app.db as app_db
from app.models import User


@pytest.fixture()
def engine(tmp_path, monkeypatch):
    test_engine = create_engine(
        f"sqlite:///{(tmp_path / 'test.db').as_posix()}",
        connect_args={"check_same_thread": False},
    )
    # Point every module-level engine reference at the test database.
    monkeypatch.setattr(app_db, "engine", test_engine)
    import app.services.claims as claims_service
    import app.services.swaps as swaps_service
    monkeypatch.setattr(claims_service, "engine", test_engine)
    monkeypatch.setattr(swaps_service, "engine", test_engine)
    import app.seed as seed_module
    monkeypatch.setattr(seed_module, "engine", test_engine)

    from app import models  # noqa: F401
    SQLModel.metadata.create_all(test_engine)
    return test_engine


@pytest.fixture()
def session(engine):
    with Session(engine) as s:
        yield s


@pytest.fixture()
def no_sleep(monkeypatch):
    import app.integrations.mock_verification as mv
    monkeypatch.setattr(mv.time, "sleep", lambda *_: None)


@pytest.fixture(autouse=True)
def no_simulated_chain_failures(monkeypatch):
    """Turn off the id-ending-in-9 failure so unrelated tests are not flaky.

    The tests that care about that behaviour re-enable it explicitly.
    """
    import app.integrations.mock_chain as mc
    monkeypatch.setattr(mc, "SIMULATE_FAILURES", False)
    monkeypatch.setattr(mc, "_failed_once", set())


@pytest.fixture()
def fresh_chain(monkeypatch):
    """Isolate the mock chain's module-level state per test."""
    import app.integrations.mock_chain as mc
    monkeypatch.setattr(mc, "_balances", {})
    monkeypatch.setattr(mc, "_swaps", {})
    return mc


@pytest.fixture()
def user(session):
    u = User(name="Test", wallet_address="0x" + uuid.uuid4().hex[:40])
    session.add(u)
    session.commit()
    session.refresh(u)
    return u


@pytest.fixture()
def client(engine, no_sleep, fresh_chain):
    from fastapi.testclient import TestClient

    from app.main import app
    from app.db import get_session
    from app.routes.balance import invalidate_balance_cache

    def _get_session():
        with Session(engine) as s:
            yield s

    app.dependency_overrides[get_session] = _get_session
    invalidate_balance_cache()
    with TestClient(app) as c:
        # Startup seeds profiles only. Balance and swap behaviour needs
        # holdings to exist, so mint the demo balances onto the mock chain.
        from app.seed import sync_mock_chain

        sync_mock_chain()
        invalidate_balance_cache()
        yield c
    app.dependency_overrides.clear()
    invalidate_balance_cache()
