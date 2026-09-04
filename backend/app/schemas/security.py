from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict

class AttackRunRequest(BaseModel):
    scenario: str
    custom_instruction: Optional[str] = None

class AttackResultResponse(BaseModel):
    attack_id: str
    scenario: str
    status: str  # DETECTED, BLOCKED
    root_intent_valid: bool
    derivation_valid: bool
    verification_result: str
    policy_result: str
    risk_score: int
    payment_created: bool
    explanation: str
    ledger_entry_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class LedgerEntryResponse(BaseModel):
    id: str
    transaction_id: str
    session_id: Optional[str] = None
    root_intent_id: Optional[str] = None
    merchant_id: Optional[str] = None
    product_id: Optional[str] = None
    amount: Optional[float] = None
    currency: str = "INR"
    recipient: Optional[str] = None
    discovery_reason: Optional[str] = None
    verification_reason: Optional[str] = None
    outcome: str
    risk_score: int
    policy_result: str
    verification_result: str
    razorpay_order_id: Optional[str] = None
    attack_scenario: Optional[str] = None
    previous_hash: str
    current_hash: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class LedgerVerificationResponse(BaseModel):
    valid: bool
    entries_checked: int
    broken_entries: List[str]
    details: Optional[str] = None

class ReplayStepResponse(BaseModel):
    stage: str  # ROOT_INTENT, GROWTH, PROPOSAL, TRUST, POLICY, RISK, PAYMENT, LEDGER
    title: str
    status: str  # VALID, BROKEN, PASS, BLOCK, CREATED, BLOCKED, RECORDED
    details: Dict[str, Any]
    timestamp: str

class DecisionReplayResponse(BaseModel):
    transaction_id: str
    outcome: str
    final_decision: str
    payment_created: bool
    razorpay_order_id: Optional[str] = None
    steps: List[ReplayStepResponse]
