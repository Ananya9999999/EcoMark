"""Application configuration.

Every path is derived from this file's location so the app behaves the same
whether it is started from ``backend\\`` or from the repository root.
"""

from __future__ import annotations

import os
from pathlib import Path

# backend/app/config.py -> backend/
BASE_DIR = Path(__file__).resolve().parent.parent

DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
DB_PATH = DATA_DIR / "app.db"

DATABASE_URL = f"sqlite:///{DB_PATH.as_posix()}"

# The frontend dev server.
CORS_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]

# Upload constraints (Part 5.1).
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_UPLOAD_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf", ".gpx", ".csv"}

# Balance cache window in seconds (Part 4.5).
BALANCE_CACHE_SECONDS = 5


def use_mocks() -> bool:
    """Whether the mock integrations are active. Defaults to true."""
    return os.getenv("USE_MOCKS", "true").lower() == "true"


def ensure_directories() -> None:
    """Create the data directories if they are missing."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
