"""Prompt 2 tests: the table in Part 6.4, plus validation messages from 5.1."""

from __future__ import annotations

import io

import pytest

SATELLITE_BODY = {
    "action_type": "tree_planting",
    "method": "satellite",
    "lat": 12.9716,
    "lng": 77.5946,
    "radius_m": 500,
    "before_date": "2026-01-01",
    "after_date": "2026-07-01",
}


def _detail(resp):
    """Message from the the spec's error envelope."""
    return resp.json()["error"]["message"]


class TestClaimLifecycle:
    def test_normal_satellite_claim_reaches_minted(self, client):
        resp = client.post("/api/claims", json=SATELLITE_BODY)
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert body["status"] == "verifying"
        claim_id = body["claim_id"]

        # TestClient runs background tasks before returning, so the claim
        # has already reached its terminal state.
        detail = client.get(f"/api/claims/{claim_id}").json()
        assert detail["status"] == "minted"
        assert detail["tx_hash"]
        assert detail["verification"]["credits"] > 0
        assert detail["verification"]["category"] == "land"

    def test_fail_test_reaches_rejected(self, client):
        file = {"file": ("bill.pdf", io.BytesIO(b"%PDF fake"), "application/pdf")}
        resp = client.post("/api/claims",
                           data={"action_type": "fail_test", "method": "ocr"},
                           files=file)
        assert resp.status_code == 201
        claim_id = resp.json()["claim_id"]
        detail = client.get(f"/api/claims/{claim_id}").json()
        assert detail["status"] == "rejected"
        assert detail["error"]
        assert detail["tx_hash"] is None

    def test_verify_raises_reaches_rejected(self, client, monkeypatch):
        import app.services.claims as svc

        def boom(_):
            raise RuntimeError("satellite service down")

        monkeypatch.setattr(svc.verification, "verify_claim", boom)
        resp = client.post("/api/claims", json=SATELLITE_BODY)
        claim_id = resp.json()["claim_id"]
        detail = client.get(f"/api/claims/{claim_id}").json()
        assert detail["status"] == "rejected"
        assert "Verification could not be completed" in detail["error"]

    def test_mint_raises_reaches_mint_failed(self, client, monkeypatch):
        import app.services.claims as svc

        def boom(**kwargs):
            raise RuntimeError("rpc timeout")

        monkeypatch.setattr(svc.chain, "mint_credit", boom)
        resp = client.post("/api/claims", json=SATELLITE_BODY)
        claim_id = resp.json()["claim_id"]
        detail = client.get(f"/api/claims/{claim_id}").json()
        assert detail["status"] == "mint_failed"
        assert "Credits could not be issued" in detail["error"]
        # verification already succeeded — credits stay recorded
        assert detail["verification"]["credits"] > 0

    def test_retry_after_mint_failed_reaches_minted(self, client, monkeypatch):
        import app.services.claims as svc

        calls = {"n": 0}

        def flaky(**kwargs):
            # Fails once, then succeeds. Deliberately does not delegate to the
            # mock chain, whose own simulated failure depends on the claim id.
            calls["n"] += 1
            if calls["n"] == 1:
                raise RuntimeError("rpc timeout")
            return "0x" + "a" * 32

        monkeypatch.setattr(svc.chain, "mint_credit", flaky)
        resp = client.post("/api/claims", json=SATELLITE_BODY)
        claim_id = resp.json()["claim_id"]
        assert client.get(f"/api/claims/{claim_id}").json()["status"] == "mint_failed"

        retry = client.post(f"/api/claims/{claim_id}/retry-mint")
        assert retry.status_code == 200
        detail = client.get(f"/api/claims/{claim_id}").json()
        assert detail["status"] == "minted"
        assert detail["error"] is None  # cleared on retry success
        assert detail["tx_hash"]

    def test_retry_on_minted_returns_409(self, client):
        resp = client.post("/api/claims", json=SATELLITE_BODY)
        claim_id = resp.json()["claim_id"]
        assert client.get(f"/api/claims/{claim_id}").json()["status"] == "minted"
        retry = client.post(f"/api/claims/{claim_id}/retry-mint")
        assert retry.status_code == 409
        assert _detail(retry) == "This claim is not awaiting a retry"

    def test_no_claim_left_in_verifying(self, client):
        resp = client.post("/api/claims", json=SATELLITE_BODY)
        claim_id = resp.json()["claim_id"]
        status = client.get(f"/api/claims/{claim_id}").json()["status"]
        assert status in ("rejected", "minted", "mint_failed")


