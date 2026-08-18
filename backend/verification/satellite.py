"""
Real satellite (NDVI) verification.

Exposes verify(claim: dict) -> dict matching the Part 3.1 contract exactly
(see app/integrations/mock_verification.py for the reference shape).

Requires:
  pip install earthengine-api
  earthengine authenticate   (one-time browser login, do this before the demo)
Env var EE_PROJECT must be set to your Earth Engine project id (e.g. "ecomark").
"""

from __future__ import annotations

import math
import os

import ee
from dotenv import load_dotenv

load_dotenv()  # reads .env from the current working directory (backend/)

_initialized = False

# Same threshold/scale decisions as before -- tune if real imagery gives
# noisier deltas than expected during testing tonight.
NDVI_DELTA_THRESHOLD = 0.10
CREDITS_PER_HECTARE_PER_NDVI_POINT = 20  # matches mock's `delta * area_hectares * 20`


def _init():
    global _initialized
    if _initialized:
        return
    ee.Initialize(project=os.environ.get("EE_PROJECT"))
    _initialized = True


def _get_image(lat: float, lon: float, start_date: str, end_date: str, region):
    collection = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(region)
        .filterDate(start_date, end_date)
        .sort("CLOUDY_PIXEL_PERCENTAGE")
    )
    image = collection.first()
    info = image.getInfo()  # forces evaluation; raises/returns None if empty
    if info is None:
        return None
    return image


def _mean_ndvi(image, region) -> float:
    ndvi = image.normalizedDifference(["B8", "B4"]).rename("NDVI")
    stats = ndvi.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=region,
        scale=10,
        maxPixels=1e9,
    )
    return stats.get("NDVI").getInfo()


def verify(claim: dict) -> dict:
    """
    claim: {claim_id, action_type, method, lat, lng, radius_m, before_date, after_date, ...}
    Returns the standard verification result dict (verified/confidence/credits/category/evidence/error).
    """
    lat = claim["lat"]
    lng = claim["lng"]
    radius_m = claim.get("radius_m") or 50
    before_date = claim["before_date"]
    after_date = claim["after_date"]

    try:
        _init()
        point = ee.Geometry.Point([lng, lat])
        region = point.buffer(radius_m)

        # Small windows around each date to maximize chance of a cloud-free image.
        before_img = _get_image(lat, lng, _shift(before_date, -30), _shift(before_date, 30), region)
        after_img = _get_image(lat, lng, _shift(after_date, -30), _shift(after_date, 30), region)

        if before_img is None or after_img is None:
            return {
                "verified": False,
                "confidence": 0.0,
                "credits": 0.0,
                "category": None,
                "evidence": {},
                "error": "No cloud-free satellite imagery available for the before/after window",
            }

        ndvi_before = round(_mean_ndvi(before_img, region), 2)
        ndvi_after = round(_mean_ndvi(after_img, region), 2)
        delta = round(ndvi_after - ndvi_before, 2)

        area_hectares = round((math.pi * radius_m ** 2) / 10000, 2)  # circle area, m² -> hectares
        verified = delta >= NDVI_DELTA_THRESHOLD

        if not verified:
            return {
                "verified": False,
                "confidence": round(min(0.3, max(0.05, delta)), 2),
                "credits": 0.0,
                "category": None,
                "evidence": {
                    "ndvi_before": ndvi_before,
                    "ndvi_after": ndvi_after,
                    "delta": delta,
                    "area_hectares": area_hectares,
                },
                "error": "No detectable vegetation change in the specified area",
            }

        credits = round(delta * area_hectares * CREDITS_PER_HECTARE_PER_NDVI_POINT, 1)
        confidence = round(min(0.95, 0.6 + delta), 2)  # more delta -> more confidence, capped

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

    except Exception as exc:
        return {
            "verified": False,
            "confidence": 0.0,
            "credits": 0.0,
            "category": None,
            "evidence": {},
            "error": f"Satellite verification failed: {exc}",
        }


def _shift(date_str: str, days: int) -> str:
    from datetime import datetime, timedelta
    d = datetime.fromisoformat(date_str) + timedelta(days=days)
    return d.isoformat()[:10]


if __name__ == "__main__":
    # Quick manual test
    result = verify({
        "claim_id": "test",
        "action_type": "tree_planting",
        "method": "satellite",
        "lat": 12.8406, "lng": 80.0432,
        "radius_m": 100,
        "before_date": "2026-01-01",
        "after_date": "2026-07-01",
    })
    print(result)