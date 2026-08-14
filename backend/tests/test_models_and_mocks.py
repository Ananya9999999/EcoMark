"""Prompt 1 tests: models, mock behaviour, loader."""

from __future__ import annotations

import importlib

import pytest
from sqlmodel import select

from app.models import Claim, Swap, User, Verification


class TestModels:
    def test_user_roundtrip(self, session):
        u = User(name="Priya", wallet_address="0xabc")
        session.add(u)
        session.commit()
        row = session.exec(select(User).where(User.wallet_address == "0xabc")).one()
        assert row.name == "Priya"
        assert row.id.startswith("usr_")
        assert row.created_at.endswith("Z")

    def test_claim_roundtrip(self, session, user):
        c = Claim(user_id=user.id, action_type="tree_planting", method="satellite",
                  lat=12.9716, lng=77.5946, radius_m=500,
                  before_date="2026-01-01", after_date="2026-07-01")
        session.add(c)
        session.commit()
        row = session.get(Claim, c.id)
        assert row.status == "submitted"
        assert row.id.startswith("clm_")
        assert row.lat == 12.9716

    def test_verification_roundtrip(self, session, user):
        c = Claim(user_id=user.id, action_type="commute", method="gps")
        session.add(c)
        session.commit()
        v = Verification(claim_id=c.id, verified=1, confidence=0.9,
                         evidence_json='{"distance_km": 12}')
        session.add(v)
        session.commit()
        row = session.exec(select(Verification).where(Verification.claim_id == c.id)).one()
        assert row.verified == 1

    def test_swap_roundtrip(self, session, user):
        other = User(name="Arjun", wallet_address="0xdef")
        session.add(other)
        session.commit()
        s = Swap(initiator_id=user.id, counterparty_id=other.id,
                 offer_category="land", offer_amount=2.0,
                 want_category="energy", want_amount=1.0)
        session.add(s)
        session.commit()
        row = session.get(Swap, s.id)
        assert row.status == "pending"
        assert len(row.id) == 8


class TestMockVerification:
    REQUIRED_KEYS = {"verified", "confidence", "credits", "category", "evidence", "error"}

    def _claim(self, action, method, **extra):
        base = {"claim_id": "clm_test", "action_type": action, "method": method,
                "lat": None, "lng": None, "radius_m": None,
                "before_date": None, "after_date": None, "file_path": None}
        base.update(extra)
        return base

    def test_satellite_shape(self, no_sleep):
        from app.integrations import verification
        out = verification.verify_claim(self._claim("tree_planting", "satellite",
                                                    lat=12.0, lng=77.0, radius_m=500))
        assert set(out) == self.REQUIRED_KEYS
        assert out["verified"] is True
        assert out["category"] == "land"
        assert 0.20 <= out["evidence"]["ndvi_before"] <= 0.35
        assert out["evidence"]["ndvi_after"] > out["evidence"]["ndvi_before"]

    def test_ocr_shape(self, no_sleep):
        from app.integrations import verification
        out = verification.verify_claim(self._claim("energy_reduction", "ocr",
                                                    file_path="C:/x/bill.pdf"))
        assert set(out) == self.REQUIRED_KEYS
        assert out["category"] == "energy"
        assert 1.0 <= out["credits"] <= 5.0

    def test_gps_shape(self, no_sleep):
        from app.integrations import verification
        out = verification.verify_claim(self._claim("commute", "gps",
                                                    file_path="C:/x/log.gpx"))
        assert out["category"] == "transport"
        assert 0.75 <= out["confidence"] <= 0.95

    def test_fail_test_rejects(self, no_sleep):
        from app.integrations import verification
        out = verification.verify_claim(self._claim("fail_test", "ocr"))
        assert out["verified"] is False
        assert out["credits"] == 0.0
        assert out["category"] is None
        assert out["error"]


class TestMockChain:
    def test_mint_then_balance(self, fresh_chain):
        tx = fresh_chain.mint_credit("0xA", "land", 4.5, "clm_1")
        assert tx.startswith("0x") and len(tx) == 34
        assert fresh_chain.get_balance("0xA") == {"land": 4.5}

    def test_unknown_address_empty(self, fresh_chain):
        assert fresh_chain.get_balance("0xNOBODY") == {}

    def test_swap_moves_both_amounts(self, fresh_chain):
        fresh_chain.mint_credit("0xA", "land", 5.0, "c1")
        fresh_chain.mint_credit("0xB", "energy", 3.0, "c2")
        swap_id = fresh_chain.initiate_swap("0xA", "0xB", "land", 5.0, "energy", 3.0)
        assert len(swap_id) == 8
        assert len(fresh_chain.get_pending_swaps("0xB")) == 1
        fresh_chain.accept_swap(swap_id, "0xB")
        assert fresh_chain.get_balance("0xA") == {"land": 0.0, "energy": 3.0}
        assert fresh_chain.get_balance("0xB") == {"energy": 0.0, "land": 5.0}
        assert fresh_chain.get_pending_swaps("0xB") == []

    def test_accept_insufficient_raises(self, fresh_chain):
        fresh_chain.mint_credit("0xA", "land", 5.0, "c1")
        swap_id = fresh_chain.initiate_swap("0xA", "0xB", "land", 5.0, "energy", 3.0)
        with pytest.raises(Exception):
            fresh_chain.accept_swap(swap_id, "0xB")  # 0xB holds nothing


class TestLoader:
    def test_loader_selects_mocks(self, monkeypatch):
        monkeypatch.setenv("USE_MOCKS", "true")
        import app.integrations as integrations
        importlib.reload(integrations)
        assert integrations.verification.__name__.endswith("mock_verification")
        assert integrations.chain.__name__.endswith("mock_chain")
