import json
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.db.models import (
    AuditLedgerEntry,
    AttackRecord,
    PaymentAuthorization,
    PaymentProposal,
    RootIntentCertificate,
    DerivationChain,
    DerivationStep,
    TransactionVerification,
    GrowthPrediction,
)
from app.schemas.security import DecisionReplayResponse, ReplayStepResponse

logger = logging.getLogger("aegis.services.replay")

class DecisionReplayService:
    """
    Forensic Decision Replay Engine.
    Reconstructs the full immutable decision lifecycle from Root Intent to Audit Ledger.
    """

    def __init__(self, db: Session):
        self.db = db

    def replay(self, target_id: str) -> DecisionReplayResponse:
        """
        Reconstruct complete decision trajectory given a transaction, proposal, attack, or ledger ID.
        """
        # 1. Resolve Target Objects
        attack: Optional[AttackRecord] = None
        proposal: Optional[PaymentProposal] = None
        authorization: Optional[PaymentAuthorization] = None
        ledger_entry: Optional[AuditLedgerEntry] = None

        if target_id.startswith("ATK-"):
            attack = self.db.query(AttackRecord).filter(AttackRecord.id == target_id).first()
            if attack and attack.ledger_entry_id:
                ledger_entry = self.db.query(AuditLedgerEntry).filter(AuditLedgerEntry.id == attack.ledger_entry_id).first()
                if ledger_entry:
                    proposal = self.db.query(PaymentProposal).filter(PaymentProposal.id == ledger_entry.transaction_id).first()
        elif target_id.startswith("LEDGER-"):
            ledger_entry = self.db.query(AuditLedgerEntry).filter(AuditLedgerEntry.id == target_id).first()
            if ledger_entry:
                proposal = self.db.query(PaymentProposal).filter(PaymentProposal.id == ledger_entry.transaction_id).first()
        elif target_id.startswith("AUTH-"):
            authorization = self.db.query(PaymentAuthorization).filter(PaymentAuthorization.id == target_id).first()
            if authorization:
                proposal = self.db.query(PaymentProposal).filter(PaymentProposal.id == authorization.payment_proposal_id).first()
                ledger_entry = self.db.query(AuditLedgerEntry).filter(AuditLedgerEntry.transaction_id == authorization.id).first()
        elif target_id.startswith("PROP-"):
            proposal = self.db.query(PaymentProposal).filter(PaymentProposal.id == target_id).first()
            if proposal:
                authorization = self.db.query(PaymentAuthorization).filter(PaymentAuthorization.payment_proposal_id == proposal.id).first()
                ledger_entry = self.db.query(AuditLedgerEntry).filter(
                    (AuditLedgerEntry.transaction_id == proposal.id)
                    | (AuditLedgerEntry.transaction_id == (authorization.id if authorization else ""))
                ).first()
        else:
            # General ID lookup across all tables
            proposal = self.db.query(PaymentProposal).filter(
                (PaymentProposal.id == target_id) | (PaymentProposal.session_id == target_id)
            ).first()
            if not proposal:
                attack = self.db.query(AttackRecord).filter(AttackRecord.id == target_id).first()
            if not proposal and not attack:
                ledger_entry = self.db.query(AuditLedgerEntry).filter(
                    (AuditLedgerEntry.id == target_id) | (AuditLedgerEntry.transaction_id == target_id)
                ).first()

        if not proposal and not attack and not ledger_entry:
            raise ValueError(f"No transaction, proposal, attack, or ledger entry found matching ID: '{target_id}'")

        # Fetch associated records if proposal is found
        root_cert: Optional[RootIntentCertificate] = None
        chain: Optional[DerivationChain] = None
        verification: Optional[TransactionVerification] = None
        growth_pred: Optional[GrowthPrediction] = None

        if proposal:
            if not authorization:
                authorization = self.db.query(PaymentAuthorization).filter(PaymentAuthorization.payment_proposal_id == proposal.id).first()
            if not ledger_entry:
                ledger_entry = self.db.query(AuditLedgerEntry).filter(
                    (AuditLedgerEntry.transaction_id == proposal.id)
                    | (AuditLedgerEntry.transaction_id == (authorization.id if authorization else ""))
                ).first()

            root_cert = self.db.query(RootIntentCertificate).filter(RootIntentCertificate.id == proposal.root_intent_id).first()
            if proposal.derivation_chain_id:
                chain = self.db.query(DerivationChain).filter(DerivationChain.id == proposal.derivation_chain_id).first()
            if authorization and authorization.verification_id:
                verification = self.db.query(TransactionVerification).filter(TransactionVerification.id == authorization.verification_id).first()
            if proposal.product_id:
                growth_pred = self.db.query(GrowthPrediction).filter(GrowthPrediction.product_id == proposal.product_id).order_by(GrowthPrediction.created_at.desc()).first()

        # Build chronological Replay Steps
        steps: List[ReplayStepResponse] = []

        # Step 1: ROOT INTENT
        if root_cert:
            steps.append(
                ReplayStepResponse(
                    stage="ROOT_INTENT",
                    title="Cryptographic Root Intent Issued",
                    status="VALID",
                    details={
                        "certificate_id": root_cert.id,
                        "category": root_cert.category,
                        "max_budget": f"₹{root_cert.max_amount}" if root_cert.max_amount else "N/A",
                        "currency": root_cert.currency,
                        "location": root_cert.location or "N/A",
                        "intent_hash": f"{root_cert.immutable_hash[:16]}...",
                        "signature": f"{root_cert.signature[:16]}...",
                    },
                    timestamp=root_cert.created_at.isoformat(),
                )
            )

        # Step 2: GROWTH INTELLIGENCE & SELECTION
        if growth_pred:
            prob_pct = f"{(growth_pred.selection_probability * 100):.1f}%"
            steps.append(
                ReplayStepResponse(
                    stage="GROWTH",
                    title="AI-Buyer Selection Probability Calculated",
                    status="COMPUTED",
                    details={
                        "product_id": growth_pred.product_id,
                        "selection_probability": prob_pct,
                        "model_version": growth_pred.model_version,
                        "context_features": growth_pred.parsed_context_features,
                        "latency_ms": growth_pred.latency_ms,
                    },
                    timestamp=growth_pred.created_at.isoformat(),
                )
            )

        # Step 3: PAYMENT PROPOSAL
        if proposal:
            steps.append(
                ReplayStepResponse(
                    stage="PROPOSAL",
                    title="Agent Formulated Payment Proposal",
                    status="PROPOSED",
                    details={
                        "proposal_id": proposal.id,
                        "amount": f"₹{proposal.amount:.2f}",
                        "currency": proposal.currency,
                        "recipient": proposal.recipient,
                        "merchant_id": proposal.merchant_id,
                        "category": proposal.category,
                    },
                    timestamp=proposal.created_at.isoformat(),
                )
            )

        # Step 4: DERIVATION CHAIN
        if chain:
            chain_steps = (
                self.db.query(DerivationStep)
                .filter(DerivationStep.chain_id == chain.id)
                .order_by(DerivationStep.sequence.asc())
                .all()
            )
            steps.append(
                ReplayStepResponse(
                    stage="DERIVATION",
                    title=f"Cryptographic Derivation Chain ({len(chain_steps)} steps)",
                    status="VALID" if not (attack and not attack.derivation_valid) else "BROKEN",
                    details={
                        "chain_id": chain.id,
                        "steps_count": len(chain_steps),
                        "head_hash": f"{chain.final_hash[:16]}..." if chain.final_hash else "IN_PROGRESS",
                    },
                    timestamp=chain.created_at.isoformat(),
                )
            )

        # Step 5: VERIFICATION & POLICY & RISK
        if authorization or attack or verification:
            pol_result = authorization.policy_result if authorization else (attack.policy_result if attack else "BLOCK")
            r_score = authorization.risk_score if authorization else (attack.risk_score if attack else 100)
            r_level = authorization.risk_level if authorization else "BLOCK"
            dec = authorization.decision if authorization else "BLOCK"

            steps.append(
                ReplayStepResponse(
                    stage="TRUST",
                    title="Isolated Verification & Deterministic Policy Check",
                    status=pol_result,
                    details={
                        "policy_result": pol_result,
                        "decision": dec,
                        "risk_score": r_score,
                        "risk_level": r_level,
                        "reason": authorization.reason if authorization else (attack.explanation if attack else "N/A"),
                    },
                    timestamp=authorization.created_at.isoformat() if authorization else (attack.created_at.isoformat() if attack else ""),
                )
            )

        # Step 6: PAYMENT EXECUTION OR HOLD
        is_payment_created = False
        razorpay_order_id = None
        if authorization and authorization.decision == "PASS" and authorization.razorpay_order_id:
            is_payment_created = True
            razorpay_order_id = authorization.razorpay_order_id
            steps.append(
                ReplayStepResponse(
                    stage="PAYMENT",
                    title="PaymentGate Authorized — Razorpay Test Order Created",
                    status="CREATED",
                    details={
                        "razorpay_order_id": razorpay_order_id,
                        "status": "authorized",
                        "mode": "test",
                    },
                    timestamp=authorization.created_at.isoformat(),
                )
            )
        else:
            steps.append(
                ReplayStepResponse(
                    stage="PAYMENT",
                    title="Transaction Blocked / Held — Razorpay Order NOT Created",
                    status="BLOCKED",
                    details={
                        "razorpay_order_id": None,
                        "reason": "Policy violation or risk elevation intercepted by PaymentGate.",
                        "payment_created": False,
                    },
                    timestamp=authorization.created_at.isoformat() if authorization else (attack.created_at.isoformat() if attack else ""),
                )
            )

        # Step 7: AUDIT LEDGER COMMITMENT
        if ledger_entry:
            steps.append(
                ReplayStepResponse(
                    stage="LEDGER",
                    title="Cryptographic Hash Chain Commitment",
                    status="RECORDED",
                    details={
                        "ledger_entry_id": ledger_entry.id,
                        "outcome": ledger_entry.outcome,
                        "previous_hash": f"{ledger_entry.previous_hash[:16]}...",
                        "current_hash": f"{ledger_entry.current_hash[:16]}...",
                    },
                    timestamp=ledger_entry.created_at.isoformat(),
                )
            )

        final_outcome = ledger_entry.outcome if ledger_entry else (
            "AUTHORIZED" if is_payment_created else ("ATTACK_PREVENTED" if attack else "BLOCKED")
        )

        return DecisionReplayResponse(
            transaction_id=target_id,
            outcome=final_outcome,
            final_decision="PASS" if is_payment_created else "BLOCK",
            payment_created=is_payment_created,
            razorpay_order_id=razorpay_order_id,
            steps=steps,
        )
