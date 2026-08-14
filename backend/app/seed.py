"""Seed data for the demo. Re-runnable and idempotent.

Run as:  python -m app.seed
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from app.db import create_db_and_tables, engine
from app.integrations import chain
from app.models import (
    Claim,
    ClaimStatus,
    Swap,
    SwapStatus,
    User,
    Verification,
)

# Deterministic ids make the script idempotent: re-running finds the same rows.
USERS = [
    {"id": "usr_priya001", "name": "Priya", "wallet_address": "0x8f3b2c1d9e4a5f6b7c8d9e0f1a2b3c4d5e6f7a01"},
    {"id": "usr_arjun002", "name": "Arjun", "wallet_address": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a02"},
    {"id": "usr_meera003", "name": "Meera", "wallet_address": "0x9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c03"},
    {"id": "usr_kabir004", "name": "Kabir", "wallet_address": "0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e04"},
]

BALANCES = {
    "usr_priya001": {"land": 12.5, "energy": 3.0, "transport": 1.2},
    "usr_arjun002": {"energy": 8.0, "water": 2.5, "land": 1.5},
    "usr_meera003": {"transport": 6.4, "land": 4.0, "water": 1.0},
    "usr_kabir004": {"water": 5.5, "energy": 2.0},
}


def _ts(days_ago: float) -> str:
    t = datetime.now(timezone.utc) - timedelta(days=days_ago)
    return t.strftime("%Y-%m-%dT%H:%M:%SZ")


def _tx() -> str:
    return "0x" + uuid.uuid4().hex


CLAIMS = [
    # user, id, action, method, status, days_ago, extras
    ("usr_priya001", "clm_seed0001", "tree_planting", "satellite", ClaimStatus.minted, 6,
     {"lat": 12.9716, "lng": 77.5946, "radius_m": 500, "before_date": "2026-01-01",
      "after_date": "2026-07-01", "credits_awarded": 4.5, "category": "land",
      "evidence": {"ndvi_before": 0.31, "ndvi_after": 0.58, "delta": 0.27, "area_hectares": 0.78},
      "confidence": 0.87}),
    ("usr_priya001", "clm_seed0002", "energy_reduction", "ocr", ClaimStatus.minted, 5,
     {"credits_awarded": 2.5, "category": "energy", "confidence": 0.92,
      "evidence": {"vendor": "TNEB", "bill_date": "2026-06-15", "units_kwh": 240,
                   "previous_kwh": 310, "reduction_pct": 22.6}}),
    ("usr_priya001", "clm_seed0003", "commute", "gps", ClaimStatus.minted, 4,
     {"credits_awarded": 1.2, "category": "transport", "confidence": 0.81,
      "evidence": {"distance_km": 86.0, "trips_matched": 19, "mode": "cycle", "co2_saved_kg": 10.3}}),
    ("usr_priya001", "clm_seed0004", "ev_purchase", "ocr", ClaimStatus.rejected, 3,
     {"error": "The document could not be matched to a vehicle registration",
      "confidence": 0.22, "evidence": {}}),
    ("usr_priya001", "clm_seed0005", "solar_install", "ocr", ClaimStatus.mint_failed, 1,
     {"credits_awarded": 3.8, "category": "energy", "confidence": 0.89,
      "error": "Credits could not be issued: chain unavailable",
      "evidence": {"vendor": "SunEdge Solar", "invoice_date": "2026-07-30",
                   "amount_inr": 285000, "model_detected": "5kW rooftop array"}}),
    ("usr_arjun002", "clm_seed0006", "solar_install", "ocr", ClaimStatus.minted, 7,
     {"credits_awarded": 4.2, "category": "energy", "confidence": 0.9,
      "evidence": {"vendor": "Luminous", "invoice_date": "2026-06-02",
                   "amount_inr": 240000, "model_detected": "Atria 3kW"}}),
    ("usr_arjun002", "clm_seed0007", "water_reduction", "ocr", ClaimStatus.minted, 5,
     {"credits_awarded": 2.5, "category": "water", "confidence": 0.85,
      "evidence": {"vendor": "Metro Water", "bill_date": "2026-07-08", "units_kl": 11,
                   "previous_kl": 17, "reduction_pct": 35.3}}),
    ("usr_arjun002", "clm_seed0008", "tree_planting", "satellite", ClaimStatus.verified, 0.02,
     {"lat": 18.5204, "lng": 73.8567, "radius_m": 800, "before_date": "2026-02-01",
      "after_date": "2026-08-01", "credits_awarded": 3.1, "category": "land", "confidence": 0.8,
      "evidence": {"ndvi_before": 0.27, "ndvi_after": 0.49, "delta": 0.22, "area_hectares": 1.1}}),
    ("usr_meera003", "clm_seed0009", "commute", "gps", ClaimStatus.minted, 8,
     {"credits_awarded": 3.4, "category": "transport", "confidence": 0.88,
      "evidence": {"distance_km": 154.2, "trips_matched": 31, "mode": "metro", "co2_saved_kg": 18.5}}),
    ("usr_meera003", "clm_seed0010", "tree_planting", "satellite", ClaimStatus.minted, 6,
     {"lat": 11.4102, "lng": 76.6950, "radius_m": 1200, "before_date": "2026-01-15",
      "after_date": "2026-07-15", "credits_awarded": 4.0, "category": "land", "confidence": 0.91,
      "evidence": {"ndvi_before": 0.33, "ndvi_after": 0.61, "delta": 0.28, "area_hectares": 1.6}}),
    ("usr_kabir004", "clm_seed0011", "water_reduction", "ocr", ClaimStatus.minted, 4,
     {"credits_awarded": 3.0, "category": "water", "confidence": 0.83,
      "evidence": {"vendor": "Metro Water", "bill_date": "2026-07-01", "units_kl": 9,
                   "previous_kl": 15, "reduction_pct": 40.0}}),
    ("usr_kabir004", "clm_seed0012", "energy_reduction", "ocr", ClaimStatus.rejected, 2,
     {"error": "The bill period overlaps a claim that was already credited",
      "confidence": 0.31, "evidence": {}}),
]

SWAPS = [
    # incoming for Priya (the default/first user)
    {"id": "swp_seed01", "initiator_id": "usr_arjun002", "counterparty_id": "usr_priya001",
     "offer_category": "energy", "offer_amount": 2.0, "want_category": "land", "want_amount": 1.5},
    {"id": "swp_seed02", "initiator_id": "usr_meera003", "counterparty_id": "usr_priya001",
     "offer_category": "transport", "offer_amount": 1.0, "want_category": "energy", "want_amount": 1.0},
]


def seed() -> None:
    create_db_and_tables()
    with Session(engine) as session:
        for i, u in enumerate(USERS):
            if session.get(User, u["id"]) is None:
                # Staggered so "first seeded user" (the default current user)
                # is deterministically Priya.
                session.add(User(**u, created_at=_ts(30 - i)))
        session.commit()

        for user_id, claim_id, action, method, status, days_ago, extra in CLAIMS:
            if session.get(Claim, claim_id) is not None:
                continue
            evidence = extra.pop("evidence", None)
            confidence = extra.pop("confidence", None)
            claim = Claim(
                id=claim_id,
                user_id=user_id,
                action_type=action,
                method=method,
                status=status,
                submitted_at=_ts(days_ago),
                **{k: v for k, v in extra.items()},
            )
            if status in (ClaimStatus.minted, ClaimStatus.verified,
                          ClaimStatus.rejected, ClaimStatus.mint_failed):
                claim.verified_at = _ts(days_ago - 0.001)
            if status == ClaimStatus.minted:
                claim.tx_hash = _tx()
            session.add(claim)
            if evidence is not None:
                session.add(Verification(
                    claim_id=claim_id,
                    verified=0 if status == ClaimStatus.rejected else 1,
                    confidence=confidence,
                    evidence_json=json.dumps(evidence),
                    error=extra.get("error") if status == ClaimStatus.rejected else None,
                    completed_at=_ts(days_ago - 0.001),
                ))
        session.commit()

        for s in SWAPS:
            if session.get(Swap, s["id"]) is not None:
                continue
            initiator = session.get(User, s["initiator_id"])
            counterparty = session.get(User, s["counterparty_id"])
            # Register on the mock chain so accepting the seeded swap works.
            try:
                chain_id = chain.initiate_swap(
                    from_address=initiator.wallet_address,
                    to_address=counterparty.wallet_address,
                    offer_category=s["offer_category"],
                    offer_amount=s["offer_amount"],
                    want_category=s["want_category"],
                    want_amount=s["want_amount"],
                )
            except Exception:
                chain_id = s["id"]
            session.add(Swap(**{**s, "id": chain_id}, status=SwapStatus.pending,
                             created_at=_ts(0.5)))
        session.commit()

    sync_mock_chain()
    print("Seeded: 4 users, 12 claims, 2 pending swaps, mock balances.")


def sync_mock_chain() -> None:
    """Bring the in-memory mock chain in line with the database.

    The mock chain lives in module-level dicts, so every process starts with
    empty state. The server calls this on startup (mocks only): it mints the
    seed balances and re-registers pending swaps through the public interface,
    updating each swap row to the id the chain assigned.
    """
    with Session(engine) as session:
        users = {u.id: u for u in session.exec(select(User)).all()}

        for user_id, cats in BALANCES.items():
            user = users.get(user_id)
            if user is None:
                continue
            try:
                existing = chain.get_balance(user.wallet_address)
            except Exception:
                return
            for cat, amount in cats.items():
                if existing.get(cat, 0.0) < amount:
                    chain.mint_credit(
                        user.wallet_address, cat, amount - existing.get(cat, 0.0), "seed"
                    )

        pending = session.exec(
            select(Swap).where(Swap.status == SwapStatus.pending)
        ).all()
        for swap in pending:
            initiator = users.get(swap.initiator_id)
            counterparty = users.get(swap.counterparty_id)
            if initiator is None or counterparty is None:
                continue
            already = {
                s.get("swap_id")
                for s in chain.get_pending_swaps(counterparty.wallet_address)
            }
            if swap.id in already:
                continue
            new_id = chain.initiate_swap(
                from_address=initiator.wallet_address,
                to_address=counterparty.wallet_address,
                offer_category=swap.offer_category,
                offer_amount=swap.offer_amount,
                want_category=swap.want_category,
                want_amount=swap.want_amount,
            )
            if new_id != swap.id:
                replacement = Swap(
                    id=new_id,
                    initiator_id=swap.initiator_id,
                    counterparty_id=swap.counterparty_id,
                    offer_category=swap.offer_category,
                    offer_amount=swap.offer_amount,
                    want_category=swap.want_category,
                    want_amount=swap.want_amount,
                    status=SwapStatus.pending,
                    created_at=swap.created_at,
                )
                session.delete(swap)
                session.add(replacement)
        session.commit()


if __name__ == "__main__":
    seed()
