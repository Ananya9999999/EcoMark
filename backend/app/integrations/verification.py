"""Placeholder for the real verification module.

The verification group delivers this file (Part 10.1). Until it arrives,
running with USE_MOCKS=false fails loudly rather than silently doing nothing.
Never implement real verification logic here — it is out of scope (Part 0.3).
"""

from __future__ import annotations


def verify_claim(claim: dict) -> dict:
    raise NotImplementedError(
        "The real verification module has not been delivered yet. "
        "Set USE_MOCKS=true to run against the mock."
    )
