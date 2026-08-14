"""Claim lifecycle orchestration.

``process_claim`` follows Part 6.2 of the specification exactly. The absolute
rules (6.3):

1. A claim never remains in a non-terminal state after the task ends.
2. verify_claim and mint_credit are always wrapped in try/except.
3. mint_failed is recoverable — retry re-runs the minting block alone.
4. Neither external call happens inside a request handler.
5. On retry success, the error field is cleared.
"""

from __future__ import annotations

import json

from sqlmodel import Session

from app.db import engine
from app.integrations import chain, verification
from app.models import Claim, ClaimStatus, User, Verification, now_iso


def load_claim(claim_id: str) -> Claim | None:
    with Session(engine) as session:
        return session.get(Claim, claim_id)


def update_claim(claim_id: str, **fields) -> None:
    with Session(engine) as session:
        claim = session.get(Claim, claim_id)
        if claim is None:
            return
        for key, value in fields.items():
            setattr(claim, key, value)
        session.add(claim)
        session.commit()


def get_wallet_address(user_id: str) -> str:
    with Session(engine) as session:
        user = session.get(User, user_id)
        if user is None:
            raise ValueError(f"Unknown user {user_id}")
        return user.wallet_address


def build_claim_dict(claim: Claim) -> dict:
    """The input shape verify_claim expects (Part 3.1)."""
    return {
        "claim_id": claim.id,
        "action_type": claim.action_type,
        "method": claim.method,
        "lat": claim.lat,
        "lng": claim.lng,
        "radius_m": claim.radius_m,
        "before_date": claim.before_date,
        "after_date": claim.after_date,
        "file_path": claim.file_path,
    }


def save_verification_row(claim_id: str, result: dict) -> None:
    with Session(engine) as session:
        row = Verification(
            claim_id=claim_id,
            verified=1 if result.get("verified") else 0,
            confidence=result.get("confidence"),
            evidence_json=json.dumps(result.get("evidence") or {}),
            error=result.get("error"),
        )
        session.add(row)
        session.commit()


def now() -> str:
    return now_iso()


def process_claim(claim_id: str) -> None:
    claim = load_claim(claim_id)
    if claim is None:
        return

    # --- verification ---
    try:
        result = verification.verify_claim(build_claim_dict(claim))
    except Exception as exc:
        update_claim(claim_id,
                     status="rejected",
                     error=f"Verification could not be completed: {exc}",
                     verified_at=now())
        return

    save_verification_row(claim_id, result)

    if not result.get("verified"):
        update_claim(claim_id,
                     status="rejected",
                     error=result.get("error") or "The claim could not be verified",
                     verified_at=now())
        return

    update_claim(claim_id,
                 status="verified",
                 credits_awarded=result["credits"],
                 category=result["category"],
                 verified_at=now())

    # --- minting ---
    update_claim(claim_id, status="minting")

    try:
        tx = chain.mint_credit(
            user_address=get_wallet_address(claim.user_id),
            category=result["category"],
            amount=result["credits"],
            claim_id=claim_id,
        )
    except Exception as exc:
        update_claim(claim_id,
                     status="mint_failed",
                     error=f"Credits could not be issued: {exc}")
        return

    update_claim(claim_id, status="minted", tx_hash=tx, error=None)
    _invalidate_balance(claim.user_id)


def _invalidate_balance(user_id: str) -> None:
    """Drop the cached balance so the dashboard sees a mint promptly."""
    try:
        from app.routes.balance import invalidate_balance_cache

        invalidate_balance_cache(get_wallet_address(user_id))
    except Exception:
        pass  # cache invalidation is best-effort; the TTL self-heals


def retry_mint(claim_id: str) -> None:
    """Re-run the minting block alone — never verification (rule 6.3.3).

    Valid only from mint_failed; the route enforces that before scheduling.
    """
    claim = load_claim(claim_id)
    if claim is None:
        return
    if claim.credits_awarded is None or claim.category is None:
        # Should be impossible from mint_failed; end in a terminal state anyway.
        update_claim(claim_id,
                     status=ClaimStatus.mint_failed,
                     error="Credits could not be issued: verification result is missing")
        return

    try:
        tx = chain.mint_credit(
            user_address=get_wallet_address(claim.user_id),
            category=claim.category,
            amount=claim.credits_awarded,
            claim_id=claim_id,
        )
    except Exception as exc:
        update_claim(claim_id,
                     status="mint_failed",
                     error=f"Credits could not be issued: {exc}")
        return

    update_claim(claim_id, status="minted", tx_hash=tx, error=None)
    _invalidate_balance(claim.user_id)
