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

# SQLite by default: no server, no credentials, no network — the safest
# thing to demo. Point DATABASE_URL at Postgres or Supabase to switch;
# SQLModel speaks both and no application code changes.
#   postgresql+psycopg://user:pass@host:5432/dbname
#   (Supabase gives you exactly this string under Project settings → Database)
DATABASE_URL = os.getenv("DATABASE_URL") or f"sqlite:///{DB_PATH.as_posix()}"


def is_sqlite() -> bool:
    return DATABASE_URL.startswith("sqlite")

# The frontend dev server.
CORS_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]

# Upload constraints (Part 5.1).
MAX_UPLOAD_BYTES = 10 * 1024 * 1024

# Accepted extensions differ by method (spec §6): OCR reads documents,
# GPS reads trip logs.
ALLOWED_BY_METHOD = {
    "ocr": {".jpg", ".jpeg", ".png", ".pdf"},
    "gps": {".gpx", ".json", ".csv"},
}
ALLOWED_UPLOAD_EXTENSIONS = set().union(*ALLOWED_BY_METHOD.values())

# Claim radius bounds in metres (spec §6).
MIN_RADIUS_M = 50
MAX_RADIUS_M = 5000

# Balance cache window in seconds (Part 4.5).
BALANCE_CACHE_SECONDS = 5


def use_mocks() -> bool:
    """Whether the mock integrations are active. Defaults to true."""
    return os.getenv("USE_MOCKS", "true").lower() == "true"


def ensure_directories() -> None:
    """Create the data directories if they are missing."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
