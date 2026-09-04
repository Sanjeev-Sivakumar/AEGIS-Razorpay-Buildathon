from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict

class RootIntentCertificateCreate(BaseModel):
    session_id: str
    category: str
    location: Optional[str] = None
    max_amount: Optional[float] = None
    currency: str = "INR"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    recipient_constraints: Dict[str, Any] = Field(default_factory=dict)
    original_text: str

class RootIntentCertificateResponse(BaseModel):
    id: str
    session_id: str
    intent_id: Optional[str] = None
    category: str
    location: Optional[str] = None
    max_amount: Optional[float] = None
    currency: str = "INR"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    recipient_constraints: Dict[str, Any] = Field(default_factory=dict)
    original_text: str
    immutable_hash: str
    signature: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DerivationStepResponse(BaseModel):
    id: str
    chain_id: str
    sequence: int
    action: str
    description: str
    input_data: Dict[str, Any] = Field(default_factory=dict)
    output_data: Dict[str, Any] = Field(default_factory=dict)
    previous_step_hash: str
    step_hash: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DerivationChainResponse(BaseModel):
    id: str
    session_id: str
    root_intent_id: str
    status: str
    final_hash: Optional[str] = None
    created_at: datetime
    steps: List[DerivationStepResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

class TransactionVerificationResponse(BaseModel):
    id: str
    proposal_id: str
    intent_match: bool
    amount_valid: bool
    category_valid: bool
    recipient_valid: bool
    derivation_valid: bool
    policy_valid: bool
    result: str  # PASS, BLOCK
    reason: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
