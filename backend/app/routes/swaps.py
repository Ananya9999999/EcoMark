"""Swap endpoints (Part 5.7–5.10)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db import get_session
from app.deps import get_current_user
from app.integrations import chain
from app.models import CreditCategory, Swap, SwapStatus, User
from app.routes.balance import invalidate_balance_cache
from app.schemas import (
    SwapCreate,
    SwapCreated,
    SwapList,
    SwapOut,
    SwapParty,
    SwapSide,
)
from app.services.swaps import chain_balance, execute_accept

router = APIRouter(prefix="/api/swaps", tags=["swaps"])

_CATEGORIES = {c.value for c in CreditCategory}


@router.post("", response_model=SwapCreated, status_code=201)
def create_swap(
    body: SwapCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> SwapCreated:
    counterparty = session.get(User, body.counterparty_id)
    if counterparty is None:
        raise HTTPException(status_code=404, detail="User not found")
    if counterparty.id == user.id:
        raise HTTPException(status_code=422, detail="You can't swap with yourself")
    if body.offer_amount <= 0 or body.want_amount <= 0:
        raise HTTPException(status_code=422, detail="Amounts must be greater than zero")
    if body.offer_category not in _CATEGORIES or body.want_category not in _CATEGORIES:
        raise HTTPException(status_code=422, detail="Unknown credit category")

    try:
        balances = chain_balance(user.wallet_address)
    except Exception:
        raise HTTPException(status_code=503, detail="Balance is temporarily unavailable")
    if balances.get(body.offer_category, 0.0) < body.offer_amount:
        raise HTTPException(
            status_code=422,
            detail=f"You don't have enough {body.offer_category} credits",
        )

    try:
        swap_id = chain.initiate_swap(
            from_address=user.wallet_address,
            to_address=counterparty.wallet_address,
            offer_category=body.offer_category,
            offer_amount=body.offer_amount,
            want_category=body.want_category,
            want_amount=body.want_amount,
        )
    except Exception:
        raise HTTPException(status_code=502, detail="The trade could not be created")

    swap = Swap(
        id=swap_id,
        initiator_id=user.id,
        counterparty_id=counterparty.id,
        offer_category=body.offer_category,
        offer_amount=body.offer_amount,
        want_category=body.want_category,
        want_amount=body.want_amount,
        status=SwapStatus.pending,
    )
    session.add(swap)
    session.commit()
    return SwapCreated(swap_id=swap_id, status=SwapStatus.pending)


def _swap_out(swap: Swap, other: User, incoming: bool) -> SwapOut:
    """Shape a swap from the current user's point of view.

    For incoming swaps the initiator offers; for outgoing swaps the current
    user offers, so "they_offer" is what the current user put up.
    """
    return SwapOut(
        swap_id=swap.id,
        counterparty=SwapParty(id=other.id, name=other.name),
        they_offer=SwapSide(category=swap.offer_category, amount=swap.offer_amount),
        they_want=SwapSide(category=swap.want_category, amount=swap.want_amount),
        status=swap.status,
        created_at=swap.created_at,
    )


@router.get("", response_model=SwapList)
def list_swaps(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> SwapList:
    incoming_rows = session.exec(
        select(Swap)
        .where(Swap.counterparty_id == user.id, Swap.status == SwapStatus.pending)
        .order_by(Swap.created_at.desc())
    ).all()
    outgoing_rows = session.exec(
        select(Swap)
        .where(Swap.initiator_id == user.id)
        .order_by(Swap.created_at.desc())
    ).all()

    incoming = []
    for s in incoming_rows:
        other = session.get(User, s.initiator_id)
        if other:
            incoming.append(_swap_out(s, other, incoming=True))
    outgoing = []
    for s in outgoing_rows:
        other = session.get(User, s.counterparty_id)
        if other:
            outgoing.append(_swap_out(s, other, incoming=False))

    return SwapList(incoming=incoming, outgoing=outgoing)


def _owned_pending_swap(swap_id: str, session: Session, user: User) -> Swap:
    swap = session.get(Swap, swap_id)
    if swap is None or swap.status != SwapStatus.pending or swap.counterparty_id != user.id:
        raise HTTPException(status_code=403, detail="This swap isn't yours to accept")
    return swap


@router.post("/{swap_id}/accept", response_model=SwapCreated)
def accept_swap(
    swap_id: str,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> SwapCreated:
    swap = _owned_pending_swap(swap_id, session, user)

    try:
        balances = chain_balance(user.wallet_address)
    except Exception:
        raise HTTPException(status_code=503, detail="Balance is temporarily unavailable")
    if balances.get(swap.want_category, 0.0) < swap.want_amount:
        raise HTTPException(
            status_code=422,
            detail=f"You don't have enough {swap.want_category} credits",
        )

    initiator = session.get(User, swap.initiator_id)
    try:
        execute_accept(swap_id, user.wallet_address)
    except Exception:
        raise HTTPException(status_code=502, detail="The trade could not be completed")

    invalidate_balance_cache(user.wallet_address)
    if initiator:
        invalidate_balance_cache(initiator.wallet_address)
    return SwapCreated(swap_id=swap_id, status=SwapStatus.accepted)


@router.post("/{swap_id}/reject", response_model=SwapCreated)
def reject_swap(
    swap_id: str,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> SwapCreated:
    swap = _owned_pending_swap(swap_id, session, user)
    swap.status = SwapStatus.rejected
    session.add(swap)
    session.commit()
    return SwapCreated(swap_id=swap_id, status=SwapStatus.rejected)
