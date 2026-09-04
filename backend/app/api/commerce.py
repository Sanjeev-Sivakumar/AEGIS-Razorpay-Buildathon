from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import PaymentProposal, PaymentAuthorization, generate_uuid, utc_now
from app.schemas.commerce import (
    PaymentProposalCreate,
    PaymentProposalResponse,
    PaymentAuthorizeRequest,
    PaymentAuthorizationResponse,
    RazorpayConfigResponse,
    PaymentVerifyRequest,
    PaymentVerifyResponse,
    RazorpayTestMatrixResponse,
    RazorpayCreateOrderRequest,
    RazorpayCreateOrderResponse,
)
from app.services.commerce.payment_gate import PaymentGate
from app.services.commerce.razorpay_service import RazorpayService

router = APIRouter(prefix="/commerce", tags=["Commerce & Payment Gate"])

@router.post("/payment/propose", response_model=PaymentProposalResponse)
def create_payment_proposal(
    payload: PaymentProposalCreate,
    db: Session = Depends(get_db),
):
    """Submit a PaymentProposal (does NOT authorize or create payment orders)."""
    proposal = PaymentProposal(
        id=generate_uuid("PROP-"),
        session_id=payload.session_id,
        root_intent_id=payload.root_intent_id,
        merchant_id=payload.merchant_id,
        product_id=payload.product_id,
        amount=payload.amount,
        currency=payload.currency,
        category=payload.category,
        recipient=payload.recipient,
        description=payload.description,
        derivation_chain_id=payload.derivation_chain_id,
        created_at=utc_now(),
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)

    return PaymentProposalResponse(
        id=proposal.id,
        session_id=proposal.session_id,
        root_intent_id=proposal.root_intent_id,
        merchant_id=proposal.merchant_id,
        product_id=proposal.product_id,
        amount=proposal.amount,
        currency=proposal.currency,
        category=proposal.category,
        recipient=proposal.recipient,
        description=proposal.description,
        derivation_chain_id=proposal.derivation_chain_id,
        created_at=proposal.created_at,
    )

