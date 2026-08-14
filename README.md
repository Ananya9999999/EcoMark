# EcoMark

Verifying real-world climate actions via satellite (NDVI) and OCR, then issuing tradeable credits on-chain.

Built for Smart India Hackathon 2026.

## What this is

Most carbon credit systems are built for institutions — solar farms, forestry projects — and verified through slow, expensive third-party audits. EcoMark verifies individual and community-level climate actions instead, using the right verification method for each action type, and issues credits that can be **traded directly between people** (barter-style), not just sold on a marketplace.

**Verification is two-tier, matched to what's actually observable:**

| Action type | Example | Verification method |
|---|---|---|
| Land / community | Tree planting, pond restoration | Satellite imagery (Sentinel-2), NDVI change detection |
| Energy / water | Reduced electricity or water use | OCR on utility bills + trend comparison |
| Purchases | EV, solar panels, sustainable products | OCR on receipts + category matching |
| Commute *(stretch goal)* | Biking / walking instead of driving | GPS trip logs, route-matching |

Verified actions mint credits on a Polygon-based ledger, which users can swap with each other across categories (e.g. energy credits for transport credits) — the ledger prevents double-counting and double-spending.

## Tech stack

- **Frontend:** Next.js, TypeScript, Tailwind
- **Backend:** FastAPI (Python)
- **Verification:** Google Earth Engine API (satellite/NDVI), Tesseract OCR
- **Blockchain:** Solidity (ERC-1155), Polygon Amoy testnet, web3.py

## Project structure

```
ecomark/
├── frontend/           # Next.js dashboard — claims, balance, swap marketplace
├── backend/
│   ├── verification/   # Satellite + OCR pipelines, verification endpoints
│   └── api/            # Routes tying verification + blockchain + frontend together
├── contracts/          # Solidity smart contracts, deploy scripts
├── .env.example
├── CONTRIBUTING.md
└── README.md
```

## Getting started

### Prerequisites
- Python 3.10+
- Node.js 18+
- A Google Earth Engine account registered for non-commercial use ([sign up](https://earthengine.google.com/))
- Tesseract OCR installed locally (`sudo apt install tesseract-ocr` / `brew install tesseract`)
- A funded wallet on Polygon Amoy testnet ([faucet](https://faucet.polygon.technology/))

### Setup

```bash
git clone <repo-url>
cd ecomark
cp .env.example .env   # fill in your own keys
```

**Verification service (Pair A)**
```bash
cd backend/verification
pip install -r requirements.txt
earthengine authenticate   # one-time browser login
python satellite.py        # sanity check: should print NDVI data for a test location
python ocr.py path/to/sample_bill.jpg   # sanity check: should print extracted text
```

**Contracts (Pair B)**
```bash
cd contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network amoy
```

**Frontend + API (Pair C)**
```bash
cd frontend
npm install
npm run dev

# in a separate terminal
cd backend/api
pip install -r requirements.txt
uvicorn main:app --reload
```

## Team

6-person team, split into three pairs:
- **Verification** — satellite + OCR pipelines
- **Blockchain** — smart contracts, minting, swaps
- **Frontend/Backend** — dashboard, claim flow, integration glue

See `CONTRIBUTING.md` for branching and PR conventions.

## Status

🚧 Active hackathon build. See open issues/PRs for current progress.

## License

MIT
