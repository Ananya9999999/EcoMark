"""Placeholder for the real chain module.

The blockchain group delivers this file (Part 10.2). Until it arrives,
running with USE_MOCKS=false fails loudly rather than silently doing nothing.
Never implement token or web3 logic here — it is out of scope (Part 0.3).
"""

from __future__ import annotations

_MESSAGE = (
    "The real chain module has not been delivered yet. "
    "Set USE_MOCKS=true to run against the mock."
)


def mint_credit(user_address: str, category: str, amount: float, claim_id: str) -> str:
    raise NotImplementedError(_MESSAGE)


def get_balance(user_address: str) -> dict:
    raise NotImplementedError(_MESSAGE)


def initiate_swap(
    from_address: str,
    to_address: str,
    offer_category: str,
    offer_amount: float,
    want_category: str,
    want_amount: float,
) -> str:
    raise NotImplementedError(_MESSAGE)


def accept_swap(swap_id: str, accepter_address: str) -> str:
    raise NotImplementedError(_MESSAGE)


def get_pending_swaps(user_address: str) -> list:
    raise NotImplementedError(_MESSAGE)
