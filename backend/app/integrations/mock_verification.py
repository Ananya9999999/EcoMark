"""Mock of the verification group's module.

Stub only — real satellite/NDVI, OCR and GPS analysis is owned by another
group and arrives later as ``verification.py``. This module fakes the contract
in Part 3.1 so the rest of the system can be built and tested against it.

The 3 second sleep is deliberate and must be kept: it is what makes async
handling testable. An instant mock hides bugs that only appear with latency.
"""

from __future__ import annotations

import random
import time

# Mock-only mapping from action type to credit category (Part 2.3).
_CATEGORY_BY_ACTION = {
    "tree_planting": "land",
    "solar_install": "energy",
    "energy_reduction": "energy",
    "water_reduction": "water",
    "ev_purchase": "transport",
    "commute": "transport",
}

_REJECTION_REASONS = {
    "satellite": "No detectable vegetation change in the specified area",
    "ocr": "The document could not be matched to a utility account",
    "gps": "The trip log does not show a consistent low-carbon route",
}


def verify_claim(claim: dict) -> dict:
    """Fake verification matching the contract in Part 3.1."""
    time.sleep(3)  # Keep. Simulates real verification latency.

    action_type = claim.get("action_type")
    method = claim.get("method")

    if action_type == "fail_test":
        return {
            "verified": False,
            "confidence": round(random.uniform(0.05, 0.25), 2),
            "credits": 0.0,
            "category": None,
            "evidence": {},
            "error": _REJECTION_REASONS.get(method, _REJECTION_REASONS["ocr"]),
        }

    confidence = round(random.uniform(0.75, 0.95), 2)

    if method == "satellite":
        ndvi_before = round(random.uniform(0.20, 0.35), 2)
        ndvi_after = round(ndvi_before + random.uniform(0.15, 0.30), 2)
        delta = round(ndvi_after - ndvi_before, 2)
        area_hectares = round(random.uniform(0.3, 2.5), 2)
        credits = round(delta * area_hectares * 20, 1)
        return {
            "verified": True,
            "confidence": confidence,
            "credits": credits,
            "category": "land",
            "evidence": {
                "ndvi_before": ndvi_before,
                "ndvi_after": ndvi_after,
                "delta": delta,
                "area_hectares": area_hectares,
            },
            "error": None,
        }

    if method == "gps":
        distance_km = round(random.uniform(30, 220), 1)
        trips = random.randint(8, 40)
        credits = round(random.uniform(1.0, 4.0), 1)
        return {
            "verified": True,
            "confidence": confidence,
            "credits": credits,
            "category": "transport",
            "evidence": {
                "distance_km": distance_km,
                "trips_matched": trips,
                "mode": random.choice(["cycle", "bus", "metro", "walk"]),
                "co2_saved_kg": round(distance_km * 0.12, 1),
            },
            "error": None,
        }

    # ocr — plausible bill fields per action type
    credits = round(random.uniform(1.0, 5.0), 1)
    category = _CATEGORY_BY_ACTION.get(action_type, "energy")
    if action_type == "water_reduction":
        evidence = {
            "vendor": "Metro Water",
            "bill_date": "2026-07-08",
            "units_kl": random.randint(8, 18),
            "previous_kl": random.randint(19, 30),
            "reduction_pct": round(random.uniform(12, 35), 1),
        }
    elif action_type in ("solar_install", "ev_purchase"):
        evidence = {
            "vendor": random.choice(["SunEdge Solar", "Tata Motors", "Luminous"]),
            "invoice_date": "2026-06-20",
            "amount_inr": random.randint(60000, 1400000),
            "model_detected": random.choice(["5kW rooftop array", "Nexon EV", "Atria 3kW"]),
        }
    else:
        units = random.randint(180, 260)
        evidence = {
            "vendor": "TNEB",
            "bill_date": "2026-06-15",
            "units_kwh": units,
            "previous_kwh": units + random.randint(40, 90),
            "reduction_pct": round(random.uniform(10, 30), 1),
        }
    return {
        "verified": True,
        "confidence": confidence,
        "credits": credits,
        "category": category,
        "evidence": evidence,
        "error": None,
    }
