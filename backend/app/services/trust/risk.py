from dataclasses import dataclass
from typing import Dict
from app.config.settings import get_settings
from app.db.models import PaymentProposal, RootIntentCertificate, TransactionVerification
from app.services.trust.policy import PolicyEvaluationResult

@dataclass
class RiskAssessment:
    score: int
    level: str  # "SAFE", "REVIEW", "HIGH", "BLOCK"
    signals: Dict[str, int]

class RiskEngine:
    """Deterministic multi-signal risk fusion engine."""

    @staticmethod
    def calculate(
        proposal: PaymentProposal,
        root_cert: RootIntentCertificate,
        verification: TransactionVerification,
        policy_result: PolicyEvaluationResult,
    ) -> RiskAssessment:
        settings = get_settings()
        signals: Dict[str, int] = {
            "intent_mismatch": 0,
            "amount_anomaly": 0,
            "recipient_anomaly": 0,
            "category_mismatch": 0,
            "derivation_break": 0,
            "behavioral_anomaly": 0,
            "policy_violation": 0,
        }

        # 1. Intent Mismatch signal
        if not verification.intent_match:
            signals["intent_mismatch"] = 30

        # 2. Amount Anomaly signal
        if proposal.amount <= 0:
            signals["amount_anomaly"] = 30
        elif root_cert.max_amount is not None:
            if proposal.amount > root_cert.max_amount:
                signals["amount_anomaly"] = 30
            elif proposal.amount >= root_cert.max_amount * 0.95:
                # Close to upper bound limit (minor anomaly)
                signals["amount_anomaly"] = 8
            else:
                signals["amount_anomaly"] = 0

        # 3. Recipient Anomaly
        if not verification.recipient_valid:
            signals["recipient_anomaly"] = 20

        # 4. Category Mismatch
        if not verification.category_valid:
            signals["category_mismatch"] = 30

        # 5. Derivation Break
        if not verification.derivation_valid:
            signals["derivation_break"] = 40

        # 6. Policy Violation
        if policy_result.result == "BLOCK":
            signals["policy_violation"] = 50

        # Aggregate raw score
        total_score = sum(signals.values())
        clamped_score = min(100, max(0, total_score))

        # Determine level based on centralized settings
        if clamped_score <= settings.RISK_SAFE_MAX:
            level = "SAFE"
        elif clamped_score <= settings.RISK_REVIEW_MAX:
            level = "REVIEW"
        elif clamped_score <= settings.RISK_HIGH_MAX:
            level = "HIGH"
        else:
            level = "BLOCK"

        return RiskAssessment(
            score=clamped_score,
            level=level,
            signals=signals,
        )