class TestClaimValidation:
    def test_unknown_action_type(self, client):
        r = client.post("/api/claims", json={"action_type": "flying", "method": "ocr"})
        assert r.status_code == 422
        assert _detail(r) == "Unknown action type"

    def test_method_mismatch(self, client):
        r = client.post("/api/claims", json={"action_type": "tree_planting", "method": "ocr"})
        assert r.status_code == 422
        assert _detail(r) == "Method does not match action type"

    def test_satellite_missing_fields(self, client):
        r = client.post("/api/claims", json={"action_type": "tree_planting",
                                             "method": "satellite", "lat": 12.0})
        assert r.status_code == 422
        assert _detail(r) == "Satellite claims need a location, a radius and both dates"

    def test_lat_out_of_range(self, client):
        r = client.post("/api/claims", json={**SATELLITE_BODY, "lat": 91})
        assert _detail(r) == "Latitude must be between -90 and 90"

    def test_lng_out_of_range(self, client):
        r = client.post("/api/claims", json={**SATELLITE_BODY, "lng": -181})
        assert _detail(r) == "Longitude must be between -180 and 180"

    def test_radius_out_of_range(self, client):
        r = client.post("/api/claims", json={**SATELLITE_BODY, "radius_m": 49})
        assert _detail(r) == "Radius must be between 50 m and 5 km"
        r = client.post("/api/claims", json={**SATELLITE_BODY, "radius_m": 5001})
        assert _detail(r) == "Radius must be between 50 m and 5 km"

    def test_before_not_earlier(self, client):
        r = client.post("/api/claims", json={**SATELLITE_BODY,
                                             "before_date": "2026-07-01",
                                             "after_date": "2026-01-01"})
        assert _detail(r) == "The before date must come first"

    def test_file_claim_without_file(self, client):
        r = client.post("/api/claims",
                        data={"action_type": "energy_reduction", "method": "ocr"})
        assert r.status_code == 422
        assert _detail(r) == "This claim needs a file"

    def test_file_too_large(self, client):
        big = io.BytesIO(b"0" * (10 * 1024 * 1024 + 1))
        r = client.post("/api/claims",
                        data={"action_type": "energy_reduction", "method": "ocr"},
                        files={"file": ("bill.pdf", big, "application/pdf")})
        assert _detail(r) == "File must be under 10 MB"

    def test_bad_extension(self, client):
        r = client.post("/api/claims",
                        data={"action_type": "energy_reduction", "method": "ocr"},
                        files={"file": ("bill.exe", io.BytesIO(b"x"), "application/x-exe")})
        assert "PDF" in _detail(r)  # OCR claims accept documents, not executables

    def test_gps_accepts_json_rejects_pdf(self, client):
        ok = client.post("/api/claims",
                         data={"action_type": "commute", "method": "gps"},
                         files={"file": ("trip.json", io.BytesIO(b"{}"), "application/json")})
        assert ok.status_code == 201, ok.text
        bad = client.post("/api/claims",
                          data={"action_type": "commute", "method": "gps"},
                          files={"file": ("trip.pdf", io.BytesIO(b"%PDF"), "application/pdf")})
        assert bad.status_code == 422
        assert "GPX" in _detail(bad)

    def test_upload_saved_with_claim_id_prefix(self, client):
        from app.config import UPLOAD_DIR
        r = client.post("/api/claims",
                        data={"action_type": "energy_reduction", "method": "ocr"},
                        files={"file": ("bill.pdf", io.BytesIO(b"%PDF"), "application/pdf")})
        claim_id = r.json()["claim_id"]
        assert (UPLOAD_DIR / f"{claim_id}_bill.pdf").exists()

    def test_claim_not_found(self, client):
        r = client.get("/api/claims/clm_missing1")
        assert r.status_code == 404
        assert _detail(r) == "Claim not found"

    def test_list_claims_newest_first(self, client):
        client.post("/api/claims", json=SATELLITE_BODY)
        client.post("/api/claims", json=SATELLITE_BODY)
        body = client.get("/api/claims").json()
        assert body["total"] >= 2
        times = [c["submitted_at"] for c in body["claims"]]
        assert times == sorted(times, reverse=True)
