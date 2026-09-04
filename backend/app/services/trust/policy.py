from dataclasses import dataclass, field
from typing import List, Optional
from app.db.models import PaymentProposal, RootIntentCertificate, TransactionVerification

@dataclass
class PolicyEvaluationResult:
    result: str  # "PASS" or "BLOCK"
    violations: List[str] = field(default_factory=list)
    reason: str = ""

class PolicyEngine:
    """Deterministic policy engine enforcing hard commercial invariants."""

    @staticmethod
    def evaluate(
        proposal: PaymentProposal,
        root_cert: Optional[RootIntentCertificate],
        verification: Optional[TransactionVerification],
    ) -> PolicyEvaluationResult:
        violations: List[str] = []

        # Rule 5: Root Intent Missing or Invalid
        if not root_cert:
            violations.append("Rule 5 Violated: Missing Root Intent Certificate")
            return PolicyEvaluationResult(
                result="BLOCK",
                violations=violations,
                reason="Policy Violation: Missing Root Intent Certificate.",
            )

        # Rule 6: Verification Missing
        if not verification:
            violations.append("Rule 6 Violated: Missing Transaction Verification")
            return PolicyEvaluationResult(
                result="BLOCK",
                violations=violations,
                reason="Policy Violation: Missing Transaction Verification.",
            )

        # Rule 1: Amount Exceeds Authorized Cap or Invalid
        if proposal.amount <= 0:
            violations.append("Rule 1 Violated: Amount must be greater than zero")
        elif root_cert.max_amount is not None and proposal.amount > root_cert.max_amount:
            violations.append(
                f"Rule 1 Violated: Proposed amount {proposal.currency} {proposal.amount:,.2f} exceeds authorized limit {root_cert.currency} {root_cert.max_amount:,.2f}"
            )

        # Rule 2: Category Mismatch
        if not proposal.category or not root_cert.category:
            violations.append("Rule 2 Violated: Undefined category")
        else:
            p_cat = proposal.category.lower().strip()
            r_cat = root_cert.category.lower().strip()
            if p_cat != r_cat and p_cat not in r_cat and r_cat not in p_cat:
                violations.append(
                    f"Rule 2 Violated: Category mismatch (proposed '{proposal.category}', authorized '{root_cert.category}')"
                )

        # Rule 3: Recipient Constraint Violation
        rc = root_cert.parsed_recipient_constraints
        if rc:
            allowed_recipients = rc.get("allowed_recipients", [])
            allowed_merchants = rc.get("allowed_merchants", [])
            if allowed_recipients and proposal.recipient not in allowed_recipients:
                violations.append(f"Rule 3 Violated: Recipient '{proposal.recipient}' is not authorized")
            if allowed_merchants and proposal.merchant_id not in allowed_merchants:
                violations.append(f"Rule 3 Violated: Merchant '{proposal.merchant_id}' is not authorized")

        # Rule 4: Derivation Failure
        if not verification.derivation_valid:
            violations.append("Rule 4 Violated: Derivation chain failed structural or semantic validation")

        # Rule 7: Currency Mismatch
        if proposal.currency.upper() != root_cert.currency.upper():
            violations.append(
                f"Rule 7 Violated: Currency mismatch (proposed '{proposal.currency}', authorized '{root_cert.currency}')"
            )

        is_pass = len(violations) == 0
        result_str = "PASS" if is_pass else "BLOCK"
        reason = (
            "All deterministic policy rules satisfied."
            if is_pass
            else " | ".join(violations)
        )

        return PolicyEvaluationResult(
            result=result_str,
            violations=violations,
            reason=reason,
        )
