from fastapi import FastAPI, UploadFile, File, Form
import shutil
import uuid
import os

from schemas import (
    LandClaim, VerificationResult, ActionType, VerificationStatus,
)
from satellite import verify_land_claim
from ocr import extract_raw_text, parse_bill_fields

app = FastAPI(title="EcoMark Verification Service")

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
NDVI_DELTA_THRESHOLD = 0.10


@app.post("/verify/land", response_model=VerificationResult)
def verify_land(claim: LandClaim):
    result = verify_land_claim(
        lat=claim.latitude,
        lon=claim.longitude,
        claimed_action_date=claim.claimed_action_date,
        radius_m=claim.radius_m,
    )

    if result["status"] != "computed":
        return VerificationResult(
            claim_id=claim.claim_id,
            action_type=ActionType.LAND,
            status=VerificationStatus.PENDING,
            score=0,
            evidence=result,
            notes="Could not compute NDVI -- insufficient satellite imagery for this window/location.",
        )

    delta = result["delta"]
    verified = delta >= NDVI_DELTA_THRESHOLD

    return VerificationResult(
        claim_id=claim.claim_id,
        action_type=ActionType.LAND,
        status=VerificationStatus.VERIFIED if verified else VerificationStatus.REJECTED,
        score=max(0.0, min(1.0, delta / 0.3)),  # rough normalization, tune later
        evidence=result,
        notes=None,
    )


@app.post("/verify/bill", response_model=VerificationResult)
def verify_bill(claim_id: str = Form(...), user_id: str = Form(...),
                 file: UploadFile = File(...)):
    ext = file.filename.split(".")[-1]
    saved_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}.{ext}")
    with open(saved_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    raw_text = extract_raw_text(saved_path)
    fields = parse_bill_fields(raw_text)

    if fields["units_consumed"] is None:
        return VerificationResult(
            claim_id=claim_id,
            action_type=ActionType.ENERGY,
            status=VerificationStatus.PENDING,
            score=0,
            evidence={"raw_text": raw_text, "parsed": fields},
            notes="Could not extract consumption units from bill -- OCR may need better image quality or format-specific parsing.",
        )

    # TODO: compare fields["units_consumed"] against the user's previous
    # bill / historical baseline once you have a DB storing past bills.
    # For now this just confirms the bill was readable.
    return VerificationResult(
        claim_id=claim_id,
        action_type=ActionType.ENERGY,
        status=VerificationStatus.PENDING,
        score=0.5,
        evidence={"parsed": fields},
        notes="Bill parsed successfully. Trend comparison against baseline not yet implemented.",
    )


@app.get("/health")
def health():
    return {"status": "ok"}
