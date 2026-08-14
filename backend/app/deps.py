"""Shared request dependencies."""

from __future__ import annotations

from fastapi import Depends, Header, HTTPException
from sqlmodel import Session, select

from app.db import get_session
from app.models import User


def get_current_user(
    session: Session = Depends(get_session),
    x_user_id: str | None = Header(default=None),
) -> User:
    """Resolve the current user from X-User-Id, defaulting to the first
    seeded user when the header is absent (Part 5). No authentication."""
    if x_user_id:
        user = session.get(User, x_user_id)
        if user is not None:
            return user
    user = session.exec(select(User).order_by(User.created_at, User.id)).first()
    if user is None:
        raise HTTPException(status_code=503, detail="No users exist yet — run the seed script")
    return user
