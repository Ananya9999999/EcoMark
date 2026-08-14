import os
import ee

_initialized = False


def init_earth_engine():
    global _initialized
    if _initialized:
        return
    project_id = os.environ.get("EE_PROJECT")
    ee.Initialize(project=project_id)
    _initialized = True


def get_sentinel2_image(lat: float, lon: float, start_date: str, end_date: str,
                         radius_m: float = 50):
    point = ee.Geometry.Point([lon, lat])
    region = point.buffer(radius_m)

    collection = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(region)
        .filterDate(start_date, end_date)
        .sort("CLOUDY_PIXEL_PERCENTAGE")
    )

    image = collection.first()
    if image.getInfo() is None:
        return None
    return image, region


def compute_ndvi(image) -> "ee.Image":
    return image.normalizedDifference(["B8", "B4"]).rename("NDVI")


def mean_ndvi_for_region(image, region) -> float:
    ndvi = compute_ndvi(image)
    stats = ndvi.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=region,
        scale=10, 
        maxPixels=1e9,
    )
    return stats.get("NDVI").getInfo()


def verify_land_claim(lat: float, lon: float, claimed_action_date: str,
                       radius_m: float = 50, lookback_days: int = 60,
                       lookahead_days: int = 180) -> dict:
    init_earth_engine()

    from datetime import datetime, timedelta
    claim_date = datetime.fromisoformat(claimed_action_date)
    before_start = (claim_date - timedelta(days=lookback_days)).isoformat()[:10]
    before_end = claim_date.isoformat()[:10]
    after_start = claim_date.isoformat()[:10]
    after_end = (claim_date + timedelta(days=lookahead_days)).isoformat()[:10]

    before_result = get_sentinel2_image(lat, lon, before_start, before_end, radius_m)
    after_result = get_sentinel2_image(lat, lon, after_start, after_end, radius_m)

    if before_result is None or after_result is None:
        return {
            "status": "insufficient_data",
            "reason": "No cloud-free Sentinel-2 image found for before or after window",
        }

    before_image, region = before_result
    after_image, _ = after_result

    ndvi_before = mean_ndvi_for_region(before_image, region)
    ndvi_after = mean_ndvi_for_region(after_image, region)
    delta = ndvi_after - ndvi_before

    return {
        "status": "computed",
        "ndvi_before": ndvi_before,
        "ndvi_after": ndvi_after,
        "delta": delta,
    }


if __name__ == "__main__":
    init_earth_engine()
    result = verify_land_claim(
        lat=12.8406, lon=80.0432,  
        claimed_action_date="2026-06-01",
    )
    print(result)
