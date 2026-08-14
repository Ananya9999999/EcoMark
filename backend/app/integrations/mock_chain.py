"""Mock of the blockchain group's module.

Stub only — real token logic is owned by another group and arrives later as
``chain.py``. In-memory dicts fake the contract in Part 3.2. No persistence.
"""

from __future__ import annotations

import os
import uuid

# Whether to simulate the occasional ledger failure (spec §7.4). On by
# default so mint_failed and its retry are exercisable; set
# MOCK_CHAIN_FAILURES=false to guarantee a clean run during a live demo.
SIMULATE_FAILURES = os.getenv("MOCK_CHAIN_FAILURES", "true").lower() == "true"

# address -> {category: amount}
_balances: dict[str, dict[str, float]] = {}

# swap_id -> swap dict
_swaps: dict[str, dict] = {}

# claim ids whose simulated failure has already been served once
_failed_once: set[str] = set()


def _fake_hash() -> str:
    return "0x" + uuid.uuid4().hex


def mint_credit(user_address: str, category: str, amount: float, claim_id: str) -> str:
    """Mints `amount` credits of `category` to `user_address`.

    Deterministic failure path (spec §7.4): a claim id ending in "9" fails
    the first time, so mint_failed is demonstrable on demand — and succeeds
    on retry, so the recovery path is demonstrable too.
    """
    if (
        SIMULATE_FAILURES
        and claim_id
        and claim_id.rstrip().endswith("9")
        and claim_id not in _failed_once
    ):
        _failed_once.add(claim_id)
        raise RuntimeError("ledger rejected the transaction (simulated)")
    account = _balances.setdefault(user_address, {})
    account[category] = round(account.get(category, 0.0) + amount, 4)
    return _fake_hash()


def get_balance(user_address: str) -> dict:
    """Returns the balance dict for the address, or {} if it has none."""
    return dict(_balances.get(user_address, {}))


def initiate_swap(
    from_address: str,
    to_address: str,
    offer_category: str,
    offer_amount: float,
    want_category: str,
    want_amount: float,
) -> str:
    """Creates a pending swap and returns an 8-character swap id."""
    swap_id = f"swp_{uuid.uuid4().hex[:8]}"
    _swaps[swap_id] = {
        "swap_id": swap_id,
        "from_address": from_address,
        "to_address": to_address,
        "offer_category": offer_category,
        "offer_amount": offer_amount,
        "want_category": want_category,
        "want_amount": want_amount,
        "status": "pending",
    }
    return swap_id


def accept_swap(swap_id: str, accepter_address: str) -> str:
    """Executes the swap atomically. Raises on insufficient balance."""
    swap = _swaps.get(swap_id)
    if swap is None:
        raise ValueError(f"Unknown swap {swap_id}")
    if swap["status"] != "pending":
        raise ValueError(f"Swap {swap_id} is not pending")

    initiator = swap["from_address"]
    accepter = accepter_address

    initiator_acct = _balances.setdefault(initiator, {})
    accepter_acct = _balances.setdefault(accepter, {})

    offer_cat, offer_amt = swap["offer_category"], swap["offer_amount"]
    want_cat, want_amt = swap["want_category"], swap["want_amount"]

    if initiator_acct.get(offer_cat, 0.0) < offer_amt:
        raise ValueError("Initiator has insufficient balance")
    if accepter_acct.get(want_cat, 0.0) < want_amt:
        raise ValueError("Accepter has insufficient balance")

    # Move offered credits initiator -> accepter, wanted credits accepter -> initiator.
    initiator_acct[offer_cat] = round(initiator_acct[offer_cat] - offer_amt, 4)
    accepter_acct[offer_cat] = round(accepter_acct.get(offer_cat, 0.0) + offer_amt, 4)
    accepter_acct[want_cat] = round(accepter_acct[want_cat] - want_amt, 4)
    initiator_acct[want_cat] = round(initiator_acct.get(want_cat, 0.0) + want_amt, 4)

    swap["status"] = "accepted"
    return _fake_hash()


def get_pending_swaps(user_address: str) -> list:
    """Swaps still pending that are addressed to this user."""
    return [
        dict(s)
        for s in _swaps.values()
        if s["status"] == "pending" and s["to_address"] == user_address
    ]
