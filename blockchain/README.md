# SIH-Digital-Carbon-Credit-Verification-system

# Hackathon Pair B — Progress Update

## Day 0 — Setup ✅

- Node.js + npm installed
- Project initialized with `npm init -y`
- Hardhat package installed
- Python virtual environment created
- Installed:
  - FastAPI
  - Uvicorn
  - Web3
  - python-dotenv
  - Pydantic
- `.env` created
- `.gitignore` created
- Git repository initialized

Contract
Created CreditRegistry.sol using:
ERC-1155
OpenZeppelin Ownable
mintCredit() restricted with onlyOwner
Deployment
Environment: Remix VM (Cancun)
No MetaMask / Polygon Amoy / faucet required
Contract deployed successfully
Testing
Level 1.1 ✅
Account 1 deployed the contract
Minted 50 credits
Category ID: 1
balanceOf(Account 1, 1) returned 50
Level 1.2 ✅
Switched to Account 2
Attempted mintCredit()
Transaction reverted with:
OwnableUnauthorizedAccount

This confirms the onlyOwner restriction works.

### `.env` (currently)

````env
LOCAL_RPC="http://127.0.0.1:8545"
PRIVATE_KEY=""
CONTRACT_ADDRESS=""



# Sample Hardhat 3 Project (minimal)

This project has a minimal setup of Hardhat 3, without any plugins.

## What's included?

The project includes native support for TypeScript, Hardhat scripts, tasks, and support for Solidity compilation and tests.
## Day 2 — Credit Registry & Backend Preparation ✅

### Credit Registry Contract

- Continued development and testing of `CreditRegistry.sol`
- Implemented ERC-1155 based carbon credit representation
- Carbon credits are identified using category/token IDs
- Implemented owner-restricted credit minting through `mintCredit()`
- Implemented on-chain balance lookup through `balanceOf()`
- Added claim identification using a hashed claim ID
- Verified owner-only access control
- Unauthorized accounts are prevented from performing restricted minting operations

### ABI

- Extracted the `CreditRegistry` contract ABI for backend integration
- Created:

```text
abi.json
````
