from dataclasses import dataclass, field
from typing import List, Optional
from sqlalchemy.orm import Session

from app.db.models import (
    PaymentProposal,
    RootIntentCertificate,
    DerivationChain,
    TransactionVerification,
    generate_uuid,
    utc_now,
)
from app.services.trust.root_intent import verify_certificate_integrity
from app.services.trust.derivation import DerivationValidator

@dataclass
class VerificationResult:
    is_pass: bool
    intent_match: bool
    amount_valid: bool
    category_valid: bool
    recipient_valid: bool
    derivation_valid: bool
    policy_valid: bool
    reasons: List[str] = field(default_factory=list)

class TransactionVerifier:
    """Isolated verifier inspecting trusted cryptographic and domain evidence."""

    def __init__(self, db: Session):
        self.db = db

    def verify(
        self,
        proposal: PaymentProposal,
        root_cert: Optional[RootIntentCertificate] = None,
        chain: Optional[DerivationChain] = None,
    ) -> TransactionVerification:
        """Perform comprehensive multi-dimensional verification on a payment proposal."""
        reasons: List[str] = []

        # 1. Root Intent Existence & Integrity
        if not root_cert:
            root_cert = (
                self.db.query(RootIntentCertificate)
                .filter(RootIntentCertificate.id == proposal.root_intent_id)
                .first()
            )

        if not root_cert:
            verif = TransactionVerification(
                id=generate_uuid("VERIF-"),
                proposal_id=proposal.id,
                intent_match=False,
                amount_valid=False,
                category_valid=False,
                recipient_valid=False,
                derivation_valid=False,
                policy_valid=False,
                result="BLOCK",
                reason="Root Intent Certificate missing or not found in trust store.",
                created_at=utc_now(),
            )
            self.db.add(verif)
            self.db.commit()
            return verif

        cert_intact = verify_certificate_integrity(root_cert)
        if not cert_intact:
            reasons.append("Root Intent Certificate cryptographic hash or signature verification failed (tampered).")

        # 2. Derivation Chain
        if not chain and proposal.derivation_chain_id:
            chain = (
                self.db.query(DerivationChain)
                .filter(DerivationChain.id == proposal.derivation_chain_id)
                .first()
            )

        if not chain:
            derivation_valid = False
            reasons.append("Derivation chain is missing for proposed transaction.")
        else:
            deriv_res = DerivationValidator.validate(
                chain=chain,
                root_cert=root_cert,
                proposal_amount=proposal.amount,
                proposal_category=proposal.category,
            )
            derivation_valid = deriv_res.is_valid
            if not derivation_valid:
                reasons.extend(deriv_res.errors)

        # 3. Category match
        category_valid = False
        if proposal.category and root_cert.category:
            p_cat = proposal.category.lower().strip()
            r_cat = root_cert.category.lower().strip()
            if p_cat == r_cat or p_cat in r_cat or r_cat in p_cat:
                category_valid = True
            else:
                reasons.append(f"Category mismatch: proposed '{proposal.category}', authorized '{root_cert.category}'.")
        else:
            reasons.append("Category missing in proposal or root intent.")

        # 4. Amount compliance
        amount_valid = True
        if proposal.amount <= 0:
            amount_valid = False
            reasons.append(f"Invalid transaction amount: {proposal.amount} (must be > 0).")
        elif root_cert.max_amount is not None:
            if proposal.amount > root_cert.max_amount:
                amount_valid = False
                reasons.append(
                    f"Amount exceeds limit: proposed {proposal.currency} {proposal.amount:,.2f} > authorized max {root_cert.currency} {root_cert.max_amount:,.2f}."
                )

        # 5. Currency compliance
        if proposal.currency != root_cert.currency:
            amount_valid = False
            reasons.append(f"Currency mismatch: proposed {proposal.currency}, authorized {root_cert.currency}.")

        # 6. Recipient constraints
        recipient_valid = True
        rc = root_cert.parsed_recipient_constraints
        if rc:
            allowed_recipients = rc.get("allowed_recipients", [])
            allowed_merchants = rc.get("allowed_merchants", [])

            if allowed_recipients and proposal.recipient not in allowed_recipients:
                recipient_valid = False
                reasons.append(f"Unauthorized recipient '{proposal.recipient}': not in authorized list.")

            if allowed_merchants and proposal.merchant_id not in allowed_merchants:
                recipient_valid = False
                reasons.append(f"Unauthorized merchant '{proposal.merchant_id}': not in authorized merchants.")

        # 7. Intent Match
        intent_match = cert_intact and category_valid and amount_valid

        # Synthesize Overall Verification Result
        is_pass = (
            cert_intact
            and derivation_valid
            and category_valid
            and amount_valid
            and recipient_valid
        )

        result_str = "PASS" if is_pass else "BLOCK"
        final_reason = (
            "Transaction satisfies root intent and cryptographic derivation constraints."
            if is_pass
            else " | ".join(reasons)
        )

        verif = TransactionVerification(
            id=generate_uuid("VERIF-"),
            proposal_id=proposal.id,
            intent_match=intent_match,
            amount_valid=amount_valid,
            category_valid=category_valid,
            recipient_valid=recipient_valid,
            derivation_valid=derivation_valid,
            policy_valid=is_pass,  # Verification baseline
            result=result_str,
            reason=final_reason,
            created_at=utc_now(),
        )
        self.db.add(verif)
        self.db.commit()
        self.db.refresh(verif)
        return verif
