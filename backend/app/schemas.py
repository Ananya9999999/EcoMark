"""Response and request schemas (Part 5)."""

from __future__ import annotations

from pydantic import BaseModel


class ClaimCreated(BaseModel):
    claim_id: str
    status: str


class ClaimSummary(BaseModel):
    claim_id: str
    action_type: str
    status: str
    submitted_at: str
    credits_awarded: float | None = None
    category: str | None = None


class ClaimList(BaseModel):
    claims: list[ClaimSummary]
    total: int


class LocationOut(BaseModel):
    lat: float | None = None
    lng: float | None = None
    radius_m: int | None = None


class DatesOut(BaseModel):
    before: str | None = None
    after: str | None = None


class VerificationOut(BaseModel):
    verified: bool
    confidence: float | None = None
    credits: float | None = None
    category: str | None = None
    evidence: dict = {}


class ClaimDetail(BaseModel):
    claim_id: str
    action_type: str
    method: str
    status: str
    submitted_at: str
    verified_at: str | None = None
    location: LocationOut | None = None
    dates: DatesOut | None = None
    file_name: str | None = None
    verification: VerificationOut | None = None
    tx_hash: str | None = None
    error: str | None = None


class BalanceOut(BaseModel):
    balances: dict[str, float]
    total: float


class UserOut(BaseModel):
    id: str
    name: str
    wallet_address: str


class UserList(BaseModel):
    users: list[UserOut]


class SwapCreate(BaseModel):
    counterparty_id: str
    offer_category: str
    offer_amount: float
    want_category: str
    want_amount: float


class SwapCreated(BaseModel):
    swap_id: str
    status: str


class SwapParty(BaseModel):
    id: str
    name: str


class SwapSide(BaseModel):
    category: str
    amount: float


class SwapOut(BaseModel):
    swap_id: str
    counterparty: SwapParty
    they_offer: SwapSide
    they_want: SwapSide
    status: str
    created_at: str


class SwapList(BaseModel):
    incoming: list[SwapOut]
    outgoing: list[SwapOut]
