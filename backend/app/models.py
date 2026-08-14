"""SQLModel table classes and domain enums.

Enum string values come from Part 2 of the specification and are used verbatim
in the database, the API and the frontend.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlmodel import Field, SQLModel


def now_iso() -> str:
    """Current UTC time as an ISO 8601 string with a Z suffix."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def new_user_id() -> str:
    return f"usr_{uuid.uuid4().hex[:8]}"


def new_claim_id() -> str:
    return f"clm_{uuid.uuid4().hex[:8]}"


def new_verification_id() -> str:
    return f"ver_{uuid.uuid4().hex[:8]}"


def new_swap_id() -> str:
    return f"swp_{uuid.uuid4().hex[:8]}"


class ActionType(str, Enum):
    tree_planting = "tree_planting"
    solar_install = "solar_install"
    ev_purchase = "ev_purchase"
    energy_reduction = "energy_reduction"
    water_reduction = "water_reduction"
    commute = "commute"
    fail_test = "fail_test"  # test-only: mock always rejects it


class VerificationMethod(str, Enum):
    satellite = "satellite"
    ocr = "ocr"
    gps = "gps"


class CreditCategory(str, Enum):
    land = "land"
    energy = "energy"
    water = "water"
    transport = "transport"


class ClaimStatus(str, Enum):
    submitted = "submitted"
    verifying = "verifying"
    verified = "verified"
    rejected = "rejected"
    minting = "minting"
    minted = "minted"
    mint_failed = "mint_failed"


class SwapStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    failed = "failed"


# Which verification method each action type uses (Part 2.1).
ACTION_METHOD: dict[str, str] = {
    ActionType.tree_planting: VerificationMethod.satellite,
    ActionType.solar_install: VerificationMethod.ocr,
    ActionType.ev_purchase: VerificationMethod.ocr,
    ActionType.energy_reduction: VerificationMethod.ocr,
    ActionType.water_reduction: VerificationMethod.ocr,
    ActionType.commute: VerificationMethod.gps,
    ActionType.fail_test: VerificationMethod.ocr,
}

TERMINAL_CLAIM_STATUSES = {
    ClaimStatus.rejected,
    ClaimStatus.minted,
    ClaimStatus.mint_failed,
}


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: str = Field(default_factory=new_user_id, primary_key=True)
    name: str
    wallet_address: str = Field(unique=True)
    created_at: str = Field(default_factory=now_iso)


class Claim(SQLModel, table=True):
    __tablename__ = "claims"

    id: str = Field(default_factory=new_claim_id, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    action_type: str
    method: str
    status: str = Field(default=ClaimStatus.submitted, index=True)
    lat: float | None = None
    lng: float | None = None
    radius_m: int | None = None
    before_date: str | None = None
    after_date: str | None = None
    file_path: str | None = None
    submitted_at: str = Field(default_factory=now_iso)
    verified_at: str | None = None
    credits_awarded: float | None = None
    category: str | None = None
    tx_hash: str | None = None
    error: str | None = None


class Verification(SQLModel, table=True):
    __tablename__ = "verifications"

    id: str = Field(default_factory=new_verification_id, primary_key=True)
    claim_id: str = Field(foreign_key="claims.id")
    verified: int
    confidence: float | None = None
    evidence_json: str | None = None
    error: str | None = None
    completed_at: str = Field(default_factory=now_iso)


class Swap(SQLModel, table=True):
    __tablename__ = "swaps"

    id: str = Field(default_factory=new_swap_id, primary_key=True)
    initiator_id: str = Field(foreign_key="users.id")
    counterparty_id: str = Field(foreign_key="users.id")
    offer_category: str
    offer_amount: float
    want_category: str
    want_amount: float
    status: str = Field(default=SwapStatus.pending)
    tx_hash: str | None = None
    created_at: str = Field(default_factory=now_iso)
