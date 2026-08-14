"""Swap orchestration helpers."""

from __future__ import annotations

from sqlmodel import Session

from app.db import engine
from app.integrations import chain
from app.models import Swap, SwapStatus, User


def chain_balance(address: str) -> dict[str, float]:
    """Balance from the chain; categories missing mean 0 (Part 3.2)."""
    raw = chain.get_balance(address) or {}
    return {k: float(v) for k, v in raw.items()}


def execute_accept(swap_id: str, accepter_address: str) -> str:
    """Run the chain call and record the outcome. Raises on chain failure
    after marking the swap failed — the route maps that to a 502."""
    with Session(engine) as session:
        swap = session.get(Swap, swap_id)
        if swap is None:
            raise ValueError("Swap not found")
        try:
            tx = chain.accept_swap(swap_id, accepter_address)
        except Exception:
            swap.status = SwapStatus.failed
            session.add(swap)
            session.commit()
            raise
        swap.status = SwapStatus.accepted
        swap.tx_hash = tx
        session.add(swap)
        session.commit()
        return tx
