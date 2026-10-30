"""Real blockchain integration for EcoMark.

Matches the mock_chain public interface exactly so the rest of the app
does not change when USE_MOCKS=false:

  mint_credit(user_address, category, amount, claim_id) -> tx_hash
  get_balance(user_address) -> {category: float}
  initiate_swap(...) -> swap_id
  accept_swap(swap_id, accepter_address) -> tx_hash
  get_pending_swaps(user_address) -> list[dict]

On-chain model (CreditRegistry, ERC-1155):
  - category strings map to token ids
  - display amounts use 4 decimal places → on-chain integer * SCALE
  - pending swap offers live off-chain (in-memory / process lifetime);
    acceptance calls the atomic ``swap`` function on the contract
  - claim ids are hashed to prevent double mint

Required env (when USE_MOCKS=false):
  LOCAL_RPC or WEB3_RPC_URL   e.g. http://127.0.0.1:8545
  PRIVATE_KEY                 owner/minter key (Hardhat account #0 ok)
  CONTRACT_ADDRESS            deployed CreditRegistry address
"""

from __future__ import annotations

import json
import os
import uuid
from pathlib import Path

from dotenv import load_dotenv
from eth_account import Account
from web3 import Web3

load_dotenv()

# 4 decimal places — matches mock_chain rounding
SCALE = 10_000

CATEGORY_TO_ID: dict[str, int] = {
    "land": 1,
    "energy": 2,
    "water": 3,
    "transport": 4,
}
ID_TO_CATEGORY: dict[int, str] = {v: k for k, v in CATEGORY_TO_ID.items()}

# Off-chain offer book (same shape as mock_chain)
_swaps: dict[str, dict] = {}

_w3: Web3 | None = None
_contract = None
_account = None
_abi: list | None = None


def _abi_path() -> Path:
    return Path(__file__).resolve().parent / "abi.json"


def _load_abi() -> list:
    global _abi
    if _abi is None:
        with open(_abi_path(), encoding="utf-8") as f:
            _abi = json.load(f)
    return _abi


def _connect():
    """Lazy web3 + contract connection. Raises RuntimeError if misconfigured."""
    global _w3, _contract, _account

    if _contract is not None:
        return _w3, _contract, _account

    rpc = os.getenv("LOCAL_RPC") or os.getenv("WEB3_RPC_URL") or ""
    private_key = os.getenv("PRIVATE_KEY") or ""
    contract_address = os.getenv("CONTRACT_ADDRESS") or ""

    missing = [
        name
        for name, val in (
            ("LOCAL_RPC or WEB3_RPC_URL", rpc),
            ("PRIVATE_KEY", private_key),
            ("CONTRACT_ADDRESS", contract_address),
        )
        if not val
    ]
    if missing:
        raise RuntimeError(
            "Blockchain not configured. Set "
            + ", ".join(missing)
            + " in the environment, or run with USE_MOCKS=true."
        )

    w3 = Web3(Web3.HTTPProvider(rpc))
    # Polygon Amoy / many testnets need extra-data middleware
    try:
        from web3.middleware import ExtraDataToPOAMiddleware
        w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
    except Exception:
        try:
            from web3.middleware import geth_poa_middleware
            w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        except Exception:
            pass

    if not w3.is_connected():
        raise RuntimeError(f"Cannot reach RPC at {rpc}")

    account = Account.from_key(private_key)
    checksum = Web3.to_checksum_address(contract_address)
    contract = w3.eth.contract(address=checksum, abi=_load_abi())

    _w3, _contract, _account = w3, contract, account
    return _w3, _contract, _account


def _to_units(amount: float) -> int:
    units = int(round(float(amount) * SCALE))
    if units <= 0:
        raise ValueError("amount must be positive")
    return units


def _from_units(units: int) -> float:
    return round(units / SCALE, 4)


def _category_id(category: str) -> int:
    if category not in CATEGORY_TO_ID:
        raise ValueError(f"Unknown category: {category}")
    return CATEGORY_TO_ID[category]


