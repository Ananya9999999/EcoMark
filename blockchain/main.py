from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import blockchain

app = FastAPI(title="Credit Registry API")


class MintRequest(BaseModel):
    address: str
    category_id: int
    amount: int
    claim_id: str


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Credit Registry API"
    }


@app.post("/mint")
def mint(req: MintRequest):
    try:
        tx_hash = blockchain.mint_credit(
            req.address,
            req.category_id,
            req.amount,
            req.claim_id
        )

        return {
            "status": "success",
            "tx_hash": tx_hash
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


@app.get("/balance/{address}/{category_id}")
def balance(address: str, category_id: int):
    try:
        result = blockchain.get_balance(
            address,
            category_id
        )

        return {
            "address": address,
            "category_id": category_id,
            "balance": result
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )