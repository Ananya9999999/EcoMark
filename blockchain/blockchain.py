
import json
import os

from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

# Connect Python to your local Hardhat blockchain
w3 = Web3(Web3.HTTPProvider(os.getenv("LOCAL_RPC")))

if not w3.is_connected():
    raise Exception("Could not connect to Hardhat at LOCAL_RPC")

print("Connected to Hardhat")
print("Chain ID:", w3.eth.chain_id)

# Backend wallet = Hardhat Account #0
account = w3.eth.account.from_key(os.getenv("PRIVATE_KEY"))

print("Backend wallet:", account.address)

# Load contract ABI
with open("abi.json") as f:
    abi = json.load(f)

# Connect to deployed CreditRegistry contract
contract = w3.eth.contract(
    address=Web3.to_checksum_address(
        os.getenv("CONTRACT_ADDRESS")
    ),
    abi=abi
)


def mint_credit(
    to_address: str,
    category_id: int,
    amount: int,
    claim_id: str
):
    claim_hash = Web3.keccak(text=claim_id)

    tx = contract.functions.mintCredit(
        Web3.to_checksum_address(to_address),
        category_id,
        amount,
        claim_hash
    ).build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address),
        "gas": 300000,
        "gasPrice": w3.eth.gas_price,
    })

    # Sign locally with Account #0
    signed = account.sign_transaction(tx)

    # Send signed transaction to Hardhat
    tx_hash = w3.eth.send_raw_transaction(
        signed.raw_transaction
    )

    # Wait for blockchain confirmation
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

    return receipt.transactionHash.hex()


def get_balance(
    address: str,
    category_id: int
) -> int:
    return contract.functions.balanceOf(
        Web3.to_checksum_address(address),
        category_id
    ).call()
