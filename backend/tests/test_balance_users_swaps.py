"""Prompt 3 tests: balance, users, swaps endpoints."""

from __future__ import annotations

import pytest


def _detail(resp):
    """Message from the the spec's error envelope."""
    return resp.json()["error"]["message"]


def _users(client):
    """id -> user dict for every seeded user."""
    rows = client.get("/api/users/all").json()["users"]
    return {u["name"]: u for u in rows}


class TestBalance:
    def test_all_four_categories_present(self, client):
        body = client.get("/api/balance").json()
        assert set(body["balances"]) == {"land", "energy", "water", "transport"}
        assert body["total"] == pytest.approx(sum(body["balances"].values()))

    def test_balance_503_when_chain_raises(self, client, monkeypatch):
        import app.routes.balance as bal

        def boom(_):
            raise RuntimeError("chain down")

        monkeypatch.setattr(bal.chain, "get_balance", boom)
        bal.invalidate_balance_cache()
        r = client.get("/api/balance")
        assert r.status_code == 503
        assert _detail(r) == "Balance is temporarily unavailable"

    def test_users_excludes_current(self, client):
        users = _users(client)
        priya = users["Priya"]  # first seeded user = default current user
        listed = client.get("/api/users").json()["users"]
        assert priya["id"] not in [u["id"] for u in listed]
        assert len(listed) == len(users) - 1


class TestSwaps:
    def _propose(self, client, as_user, counterparty_id, **over):
        body = {
            "counterparty_id": counterparty_id,
            "offer_category": "land",
            "offer_amount": 2.0,
            "want_category": "energy",
            "want_amount": 1.0,
        }
        body.update(over)
        return client.post("/api/swaps", json=body, headers={"X-User-Id": as_user})

    def test_propose_accept_moves_balances(self, client):
        users = _users(client)
        priya, arjun = users["Priya"], users["Arjun"]

        before_p = client.get("/api/balance", headers={"X-User-Id": priya["id"]}).json()
        before_a = client.get("/api/balance", headers={"X-User-Id": arjun["id"]}).json()

        r = self._propose(client, priya["id"], arjun["id"])
        assert r.status_code == 201, r.text
        swap_id = r.json()["swap_id"]

        incoming = client.get("/api/swaps", headers={"X-User-Id": arjun["id"]}).json()["incoming"]
        assert swap_id in [s["swap_id"] for s in incoming]

        r = client.post(f"/api/swaps/{swap_id}/accept", headers={"X-User-Id": arjun["id"]})
        assert r.status_code == 200, r.text

        after_p = client.get("/api/balance", headers={"X-User-Id": priya["id"]}).json()
        after_a = client.get("/api/balance", headers={"X-User-Id": arjun["id"]}).json()
        assert after_p["balances"]["land"] == pytest.approx(before_p["balances"]["land"] - 2.0)
        assert after_p["balances"]["energy"] == pytest.approx(before_p["balances"]["energy"] + 1.0)
        assert after_a["balances"]["land"] == pytest.approx(before_a["balances"]["land"] + 2.0)
        assert after_a["balances"]["energy"] == pytest.approx(before_a["balances"]["energy"] - 1.0)

    def test_swap_with_self_422(self, client):
        users = _users(client)
        priya = users["Priya"]
        r = self._propose(client, priya["id"], priya["id"])
        assert r.status_code == 422
        assert _detail(r) == "You can't swap with yourself"

    def test_swap_unknown_counterparty_404(self, client):
        users = _users(client)
        r = self._propose(client, users["Priya"]["id"], "usr_nobody99")
        assert r.status_code == 404
        assert _detail(r) == "User not found"

    def test_swap_zero_amount_422(self, client):
        users = _users(client)
        r = self._propose(client, users["Priya"]["id"], users["Arjun"]["id"], offer_amount=0)
        assert r.status_code == 422
        assert _detail(r) == "Amounts must be greater than zero"

    def test_swap_unknown_category_422(self, client):
        users = _users(client)
        r = self._propose(client, users["Priya"]["id"], users["Arjun"]["id"],
                          offer_category="gold")
        assert r.status_code == 422
        assert _detail(r) == "Unknown credit category"

    def test_swap_insufficient_balance_422(self, client):
        users = _users(client)
        r = self._propose(client, users["Priya"]["id"], users["Arjun"]["id"],
                          offer_amount=99999.0)
        assert r.status_code == 422
        assert _detail(r) == "You don't have enough land credits"

    def test_accept_someone_elses_swap_403(self, client):
        users = _users(client)
        r = self._propose(client, users["Priya"]["id"], users["Arjun"]["id"])
        swap_id = r.json()["swap_id"]
        r = client.post(f"/api/swaps/{swap_id}/accept",
                        headers={"X-User-Id": users["Meera"]["id"]})
        assert r.status_code == 403
        assert _detail(r) == "This swap isn't yours to accept"

    def test_accept_insufficient_balance_422(self, client):
        users = _users(client)
        # Kabir holds no land; want land from him
        r = self._propose(client, users["Priya"]["id"], users["Kabir"]["id"],
                          offer_category="land", offer_amount=1.0,
                          want_category="land", want_amount=50.0)
        swap_id = r.json()["swap_id"]
        r = client.post(f"/api/swaps/{swap_id}/accept",
                        headers={"X-User-Id": users["Kabir"]["id"]})
        assert r.status_code == 422
        assert _detail(r) == "You don't have enough land credits"

    def test_chain_exception_sets_failed_and_502(self, client, monkeypatch):
        import app.services.swaps as svc
        users = _users(client)
        r = self._propose(client, users["Priya"]["id"], users["Arjun"]["id"])
        swap_id = r.json()["swap_id"]

        def boom(*a, **k):
            raise RuntimeError("chain down")

        monkeypatch.setattr(svc.chain, "accept_swap", boom)
        r = client.post(f"/api/swaps/{swap_id}/accept",
                        headers={"X-User-Id": users["Arjun"]["id"]})
        assert r.status_code == 502
        assert _detail(r) == "The trade could not be completed"

        outgoing = client.get("/api/swaps",
                              headers={"X-User-Id": users["Priya"]["id"]}).json()["outgoing"]
        mine = [s for s in outgoing if s["swap_id"] == swap_id]
        assert mine and mine[0]["status"] == "failed"

    def test_reject_sets_rejected_no_chain_call(self, client, monkeypatch):
        import app.routes.swaps as routes
        users = _users(client)
        r = self._propose(client, users["Priya"]["id"], users["Arjun"]["id"])
        swap_id = r.json()["swap_id"]

        def boom(*a, **k):
            raise AssertionError("reject must not call the chain")

        monkeypatch.setattr(routes.chain, "accept_swap", boom)
        r = client.post(f"/api/swaps/{swap_id}/reject",
                        headers={"X-User-Id": users["Arjun"]["id"]})
        assert r.status_code == 200
        assert r.json()["status"] == "rejected"