def _send_tx(fn) -> str:
    """Build, sign, send, wait. Returns tx hash hex."""
    w3, _, account = _connect()
    tx = fn.build_transaction(
        {
            "from": account.address,
            "nonce": w3.eth.get_transaction_count(account.address),
            "gas": 500_000,
            "gasPrice": w3.eth.gas_price,
            "chainId": w3.eth.chain_id,
        }
    )
    signed = account.sign_transaction(tx)
    raw = getattr(signed, "raw_transaction", None) or signed.rawTransaction
    tx_hash = w3.eth.send_raw_transaction(raw)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    if receipt.status != 1:
        raise RuntimeError("on-chain transaction reverted")
    return receipt.transactionHash.hex()


def mint_credit(user_address: str, category: str, amount: float, claim_id: str) -> str:
    """Mint `amount` of `category` credits to `user_address`. Returns tx hash."""
    _, contract, _ = _connect()
    to = Web3.to_checksum_address(user_address)
    cat_id = _category_id(category)
    units = _to_units(amount)
    # Deterministic claim hash; "seed" claims get a unique suffix so re-seed works
    claim_key = (
        claim_id
        if claim_id != "seed"
        else f"seed:{user_address}:{category}:{amount}:{uuid.uuid4().hex[:8]}"
    )
    claim_hash = Web3.keccak(text=str(claim_key))

    if contract.functions.usedClaims(claim_hash).call():
        raise RuntimeError("this claim was already minted on-chain")

    return _send_tx(
        contract.functions.mintCredit(to, cat_id, units, claim_hash)
    )


def get_balance(user_address: str) -> dict:
    """Return {category: float} for every known category with a non-zero balance."""
    _, contract, _ = _connect()
    address = Web3.to_checksum_address(user_address)
    out: dict[str, float] = {}
    for cat, cat_id in CATEGORY_TO_ID.items():
        raw = contract.functions.balanceOf(address, cat_id).call()
        if raw:
            out[cat] = _from_units(raw)
    return out


def initiate_swap(
    from_address: str,
    to_address: str,
    offer_category: str,
    offer_amount: float,
    want_category: str,
    want_amount: float,
) -> str:
    """Record a pending off-chain offer. Settlement happens in accept_swap."""
    _category_id(offer_category)
    _category_id(want_category)
    if offer_amount <= 0 or want_amount <= 0:
        raise ValueError("amounts must be positive")

    swap_id = f"swp_{uuid.uuid4().hex[:8]}"
    _swaps[swap_id] = {
        "swap_id": swap_id,
        "from_address": Web3.to_checksum_address(from_address),
        "to_address": Web3.to_checksum_address(to_address),
        "offer_category": offer_category,
        "offer_amount": float(offer_amount),
        "want_category": want_category,
        "want_amount": float(want_amount),
        "status": "pending",
    }
    return swap_id


def accept_swap(swap_id: str, accepter_address: str) -> str:
    """Execute atomic on-chain swap for a pending offer."""
    swap = _swaps.get(swap_id)
    if swap is None:
        raise ValueError(f"Unknown swap {swap_id}")
    if swap["status"] != "pending":
        raise ValueError(f"Swap {swap_id} is not pending")

    accepter = Web3.to_checksum_address(accepter_address)
    if accepter != swap["to_address"]:
        raise ValueError("accepter is not the counterparty for this swap")

    _, contract, _ = _connect()

    party_a = swap["from_address"]
    party_b = swap["to_address"]
    offer_id = _category_id(swap["offer_category"])
    want_id = _category_id(swap["want_category"])
    offer_units = _to_units(swap["offer_amount"])
    want_units = _to_units(swap["want_amount"])

    if contract.functions.balanceOf(party_a, offer_id).call() < offer_units:
        raise ValueError("Initiator has insufficient balance")
    if contract.functions.balanceOf(party_b, want_id).call() < want_units:
        raise ValueError("Accepter has insufficient balance")

    tx_hash = _send_tx(
        contract.functions.swap(
            party_a,
            [offer_id],
            [offer_units],
            party_b,
            [want_id],
            [want_units],
        )
    )
    swap["status"] = "accepted"
    return tx_hash


def get_pending_swaps(user_address: str) -> list:
    """Pending offers addressed to this wallet."""
    target = Web3.to_checksum_address(user_address)
    return [
        dict(s)
        for s in _swaps.values()
        if s["status"] == "pending" and s["to_address"] == target
    ]
