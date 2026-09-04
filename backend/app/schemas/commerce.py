from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict

class PaymentProposalCreate(BaseModel):
    session_id: str
    root_intent_id: str
    merchant_id: str
    product_id: str
    amount: float
    currency: str = "INR"
    category: str
    recipient: str
    description: Optional[str] = None
    derivation_chain_id: Optional[str] = None

class PaymentProposalResponse(BaseModel):
    id: str
    session_id: str
    root_intent_id: str
    merchant_id: str
    product_id: str
    amount: float
    currency: str = "INR"
    category: str
    recipient: str
    description: Optional[str] = None
    derivation_chain_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PaymentAuthorizeRequest(BaseModel):
    payment_proposal_id: str

class PaymentAuthorizationResponse(BaseModel):
    id: str
    payment_proposal_id: str
    verification_id: Optional[str] = None
    policy_result: str
    risk_score: int
    risk_level: str
    decision: str  # PASS, REVIEW, BLOCK
    reason: str
    razorpay_order_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class RazorpayConfigResponse(BaseModel):
    key_id: Optional[str] = None
    currency: str = "INR"
    mode: str = "test"
    is_configured: bool = False
    merchant_name: str = "AEGIS Autonomous Commerce"

class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    authorization_id: Optional[str] = None

class PaymentVerifyResponse(BaseModel):
    verified: bool
    status: str  # SUCCESS, FAILED, FORGED
    message: str
    razorpay_order_id: str
    razorpay_payment_id: str
    payment_details: Optional[Dict[str, Any]] = None

class RazorpayTestMatrixResponse(BaseModel):
    matrix: Dict[str, Any]

class RazorpayCreateOrderRequest(BaseModel):
    amount: float
    currency: str = "INR"
    receipt: Optional[str] = None
    notes: Optional[Dict[str, Any]] = None

class RazorpayCreateOrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str
    status: str
    receipt: Optional[str] = None

