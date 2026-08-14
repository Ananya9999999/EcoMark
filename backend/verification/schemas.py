from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class ActionType(str, Enum):
    LAND = "land"       
    ENERGY = "energy"      
    PURCHASE = "purchase" 


class VerificationStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class LandClaim(BaseModel):
    claim_id: str
    user_id: str
    latitude: float
    longitude: float
    radius_m: float = 50
    claimed_action_date: str  


class BillClaim(BaseModel):
    claim_id: str
    user_id: str
    bill_image_path: str
    billing_period: Optional[str] = None  


class VerificationResult(BaseModel):
    claim_id: str
    action_type: ActionType
    status: VerificationStatus
    score: float = Field(ge=0, le=1, description="Confidence/strength of evidence, 0-1")
    evidence: dict = {}  
    notes: Optional[str] = None
