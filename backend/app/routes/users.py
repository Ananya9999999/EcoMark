"""User endpoints (Part 5.6) plus a demo endpoint listing every user for the
user switcher."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.db import get_session
from app.deps import get_current_user
from app.models import User
from app.schemas import UserList, UserOut

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=UserList)
def list_users(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> UserList:
    """Every user except the current one — swap counterparties."""
    rows = session.exec(select(User).order_by(User.created_at, User.id)).all()
    return UserList(
        users=[
            UserOut(id=u.id, name=u.name, wallet_address=u.wallet_address)
            for u in rows
            if u.id != user.id
        ]
    )


@router.get("/all", response_model=UserList)
def list_all_users(session: Session = Depends(get_session)) -> UserList:
    """Every user, for the demo user switcher."""
    rows = session.exec(select(User).order_by(User.created_at, User.id)).all()
    return UserList(
        users=[UserOut(id=u.id, name=u.name, wallet_address=u.wallet_address) for u in rows]
    )
