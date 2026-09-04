from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import RootIntentCertificate, DerivationChain, PaymentProposal
from app.schemas.trust import (
    RootIntentCertificateCreate,
    RootIntentCertificateResponse,
    DerivationChainResponse,
    DerivationStepResponse,
    TransactionVerificationResponse,
)
from app.services.trust.root_intent import issue_root_intent_certificate
from app.services.trust.verifier import TransactionVerifier

router = APIRouter(prefix="/trust", tags=["Trust Engine"])

@router.post("/root-intent", response_model=RootIntentCertificateResponse)
def create_root_intent_cert(
    payload: RootIntentCertificateCreate,
    db: Session = Depends(get_db),
):
    """Issue and cryptographically sign a new Root Intent Certificate."""
    cert = issue_root_intent_certificate(
        db=db,
        session_id=payload.session_id,
        category=payload.category,
        location=payload.location,
        max_amount=payload.max_amount,
        currency=payload.currency,
        start_date=payload.start_date,
        end_date=payload.end_date,
        recipient_constraints=payload.recipient_constraints,
        original_text=payload.original_text,
    )
    return RootIntentCertificateResponse(
        id=cert.id,
        session_id=cert.session_id,
        intent_id=cert.intent_id,
        category=cert.category,
        location=cert.location,
        max_amount=cert.max_amount,
        currency=cert.currency,
        start_date=cert.start_date,
        end_date=cert.end_date,
        recipient_constraints=cert.parsed_recipient_constraints,
        original_text=cert.original_text,
        immutable_hash=cert.immutable_hash,
        signature=cert.signature,
        status=cert.status,
        created_at=cert.created_at,
    )

@router.get("/root-intent/{intent_id}", response_model=RootIntentCertificateResponse)
def get_root_intent_cert(intent_id: str, db: Session = Depends(get_db)):
    """Retrieve a Root Intent Certificate by ID or session ID."""
    cert = (
        db.query(RootIntentCertificate)
        .filter((RootIntentCertificate.id == intent_id) | (RootIntentCertificate.session_id == intent_id))
        .order_by(RootIntentCertificate.created_at.desc())
        .first()
    )
    if not cert:
        raise HTTPException(status_code=404, detail=f"RootIntentCertificate '{intent_id}' not found")

    return RootIntentCertificateResponse(
        id=cert.id,
        session_id=cert.session_id,
        intent_id=cert.intent_id,
        category=cert.category,
        location=cert.location,
        max_amount=cert.max_amount,
        currency=cert.currency,
        start_date=cert.start_date,
        end_date=cert.end_date,
        recipient_constraints=cert.parsed_recipient_constraints,
        original_text=cert.original_text,
        immutable_hash=cert.immutable_hash,
        signature=cert.signature,
        status=cert.status,
        created_at=cert.created_at,
    )

@router.get("/derivation/{chain_id}", response_model=DerivationChainResponse)
def get_derivation_chain(chain_id: str, db: Session = Depends(get_db)):
    """Retrieve an entire derivation chain with its cryptographic steps."""
    chain = (
        db.query(DerivationChain)
        .filter((DerivationChain.id == chain_id) | (DerivationChain.session_id == chain_id))
        .order_by(DerivationChain.created_at.desc())
        .first()
    )
    if not chain:
        raise HTTPException(status_code=404, detail=f"DerivationChain '{chain_id}' not found")

    steps_resp = [
        DerivationStepResponse(
            id=s.id,
            chain_id=s.chain_id,
            sequence=s.sequence,
            action=s.action,
            description=s.description,
            input_data=s.parsed_input_data,
            output_data=s.parsed_output_data,
            previous_step_hash=s.previous_step_hash,
            step_hash=s.step_hash,
            created_at=s.created_at,
        )
        for s in chain.steps
    ]

    return DerivationChainResponse(
        id=chain.id,
        session_id=chain.session_id,
        root_intent_id=chain.root_intent_id,
        status=chain.status,
        final_hash=chain.final_hash,
        created_at=chain.created_at,
        steps=steps_resp,
    )

@router.post("/verify", response_model=TransactionVerificationResponse)
def verify_proposal_endpoint(proposal_id: str, db: Session = Depends(get_db)):
    """Execute isolated transaction verification on a payment proposal."""
    proposal = db.query(PaymentProposal).filter(PaymentProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail=f"PaymentProposal '{proposal_id}' not found")

    verifier = TransactionVerifier(db)
    verif = verifier.verify(proposal)

    return TransactionVerificationResponse(
        id=verif.id,
        proposal_id=verif.proposal_id,
        intent_match=verif.intent_match,
        amount_valid=verif.amount_valid,
        category_valid=verif.category_valid,
        recipient_valid=verif.recipient_valid,
        derivation_valid=verif.derivation_valid,
        policy_valid=verif.policy_valid,
        result=verif.result,
        reason=verif.reason,
        created_at=verif.created_at,
    )
