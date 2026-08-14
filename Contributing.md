# Contributing to EcoMark

Thanks for contributing! This doc covers how our team works on this repo so we don't step on each other during the hackathon week.

## Project structure

```
/frontend    - Next.js dashboard
/backend     - FastAPI (OCR, satellite verification, scoring, blockchain calls)
/contracts   - Solidity smart contracts (Polygon)
```

## Branching

- `main` is always demo-ready. Never push directly to it.
- Create a feature branch off `main` for any work:
  ```
  git checkout -b <pair>/<short-description>
  ```
  Examples: `verification/ndvi-pipeline`, `blockchain/mint-function`, `frontend/claim-form`
- One branch per feature, not one branch per person. If you're pairing on something, share the branch.

## Commits

- Keep commits small and scoped to one change.
- Write commit messages that describe *what* changed, not just "fix" or "update":
  - Good: `Add NDVI delta calculation for before/after image pairs`
  - Avoid: `changes`, `wip`, `fix stuff`

## Pull requests

- Open a PR into `main` when your piece works in isolation (doesn't need to be the full feature, just not broken).
- Tag at least one person outside your pair to review, since cross-pair review catches schema mismatches early.
- PR description should answer:
  - What does this add/change?
  - How did you test it?
  - Anything the other pairs need to know (new env vars, changed API response shape, new dependencies)?

## Data schema changes

- The claim object and credit token structure are shared across all three pairs. If you need to change a field, **flag it in the team group first** before merging — a silent schema change breaks whoever's consuming it downstream.

## Environment setup

- Copy `.env.example` to `.env` and fill in your own keys (Earth Engine project ID, testnet RPC URL, etc.). Never commit `.env` or real API keys/private keys.
- If you add a new required env var, update `.env.example` in the same PR.

## Dependencies

- Adding a new package? Update the relevant `requirements.txt` / `package.json` in your PR so others can install it with one command.

## Questions / blockers

- Don't sit on a blocker for more than ~30 minutes without flagging it to the team. With a 1-week timeline, small delays compound fast.