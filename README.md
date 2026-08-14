# Digital Carbon Credit Verification

Log a real-world climate action — planting trees, installing solar, cutting a
bill, commuting green — have it verified, earn carbon credits, and trade them
with other users.

This repository holds the **frontend and backend glue** scope: the Next.js
app, the FastAPI service, the SQLite store, and the orchestration between
them. Verification and blockchain logic are owned by other groups and are
reached only through the two interfaces in `backend\app\integrations\`
(mocked by default).

## Setup

Prerequisites: Node 18+, Python 3.10+.

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

If activation is blocked: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

The server creates `backend\data\app.db` and seeds it on first start
(4 users, 12 claims, 2 pending swaps). To re-seed manually:

```powershell
python -m app.seed
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:3000.

## How USE_MOCKS works

`backend\app\integrations\__init__.py` selects the implementations at import
time:

- `USE_MOCKS=true` (the default) — `mock_verification.py` (3-second fake
  verification) and `mock_chain.py` (in-memory balances and swaps).
- `USE_MOCKS=false` — the real `verification.py` and `chain.py` delivered by
  the other groups.

Set it before starting uvicorn:

```powershell
$env:USE_MOCKS = "true"
uvicorn app.main:app --reload --port 8000
```

Everything else imports `from app.integrations import verification, chain` —
nothing references the mock modules directly.

## Tests

```powershell
cd backend
.venv\Scripts\Activate.ps1
python -m pytest tests -q
```

## The demo path

1. The dashboard opens with Priya's claims and balance visible.
2. **New claim** → *Planted trees* → rotate the globe, drop a pin, set the
   radius and both dates → **Submit claim**.
3. The verification sequence plays (locating parcel → retrieving imagery →
   comparing before and after → calculating), credits count up, the balance
   in the rail moves.
4. The claim detail shows the evidence and the location on the small globe.
5. **Swaps** → propose a trade with Arjun.
6. Switch the user to Arjun (bottom of the rail), accept the trade, and both
   balances update.

To demonstrate the rejection path, submit an OCR claim with action type
`fail_test` via the API — the mock always rejects it.

## Design

The interface derives from `docs\design.md` — palette from satellite and
vegetation-index imagery, IBM Plex + Bricolage Grotesque type, and the globe
as the coordinate input. Read that file for the reasoning.
