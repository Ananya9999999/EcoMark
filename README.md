# EcoMark

Verifying real-world climate actions via satellite (NDVI) and OCR, then issuing tradeable credits on-chain. Built for SIH.

---

## This branch — Pair C: frontend + backend glue

`Lisa-Part-C` holds the Next.js app, the FastAPI service, the database, and
the orchestration that ties the other two pairs together.

| Pair | Owns | Status on this branch |
|---|---|---|
| A — Verification | Satellite/NDVI, OCR pipelines | Mocked. Drops into `backend/app/integrations/verification.py` |
| B — Blockchain | Solidity contracts, mint/transfer/swap | Mocked. Drops into `backend/app/integrations/chain.py` |
| **C — Frontend + glue** | **Dashboard, API routes, database, full request flow** | **This branch** |

Nothing here implements Pair A's or Pair B's work. Both are reached through
two fixed interfaces, with mocks standing in until the real modules land.

## Setup

Prerequisites: Node 18+, Python 3.10+. Windows / PowerShell.

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

If activation is blocked:
`Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

The database is SQLite and creates itself at `backend\data\app.db` on
first start, with four login profiles and no claims. Nothing to install
or configure.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000>.

## Switching the mocks off

`backend/app/integrations/__init__.py` picks the implementation at import time:

- `USE_MOCKS=true` (default) — mock verification (3 s delay) and an in-memory ledger
- `USE_MOCKS=false` — the real modules from Pair A and Pair B

Everything imports `from app.integrations import verification, chain`, so when
the real modules arrive you drop the files in and flip the flag. No other code
changes. See `backend/.env.example`.

## Tests

```powershell
cd backend
.venv\Scripts\Activate.ps1
python -m pytest tests -q
```

49 tests cover the claim lifecycle, every validation message, the mocks, and
the balance/trade endpoints.

## Demo path

1. Landing page — press **Enter**
2. Choose a profile (no passwords; this is a demo device, not authentication)
3. **Log action** → *Planted trees* → pick country → state → city → PIN code,
   then click the globe for the exact parcel
4. Set both dates, **Submit claim** — the verification sequence plays and
   credits are minted
5. **Trades** → propose a swap, switch profile, accept it, watch both balances move

Sample data for a rehearsal: `python -m app.seed --demo`

To guarantee no simulated ledger failures during a live demo, set
`MOCK_CHAIN_FAILURES=false`.
