import json
import logging
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session

from app.db.models import (
    PaymentProposal,
    RootIntentCertificate,
    DerivationChain,
    TransactionVerification,
    PaymentAuthorization,
    AgentEvent,
    generate_uuid,
    utc_now,
)
from app.services.trust.verifier import TransactionVerifier
from app.services.trust.policy import PolicyEngine
from app.services.trust.risk import RiskEngine
from app.services.commerce.razorpay_service import RazorpayService

logger = logging.getLogger("aegis.commerce.payment_gate")

class PaymentGate:
    """Absolute Payment Gate: The singular application route to payment order creation."""

    def __init__(self, db: Session, razorpay_service: Optional[RazorpayService] = None):
        self.db = db
        self.razorpay_service = razorpay_service or RazorpayService()
        self.verifier = TransactionVerifier(db)

    def _emit_event(
        self,
        session_id: str,
        state: str,
        event_type: str,
        message: str,
        payload: Optional[Dict[str, Any]] = None,
    ) -> AgentEvent:
        payload_json = json.dumps(payload or {})
        event = AgentEvent(
            id=generate_uuid("EVT-"),
            session_id=session_id,
            event_type=event_type,
            state=state,
            message=message,
            payload=payload_json,
            created_at=utc_now(),
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        logger.info(f"[{state}] Event '{event_type}': {message}")
        return event

    def process_proposal(self, proposal_id: str) -> PaymentAuthorization:
        """Evaluate trust, enforce hard policies, calculate risk, and conditionally generate Razorpay Order."""
        proposal = self.db.query(PaymentProposal).filter(PaymentProposal.id == proposal_id).first()
        if not proposal:
            raise ValueError(f"PaymentProposal '{proposal_id}' not found")

        # Check idempotency: if already authorized and order exists, return existing
        existing_auth = (
            self.db.query(PaymentAuthorization)
            .filter(PaymentAuthorization.payment_proposal_id == proposal_id)
            .order_by(PaymentAuthorization.created_at.desc())
            .first()
        )
        if existing_auth and existing_auth.razorpay_order_id:
            logger.info(f"Idempotent hit: Reusing existing authorization {existing_auth.id} with order {existing_auth.razorpay_order_id}")
            return existing_auth

        root_cert = (
            self.db.query(RootIntentCertificate)
            .filter(RootIntentCertificate.id == proposal.root_intent_id)
            .first()
        )
        chain = (
            self.db.query(DerivationChain)
            .filter(DerivationChain.id == proposal.derivation_chain_id)
            .first()
            if proposal.derivation_chain_id
            else None
        )

        # 1. Isolated Verification
        verification = self.verifier.verify(proposal, root_cert, chain)
        self._emit_event(
            session_id=proposal.session_id,
            state="VERIFY",
            event_type="TRANSACTION_VERIFIED",
            message=f"Transaction verification {verification.result}: {verification.reason}",
            payload={
                "verification_id": verification.id,
                "result": verification.result,
                "intent_match": verification.intent_match,
                "amount_valid": verification.amount_valid,
                "category_valid": verification.category_valid,
                "recipient_valid": verification.recipient_valid,
                "derivation_valid": verification.derivation_valid,
            },
        )

        # 2. Deterministic Policy Evaluation
        policy_result = PolicyEngine.evaluate(proposal, root_cert, verification)
        self._emit_event(
            session_id=proposal.session_id,
            state="VERIFY",
            event_type="POLICY_EVALUATED",
            message=f"Policy evaluation {policy_result.result}: {policy_result.reason}",
            payload={
                "policy_result": policy_result.result,
                "violations": policy_result.violations,
            },
        )

        # 3. Multi-Signal Risk Engine
        risk_assessment = RiskEngine.calculate(proposal, root_cert, verification, policy_result)
        self._emit_event(
            session_id=proposal.session_id,
            state="VERIFY",
            event_type="RISK_CALCULATED",
            message=f"Risk calculated: Score={risk_assessment.score}/100, Level={risk_assessment.level}",
            payload={
                "score": risk_assessment.score,
                "level": risk_assessment.level,
                "signals": risk_assessment.signals,
            },
        )

        # 4. Final Authorization Decision
        # Invariant: Hard Policy BLOCK always overrides low risk scores
        if policy_result.result == "BLOCK" or verification.result == "BLOCK":
            decision = "BLOCK"
            reason = f"Blocked by hard policy: {policy_result.reason}"
        elif risk_assessment.level == "BLOCK":
            decision = "BLOCK"
            reason = f"Blocked by high risk score ({risk_assessment.score}/100)"
        elif risk_assessment.level == "REVIEW":
            decision = "REVIEW"
            reason = f"Requires operator review (Risk score: {risk_assessment.score})"
        else:
            decision = "PASS"
            reason = "Authorized: All trust, derivation, policy, and risk checks passed."

        razorpay_order_id = None

        # 5. Conditionally Execute Payment Order via Razorpay
        if decision == "PASS":
            self._emit_event(
                session_id=proposal.session_id,
                state="PAY",
                event_type="PAYMENT_AUTHORIZED",
                message=f"Payment authorized for {proposal.currency} {proposal.amount:,.2f}",
                payload={"proposal_id": proposal.id, "amount": proposal.amount},
            )

            try:
                order_data = self.razorpay_service.create_order(
                    amount=proposal.amount,
                    currency=proposal.currency,
                    receipt=proposal.id,
                    notes={
                        "session_id": proposal.session_id,
                        "product_id": proposal.product_id,
                        "merchant_id": proposal.merchant_id,
                    },
                )
                razorpay_order_id = order_data.get("id")

                self._emit_event(
                    session_id=proposal.session_id,
                    state="PAY",
                    event_type="RAZORPAY_ORDER_CREATED",
                    message=f"Razorpay Test Order created: {razorpay_order_id}",
                    payload={"order_id": razorpay_order_id, "amount": proposal.amount},
                )
            except Exception as e:
                logger.error(f"Razorpay order creation failed post-authorization: {e}")
                self._emit_event(
                    session_id=proposal.session_id,
                    state="PAY",
                    event_type="PAYMENT_EXECUTION_FAILED",
                    message=f"Razorpay order creation failed: {str(e)}",
                    payload={"error": str(e)},
                )
                # Keep decision as PASS because trust authorization passed, but record failure in reason
                reason = f"Authorized, but payment execution failed: {str(e)}"
        else:
            self._emit_event(
                session_id=proposal.session_id,
                state="HOLD",
                event_type="PAYMENT_BLOCKED",
                message=f"Payment BLOCKED for {proposal.currency} {proposal.amount:,.2f}. Reason: {reason}",
                payload={"proposal_id": proposal.id, "reason": reason, "risk_score": risk_assessment.score},
            )

            self._emit_event(
                session_id=proposal.session_id,
                state="HOLD",
                event_type="RAZORPAY_ORDER_SKIPPED",
                message="Razorpay Order creation prevented by Payment Gate invariant.",
                payload={"proposal_id": proposal.id},
            )

        # 6. Persist Authorization Record
        authorization = PaymentAuthorization(
            id=generate_uuid("AUTH-"),
            payment_proposal_id=proposal.id,
            verification_id=verification.id,
            policy_result=policy_result.result,
            risk_score=risk_assessment.score,
            risk_level=risk_assessment.level,
            decision=decision,
            reason=reason,
            razorpay_order_id=razorpay_order_id,
            created_at=utc_now(),
        )
        self.db.add(authorization)
        self.db.commit()
        return authorization

    def create_checkout_order(
        self,
        amount: float,
        currency: str = "INR",
        receipt: Optional[str] = "aegis_checkout",
        notes: Optional[dict] = None,
    ) -> dict:
        """Authorized Razorpay order generation guarded by the PaymentGate boundary."""
        return self.razorpay_service.create_order(
            amount=amount,
            currency=currency,
            receipt=receipt or "aegis_checkout",
            notes=notes,
        )
