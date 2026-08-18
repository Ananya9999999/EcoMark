"""Real verification service (Part 10.1).

Dispatches by claim["method"] to the satellite, OCR, or GPS pipeline and
returns the standard result shape (see mock_verification.py for reference).

This file replaces the placeholder that raised NotImplementedError.
Drop it into: backend/app/integrations/verification.py

Requires backend/verification/ (satellite.py, ocr.py) to be importable --
it already is if uvicorn is run from the backend/ directory, same as `app`.
"""

from __future__ import annotations

from verification import satellite, ocr

# GPS mode-detection is out of scope for tonight's build -- falling back to
# the mock so the end-to-end flow (submit -> verify -> mint) still works for
# commute claims in the demo. Swap this for a real implementation once the
# route-matching logic is ready.
from app.integrations import mock_verification

_REJECTION_REASONS = {
    "satellite": "No detectable vegetation change in the specified area",
    "ocr": "The document could not be matched to a utility account",
    "gps": "The trip log does not show a consistent low-carbon route",
}


def verify_claim(claim: dict) -> dict:
    """The input shape this expects is defined in Part 3.1 / app/services/claims.py."""
    action_type = claim.get("action_type")
    method = claim.get("method")

    if action_type == "fail_test":
        return {
            "verified": False,
            "confidence": 0.1,
            "credits": 0.0,
            "category": None,
            "evidence": {},
            "error": _REJECTION_REASONS.get(method, _REJECTION_REASONS["ocr"]),
        }

    try:
        if method == "satellite":
            return satellite.verify(claim)
        if method == "ocr":
            return ocr.verify(claim)
        if method == "gps":
            return mock_verification.verify_claim(claim)
    except Exception as exc:
        return {
            "verified": False,
            "confidence": 0.0,
            "credits": 0.0,
            "category": None,
            "evidence": {},
            "error": f"Verification failed: {exc}",
        }

    return {
        "verified": False,
        "confidence": 0.0,
        "credits": 0.0,
        "category": None,
        "evidence": {},
        "error": f"Unknown verification method: {method}",
    }