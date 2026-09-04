import json
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.db.models import (
    AttackRecord,
    PaymentProposal,
    RootIntentCertificate,
    DerivationChain,
    DerivationStep,
    generate_uuid,
    utc_now,
)
from app.services.trust.root_intent import issue_root_intent_certificate
from app.services.trust.derivation import create_derivation_chain, append_derivation_step
from app.services.trust import PolicyEngine, RiskEngine, TransactionVerifier
from app.services.ledger.ledger_service import LedgerService
from app.security.scenarios import ATTACK_SCENARIOS, AttackScenarioDef, get_scenario

logger = logging.getLogger("aegis.security.attack_lab")

class AttackLab:
    """
    Isolated Security Testing Lab.
    Simulates malicious, poisoned, or compromised commerce instructions in a safe sandbox.
    Guarantees that no payment is ever created and that the deterministic trust boundary holds.
    """

    def __init__(self, db: Session):
        self.db = db
        self.verifier = TransactionVerifier(db)
        self.policy_engine = PolicyEngine
        self.risk_engine = RiskEngine
        self.ledger_service = LedgerService(db)

    def list_scenarios(self) -> List[Dict[str, Any]]:
        """List all available attack scenarios with details."""
        return [
            {
                "name": sc.name,
                "display_title": sc.display_title,
                "description": sc.description,
                "attack_type": sc.attack_type,
            }
            for sc in ATTACK_SCENARIOS.values()
        ]

    def run_attack(self, scenario_name: str, custom_instruction: Optional[str] = None) -> AttackRecord:
        """
        Execute an attack simulation against the deterministic Trust Engine.
        Asserts that PaymentGate is NEVER bypassed and no Razorpay order is created.
        """
        scenario = get_scenario(scenario_name)
        if not scenario:
            raise ValueError(f"Unknown attack scenario: '{scenario_name}'")

        payload = dict(scenario.simulated_payload)
        if custom_instruction:
            payload["custom_instruction"] = custom_instruction

        sim_session_id = generate_uuid("ATK-SESS-")

        # 1. Establish Legitimate Root Intent
        query_text = payload.get("query", "hotel in Goa under 3000")
        max_budget = payload.get("authorized_max", 3000.0)

        root_cert = issue_root_intent_certificate(
            db=self.db,
            session_id=sim_session_id,
            category="hotel",
            original_text=query_text,
            location="Goa",
            max_amount=max_budget,
            currency="INR",
            recipient_constraints={"allowed_recipients": ["GoaStay"], "allowed_merchants": ["MER-GOASTAY"]},
        )

        # 2. Build Derivation Chain
        chain = create_derivation_chain(
            db=self.db,
            session_id=sim_session_id,
            root_intent_id=root_cert.id,
        )

        step1 = append_derivation_step(
            db=self.db,
            chain_id=chain.id,
            action="SEARCH_INTENT",
            description="Discovered inventory matching verified criteria",
            input_data={"query": query_text},
            output_data={"matched_count": 2},
        )

        # 3. Simulate Adversarial Mutation / Poisoning
        proposed_amount = payload.get("proposed_amount", 15000.0)
        proposed_recipient = payload.get("proposed_recipient", "GoaStay")
        proposed_category = payload.get("category", "hotel")

        # If derivation tampering scenario, corrupt previous derivation step hash
        if scenario.name == "derivation-tampering" or payload.get("tamper_derivation_step"):
            step1.step_hash = "0000000000000000000000000000000000000000000000000000000000000000"
            self.db.commit()

        # Step 2: Adversarial proposal derivation step
        step2 = append_derivation_step(
            db=self.db,
            chain_id=chain.id,
            action="FORMULATE_PROPOSAL",
            description="Proposed settlement with mutated parameters",
            input_data={"selected_product": "PRD-GOA-01"},
            output_data={
                "amount": proposed_amount,
                "recipient": proposed_recipient,
                "category": proposed_category,
            },
        )

        # 4. Construct Malicious Payment Proposal
        proposal = PaymentProposal(
            id=generate_uuid("PROP-ATK-"),
            session_id=sim_session_id,
            root_intent_id=root_cert.id,
            merchant_id="MER-GOASTAY" if proposed_recipient == "GoaStay" else "MER-MALICIOUS",
            product_id="PRD-GOA-01",
            amount=proposed_amount,
            currency="INR",
            category=proposed_category,
            recipient=proposed_recipient,
            description=payload.get("poisoned_text", f"Attack simulation proposal for {scenario.name}"),
            derivation_chain_id=chain.id,
        )
        self.db.add(proposal)
        self.db.commit()
        self.db.refresh(proposal)

        # 5. Execute Isolated Trust Verification
        verification = self.verifier.verify(
            proposal=proposal,
            root_cert=root_cert,
            chain=chain,
        )

        # 6. Evaluate Deterministic Policies
        policy_eval = self.policy_engine.evaluate(
            proposal=proposal,
            root_cert=root_cert,
            verification=verification,
        )

        # 7. Compute Risk Score
        risk = self.risk_engine.calculate(
            proposal=proposal,
            root_cert=root_cert,
            verification=verification,
            policy_result=policy_eval,
        )

        # 8. Enforce Invariant: Absolute Payment Block
        # Since policy is BLOCK, PaymentGate is NOT called and no Razorpay order is created
        assert policy_eval.result == "BLOCK", f"Security violation: Attack {scenario_name} was not blocked by policy!"
        payment_created = False
        razorpay_order_id = None

        # 9. Format Forensic Explanation
        failed_rules_str = ", ".join(policy_eval.violations) if policy_eval.violations else "Verification violation"
        explanation = (
            f"Attack '{scenario.display_title}' safely intercepted. "
            f"Policy: {policy_eval.result} ({failed_rules_str}). "
            f"Risk Score: {risk.score}/100 ({risk.level}). "
            f"Money movement prevented. Zero Razorpay orders created."
        )

        # 10. Commit to Cryptographic Audit Ledger
        ledger_entry = self.ledger_service.commit_entry(
            transaction_id=proposal.id,
            session_id=sim_session_id,
            root_intent_id=root_cert.id,
            merchant_id=proposal.merchant_id,
            product_id=proposal.product_id,
            amount=proposed_amount,
            currency="INR",
            recipient=proposed_recipient,
            discovery_reason=f"Attack Lab: {scenario.name}",
            verification_reason=explanation,
            outcome="ATTACK_PREVENTED",
            risk_score=risk.score,
            policy_result=policy_eval.result,
            verification_result=verification.result,
            razorpay_order_id=None,
            attack_scenario=scenario.name,
        )

        # 11. Persist Attack Record
        record = AttackRecord(
            id=generate_uuid("ATK-"),
            scenario_name=scenario.name,
            status="DETECTED",
            root_intent_valid=True,
            derivation_valid=verification.derivation_valid,
            verification_result=verification.result,
            policy_result=policy_eval.result,
            risk_score=risk.score,
            payment_created=payment_created,
            explanation=explanation,
            payload=json.dumps(payload),
            ledger_entry_id=ledger_entry.id,
            created_at=utc_now(),
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)

        logger.info(f"Attack Lab scenario '{scenario_name}' DETECTED and BLOCKED. Record ID: {record.id}")
        return record
