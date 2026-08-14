"""Claim endpoints (Part 5.1–5.4)."""

from __future__ import annotations

import json
import os
import re
from datetime import date

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Request,
    UploadFile,
)
from sqlmodel import Session, func, select
from starlette.datastructures import UploadFile as StarletteUploadFile

from app.config import ALLOWED_UPLOAD_EXTENSIONS, MAX_UPLOAD_BYTES, UPLOAD_DIR
from app.db import get_session
from app.deps import get_current_user
from app.models import (
    ACTION_METHOD,
    ActionType,
    Claim,
    ClaimStatus,
    CreditCategory,
    User,
    Verification,
    VerificationMethod,
)
from app.schemas import (
    ClaimCreated,
    ClaimDetail,
    ClaimList,
    ClaimSummary,
    DatesOut,
    LocationOut,
    VerificationOut,
)
from app.services.claims import process_claim, retry_mint

router = APIRouter(prefix="/api/claims", tags=["claims"])

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _fail(message: str) -> HTTPException:
    return HTTPException(status_code=422, detail=message)


def _parse_date(value: str) -> date | None:
    if not isinstance(value, str) or not _DATE_RE.match(value):
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _validate_satellite(body: dict) -> dict:
    lat = body.get("lat")
    lng = body.get("lng")
    radius_m = body.get("radius_m")
    before_date = body.get("before_date")
    after_date = body.get("after_date")

    if lat is None or lng is None or radius_m is None or not before_date or not after_date:
        raise _fail("Satellite claims need a location, a radius and both dates")

    try:
        lat = float(lat)
        lng = float(lng)
        radius_m = int(radius_m)
    except (TypeError, ValueError):
        raise _fail("Satellite claims need a location, a radius and both dates")

    if not -90 <= lat <= 90:
        raise _fail("Latitude must be between -90 and 90")
    if not -180 <= lng <= 180:
        raise _fail("Longitude must be between -180 and 180")
    if not 50 <= radius_m <= 50000:
        raise _fail("Radius must be between 50 m and 50 km")

    before = _parse_date(before_date)
    after = _parse_date(after_date)
    if before is None or after is None:
        raise _fail("Satellite claims need a location, a radius and both dates")
    if not before < after:
        raise _fail("The before date must come first")

    return {
        "lat": lat,
        "lng": lng,
        "radius_m": radius_m,
        "before_date": before_date,
        "after_date": after_date,
    }


async def _read_upload(file: UploadFile) -> bytes:
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_UPLOAD_EXTENSIONS:
        raise _fail("Upload a JPG, PNG, PDF, GPX or CSV")
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise _fail("File must be under 10 MB")
    return content