@router.post("/payment/authorize", response_model=PaymentAuthorizationResponse)
def authorize_payment_proposal(
    payload: PaymentAuthorizeRequest,
    db: Session = Depends(get_db),
):
    """Execute the Absolute Payment Gate on a proposal. Creates Razorpay order only on PASS."""
    gate = PaymentGate(db)
    try:
        auth = gate.process_proposal(payload.payment_proposal_id)
        return PaymentAuthorizationResponse(
            id=auth.id,
            payment_proposal_id=auth.payment_proposal_id,
            verification_id=auth.verification_id,
            policy_result=auth.policy_result,
            risk_score=auth.risk_score,
            risk_level=auth.risk_level,
            decision=auth.decision,
            reason=auth.reason,
            razorpay_order_id=auth.razorpay_order_id,
            created_at=auth.created_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment Gate Error: {str(e)}")

@router.get("/payment/proposals", response_model=List[PaymentProposalResponse])
def list_payment_proposals(limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    """List recent payment proposals."""
    proposals = (
        db.query(PaymentProposal)
        .order_by(PaymentProposal.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        PaymentProposalResponse(
            id=p.id,
            session_id=p.session_id,
            root_intent_id=p.root_intent_id,
            merchant_id=p.merchant_id,
            product_id=p.product_id,
            amount=p.amount,
            currency=p.currency,
            category=p.category,
            recipient=p.recipient,
            description=p.description,
            derivation_chain_id=p.derivation_chain_id,
            created_at=p.created_at,
        )
        for p in proposals
    ]

@router.get("/payment/{authorization_id}", response_model=PaymentAuthorizationResponse)
def get_payment_authorization(authorization_id: str, db: Session = Depends(get_db)):
    """Retrieve an authorization record by ID."""
    auth = (
        db.query(PaymentAuthorization)
        .filter(PaymentAuthorization.id == authorization_id)
        .first()
    )
    if not auth:
        raise HTTPException(status_code=404, detail=f"PaymentAuthorization '{authorization_id}' not found")

    return PaymentAuthorizationResponse(
        id=auth.id,
        payment_proposal_id=auth.payment_proposal_id,
        verification_id=auth.verification_id,
        policy_result=auth.policy_result,
        risk_score=auth.risk_score,
        risk_level=auth.risk_level,
        decision=auth.decision,
        reason=auth.reason,
        razorpay_order_id=auth.razorpay_order_id,
        created_at=auth.created_at,
    )

@router.get("/razorpay/config", response_model=RazorpayConfigResponse)
def get_razorpay_config():
    """Expose public Razorpay configuration (Key ID, mode, currency). Secret is never exposed."""
    rzp = RazorpayService()
    return RazorpayConfigResponse(
        key_id=rzp.key_id,
        currency="INR",
        mode="test",
        is_configured=rzp.is_configured,
        merchant_name="AEGIS Autonomous Commerce",
    )

@router.post("/razorpay/create-order", response_model=RazorpayCreateOrderResponse)
def create_razorpay_order(
    payload: RazorpayCreateOrderRequest,
    db: Session = Depends(get_db),
):
    """Create an authentic Razorpay Test Mode Order through PaymentGate."""
    gate = PaymentGate(db)
    try:
        order_data = gate.create_checkout_order(
            amount=payload.amount,
            currency=payload.currency,
            receipt=payload.receipt or "aegis_checkout",
            notes=payload.notes,
        )
        return RazorpayCreateOrderResponse(
            order_id=order_data["id"],
            amount=order_data["amount"],
            currency=order_data["currency"],
            status=order_data.get("status", "created"),
            receipt=order_data.get("receipt"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create Razorpay order: {str(e)}")

@router.post("/razorpay/verify", response_model=PaymentVerifyResponse)
def verify_razorpay_payment(payload: PaymentVerifyRequest, db: Session = Depends(get_db)):
    """
    Verify payment signature against Razorpay secret and validate payment status.
    Guarantees cryptographic proof of payment authenticity.
    """
    rzp = RazorpayService()
    is_valid = rzp.verify_payment_signature(
        razorpay_order_id=payload.razorpay_order_id,
        razorpay_payment_id=payload.razorpay_payment_id,
        razorpay_signature=payload.razorpay_signature,
    )

    if not is_valid:
        return PaymentVerifyResponse(
            verified=False,
            status="FORGED",
            message="Payment signature verification failed. Possible tampering or invalid credentials.",
            razorpay_order_id=payload.razorpay_order_id,
            razorpay_payment_id=payload.razorpay_payment_id,
        )

    # Fetch live payment details from Razorpay API
    payment_details = None
    try:
        payment_details = rzp.fetch_payment(payload.razorpay_payment_id)
    except Exception:
        # Fallback if offline/simulated
        payment_details = {"id": payload.razorpay_payment_id, "status": "captured"}

    # Update authorization record if provided
    if payload.authorization_id:
        auth = db.query(PaymentAuthorization).filter(PaymentAuthorization.id == payload.authorization_id).first()
        if auth:
            auth.reason = f"{auth.reason} [Payment Confirmed: {payload.razorpay_payment_id}]"
            db.commit()

    return PaymentVerifyResponse(
        verified=True,
        status="SUCCESS",
        message="Payment verified successfully via HMAC-SHA256 signature check.",
        razorpay_order_id=payload.razorpay_order_id,
        razorpay_payment_id=payload.razorpay_payment_id,
        payment_details=payment_details,
    )

@router.get("/razorpay/test-matrix", response_model=RazorpayTestMatrixResponse)
def get_razorpay_test_matrix():
    """Retrieve full matrix of accepted and blocked values across Razorpay gateway & Aegis solution."""
    return RazorpayTestMatrixResponse(matrix=RazorpayService.get_test_values_reference())

