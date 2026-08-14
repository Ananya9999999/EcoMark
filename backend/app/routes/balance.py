"""Balance endpoint (Part 5.5).

Balances are never stored locally — the chain is the source of truth (4.5).
A 5-second in-memory cache keeps polling cheap.
"""

from __future__ import annotations

import time

from fastapi import APIRouter, Depends, HTTPException

from app.config import BALANCE_CACHE_SECONDS
from app.deps import get_current_user
from app.integrations import chain
from app.models import CreditCategory, User
from app.schemas import BalanceOut

router = APIRouter(prefix="/api/balance", tags=["balance"])

# address -> (fetched_at, balances)
_cache: dict[str, tuple[float, dict[str, float]]] = {}


def invalidate_balance_cache(address: str | None = None) -> None:
    """Drop cached balances so the next read reflects a mint or swap."""
    if address is None:
        _cache.clear()
    else:
        _cache.pop(address, None)


@router.get("", response_model=BalanceOut)
def get_balance(user: User = Depends(get_current_user)) -> BalanceOut:
    address = user.wallet_address
    cached = _cache.get(address)
    if cached and time.monotonic() - cached[0] < BALANCE_CACHE_SECONDS:
        raw = cached[1]
    else:
        try:
            raw = chain.get_balance(address) or {}
        except Exception:
            raise HTTPException(status_code=503, detail="Balance is temporarily unavailable")
        _cache[address] = (time.monotonic(), raw)

    balances = {c.value: round(float(raw.get(c.value, 0.0)), 4) for c in CreditCategory}
    total = round(sum(balances.values()), 4)
    return BalanceOut(balances=balances, total=total)
