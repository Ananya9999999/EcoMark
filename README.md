# EcoMark

Verifying real-world climate actions via satellite (NDVI) and OCR, then issuing tradeable credits on-chain.

Built for Smart India Hackathon 2026.

## One picture

EcoMark is a platform where people earn credits for climate-friendly actions, **only after the action has been independently checked**. They can then trade those credits with each other.

## The problem it fixes

Traditional carbon credits are built for big institutions and verified by slow, expensive audits. An ordinary person who plants trees or cuts their electricity use has no trusted way to prove it, and nothing useful to do with the reward. Credit systems also suffer from fake claims and double counting, where the same action is sold twice.

## How it works

1. A user submits a claim: “I planted trees here,” “I reduced my electricity use,” “I installed solar,” or “I commute by bike.”
2. The system checks the claim with a method that fits the kind of action.
3. If the claim holds up, the user is awarded credits. The number depends on how strong and how large the verified impact is.
4. The credits are recorded on a blockchain ledger (ERC-1155), so nobody can edit history, claim the same action twice, or spend the same credit twice.
5. Users can swap credits with each other (e.g. energy ↔ transport); every swap is recorded permanently.

## Verification methods

| Action | Method | How it works |
|---|---|---|
| Tree planting / land | Satellite (NDVI) | Sentinel-2 before/after greenness via Google Earth Engine |
| Energy / water reduction | OCR on utility bills | Tesseract extracts consumption; compares against baseline |
| Purchases (solar, EV) | OCR on invoices | Vendor, amount, and item matching |
| Commute | GPS trip log | Low-carbon trip heuristics (demo may use simulated result) |

## Project structure

```
EcoMark/
├── frontend/                 # Next.js dashboard — claims, balance, swaps
├── backend/
│   ├── app/                  # FastAPI app (routes, services, models)
│   │   └── integrations/     # verification + chain (mock or real)
│   ├── verification/         # Real satellite + OCR pipelines
│   └── tests/
├── contracts/                # Solidity CreditRegistry (ERC-1155) + Hardhat
├── blockchain/               # Pair-B reference scripts (optional standalone API)
├── requirements.txt
├── .env.example
└── README.md
```

## Quick start (demo — mocks, no keys)

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r ../requirements.txt
export USE_MOCKS=true
export MOCK_CHAIN_FAILURES=false
uvicorn app.main:app --reload --app-dir .

# Frontend (other terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 — login as any seeded user (Priya, Arjun, Meera, Kabir).

Optional demo data:

```bash
cd backend && python -m app.seed --demo
```

## Real blockchain (local Hardhat)

```bash
cd contracts
npm install
npx hardhat node          # terminal 1 — keeps chain running
npm run deploy:local      # terminal 2 — prints CONTRACT_ADDRESS
```

Copy the printed address and Hardhat account #0 key into `backend/.env`:

```env
USE_MOCKS=false
LOCAL_RPC=http://127.0.0.1:8545
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
CONTRACT_ADDRESS=0x...
```

Then restart the backend. Category mapping on-chain: `land=1`, `energy=2`, `water=3`, `transport=4`. Amounts use 4 decimal places (1.0 credit = 10_000 base units).

### Contract tests

```bash
cd contracts && npm test
```

## Real verification

- **Satellite:** `earthengine authenticate`, set `EE_PROJECT`, `USE_MOCKS=false`.
- **OCR:** install Tesseract (`apt install tesseract-ocr` / `brew install tesseract`).
- The app can still force mocks with `USE_MOCKS=true` as a stage-safe backup.

## API surface (backend)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness |
| GET | `/api/users` | Seeded profiles |
| POST | `/api/claims` | Submit claim (+ optional file) |
| GET | `/api/claims` | List claims |
| GET | `/api/claims/{id}` | Claim detail |
| POST | `/api/claims/{id}/retry` | Retry mint after `mint_failed` |
| GET | `/api/balance` | On-chain (or mock) balances |
| POST | `/api/swaps` | Propose category swap |
| POST | `/api/swaps/{id}/accept` | Accept + settle on ledger |
| POST | `/api/swaps/{id}/reject` | Reject offer |

Auth is demo-style: pass `X-User-Id: usr_priya001` (defaults to first user).

## Team split

- **Verification** — satellite + OCR pipelines (`backend/verification/`)
- **Blockchain** — `CreditRegistry.sol`, `chain.py`, deploy scripts
- **Frontend/Backend** — Next.js UI + FastAPI claim/swap pipeline

## Status

| Piece | State |
|---|---|
| Satellite NDVI | Live Earth Engine path + mock fallback |
| OCR bills/invoices | Built; energy baseline may use placeholder without history |
| Commute GPS | Simulated path available for demos |
| Mock end-to-end flow | Reliable stage switch (`USE_MOCKS=true`) |
| ERC-1155 registry | Implemented + Hardhat tests |
| Mint / balance / atomic swap | Real `chain.py` wired to contract |
| Double-claim prevention | `usedClaims` mapping on-chain |

## License

MIT