@router.post("", response_model=ClaimCreated, status_code=201)
async def create_claim(
    request: Request,
    background: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> ClaimCreated:
    content_type = request.headers.get("content-type", "")

    file: UploadFile | None = None
    if content_type.startswith("multipart/form-data") or content_type.startswith(
        "application/x-www-form-urlencoded"
    ):
        form = await request.form()
        body = {k: v for k, v in form.items() if k != "file"}
        upload = form.get("file")
        if isinstance(upload, StarletteUploadFile) and (upload.filename or "").strip():
            file = upload
    else:
        try:
            body = await request.json()
        except Exception:
            body = {}
        if not isinstance(body, dict):
            body = {}

    action_type = body.get("action_type")
    if action_type not in {a.value for a in ActionType}:
        raise _fail("Unknown action type")

    method = body.get("method")
    expected_method = ACTION_METHOD[action_type]
    if method != expected_method:
        raise _fail("Method does not match action type")

    fields: dict = {}
    saved_path: str | None = None

    if method == VerificationMethod.satellite:
        fields = _validate_satellite(body)
    else:
        if file is None:
            raise _fail("This claim needs a file")
        content = await _read_upload(file)
        claim = Claim(user_id=user.id, action_type=action_type, method=method,
                      status=ClaimStatus.verifying)
        safe_name = os.path.basename(file.filename or "upload")
        saved_path = str(UPLOAD_DIR / f"{claim.id}_{safe_name}")
        with open(saved_path, "wb") as fh:
            fh.write(content)
        claim.file_path = saved_path
        session.add(claim)
        session.commit()
        background.add_task(process_claim, claim.id)
        return ClaimCreated(claim_id=claim.id, status=claim.status)

    claim = Claim(
        user_id=user.id,
        action_type=action_type,
        method=method,
        status=ClaimStatus.verifying,
        **fields,
    )
    session.add(claim)
    session.commit()
    background.add_task(process_claim, claim.id)
    return ClaimCreated(claim_id=claim.id, status=claim.status)


@router.get("", response_model=ClaimList)
def list_claims(
    status: str | None = None,
    category: str | None = None,
    limit: int = 50,
    offset: int = 0,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> ClaimList:
    query = select(Claim).where(Claim.user_id == user.id)
    count_query = select(func.count()).select_from(Claim).where(Claim.user_id == user.id)

    if status and status in {s.value for s in ClaimStatus}:
        query = query.where(Claim.status == status)
        count_query = count_query.where(Claim.status == status)
    if category and category in {c.value for c in CreditCategory}:
        query = query.where(Claim.category == category)
        count_query = count_query.where(Claim.category == category)

    total = session.exec(count_query).one()
    rows = session.exec(
        query.order_by(Claim.submitted_at.desc(), Claim.id.desc())
        .limit(max(1, min(limit, 200)))
        .offset(max(0, offset))
    ).all()

    return ClaimList(
        claims=[
            ClaimSummary(
                claim_id=c.id,
                action_type=c.action_type,
                status=c.status,
                submitted_at=c.submitted_at,
                credits_awarded=c.credits_awarded,
                category=c.category,
            )
            for c in rows
        ],
        total=total,
    )


@router.get("/{claim_id}", response_model=ClaimDetail)
def get_claim(claim_id: str, session: Session = Depends(get_session)) -> ClaimDetail:
    claim = session.get(Claim, claim_id)
    if claim is None:
        raise HTTPException(status_code=404, detail="Claim not found")

    verification_out = None
    if claim.status not in (ClaimStatus.submitted, ClaimStatus.verifying):
        row = session.exec(
            select(Verification)
            .where(Verification.claim_id == claim.id)
            .order_by(Verification.completed_at.desc())
        ).first()
        if row is not None:
            try:
                evidence = json.loads(row.evidence_json or "{}")
            except json.JSONDecodeError:
                evidence = {}
            verification_out = VerificationOut(
                verified=bool(row.verified),
                confidence=row.confidence,
                credits=claim.credits_awarded if row.verified else 0.0,
                category=claim.category,
                evidence=evidence,
            )

    file_name = None
    if claim.file_path:
        base = os.path.basename(claim.file_path)
        # stored as <claim_id>_<original_name>
        file_name = base[len(claim.id) + 1:] if base.startswith(claim.id + "_") else base

    location = None
    dates = None
    if claim.method == VerificationMethod.satellite:
        location = LocationOut(lat=claim.lat, lng=claim.lng, radius_m=claim.radius_m)
        dates = DatesOut(before=claim.before_date, after=claim.after_date)

    return ClaimDetail(
        claim_id=claim.id,
        action_type=claim.action_type,
        method=claim.method,
        status=claim.status,
        submitted_at=claim.submitted_at,
        verified_at=claim.verified_at,
        location=location,
        dates=dates,
        file_name=file_name,
        verification=verification_out,
        tx_hash=claim.tx_hash,
        error=claim.error,
    )


@router.post("/{claim_id}/retry-mint", response_model=ClaimCreated)
def retry_mint_route(
    claim_id: str,
    background: BackgroundTasks,
    session: Session = Depends(get_session),
) -> ClaimCreated:
    claim = session.get(Claim, claim_id)
    if claim is None:
        raise HTTPException(status_code=404, detail="Claim not found")
    if claim.status != ClaimStatus.mint_failed:
        raise HTTPException(status_code=409, detail="This claim is not awaiting a retry")

    claim.status = ClaimStatus.minting
    session.add(claim)
    session.commit()
    background.add_task(retry_mint, claim_id)
    return ClaimCreated(claim_id=claim_id, status=ClaimStatus.minting)
