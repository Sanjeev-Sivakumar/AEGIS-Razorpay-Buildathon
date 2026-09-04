import hashlib
import json
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.db.models import DerivationChain, DerivationStep, RootIntentCertificate, generate_uuid, utc_now

@dataclass
class DerivationValidationResult:
    is_valid: bool
    structural_valid: bool
    semantic_valid: bool
    errors: List[str] = field(default_factory=list)
    step_count: int = 0

def compute_step_hash(
    previous_step_hash: str,
    sequence: int,
    action: str,
    description: str,
    input_data: Optional[Dict[str, Any]] = None,
    output_data: Optional[Dict[str, Any]] = None,
) -> str:
    """Compute cryptographic SHA-256 step hash linking to previous step."""
    payload = {
        "previous_step_hash": previous_step_hash,
        "sequence": sequence,
        "action": action.strip().upper(),
        "description": description.strip(),
        "input_data": input_data or {},
        "output_data": output_data or {},
    }
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()

def create_derivation_chain(
    db: Session,
    session_id: str,
    root_intent_id: str,
) -> DerivationChain:
    """Initialize a new append-only derivation chain linked to a root intent certificate."""
    chain = DerivationChain(
        id=generate_uuid("DC-"),
        session_id=session_id,
        root_intent_id=root_intent_id,
        status="IN_PROGRESS",
        created_at=utc_now(),
    )
    db.add(chain)
    db.commit()
    db.refresh(chain)
    return chain

def append_derivation_step(
    db: Session,
    chain_id: str,
    action: str,
    description: str,
    input_data: Optional[Dict[str, Any]] = None,
    output_data: Optional[Dict[str, Any]] = None,
) -> DerivationStep:
    """Append a cryptographically chained derivation step."""
    chain = db.query(DerivationChain).filter(DerivationChain.id == chain_id).first()
    if not chain:
        raise ValueError(f"DerivationChain '{chain_id}' not found")

    # Determine sequence and previous hash
    last_step = (
        db.query(DerivationStep)
        .filter(DerivationStep.chain_id == chain_id)
        .order_by(DerivationStep.sequence.desc())
        .first()
    )

    if last_step:
        sequence = last_step.sequence + 1
        previous_step_hash = last_step.step_hash
    else:
        sequence = 1
        root_cert = db.query(RootIntentCertificate).filter(RootIntentCertificate.id == chain.root_intent_id).first()
        previous_step_hash = root_cert.immutable_hash if root_cert else "GENESIS_INTENT_ROOT"

    step_hash = compute_step_hash(
        previous_step_hash=previous_step_hash,
        sequence=sequence,
        action=action,
        description=description,
        input_data=input_data,
        output_data=output_data,
    )

    step = DerivationStep(
        id=generate_uuid("STEP-"),
        chain_id=chain_id,
        sequence=sequence,
        action=action,
        description=description,
        input_data=json.dumps(input_data or {}),
        output_data=json.dumps(output_data or {}),
        previous_step_hash=previous_step_hash,
        step_hash=step_hash,
        created_at=utc_now(),
    )
    db.add(step)
    chain.final_hash = step_hash
    db.commit()
    db.refresh(step)
    return step

class DerivationValidator:
    """Validates both structural cryptographic integrity and semantic policy compliance of a derivation chain."""

    @staticmethod
    def validate(
        chain: DerivationChain,
        root_cert: RootIntentCertificate,
        proposal_amount: Optional[float] = None,
        proposal_category: Optional[str] = None,
    ) -> DerivationValidationResult:
        errors: List[str] = []
        steps = chain.steps
        if not steps:
            return DerivationValidationResult(
                is_valid=False,
                structural_valid=False,
                semantic_valid=False,
                errors=["Derivation chain contains zero steps"],
                step_count=0,
            )

        # 1. Structural Validation
        structural_valid = True
        expected_prev = root_cert.immutable_hash

        for idx, step in enumerate(steps):
            expected_seq = idx + 1
            if step.sequence != expected_seq:
                structural_valid = False
                errors.append(f"Sequence break at step {step.id}: expected {expected_seq}, got {step.sequence}")

            if step.previous_step_hash != expected_prev:
                structural_valid = False
                errors.append(
                    f"Hash link mismatch at step {step.sequence}: expected previous hash {expected_prev[:12]}..., got {step.previous_step_hash[:12]}..."
                )

            # Recompute step hash
            recomputed = compute_step_hash(
                previous_step_hash=step.previous_step_hash,
                sequence=step.sequence,
                action=step.action,
                description=step.description,
                input_data=step.parsed_input_data,
                output_data=step.parsed_output_data,
            )
            if recomputed != step.step_hash:
                structural_valid = False
                errors.append(f"Tampered step data at step {step.sequence}: hash does not match content")

            expected_prev = step.step_hash

        # 2. Semantic Integrity Validation
        semantic_valid = True
        if proposal_amount is not None and root_cert.max_amount is not None:
            if proposal_amount > root_cert.max_amount:
                semantic_valid = False
                errors.append(
                    f"Semantic derivation failure: proposed amount ({proposal_amount}) exceeds authorized max ({root_cert.max_amount})"
                )

        if proposal_category and root_cert.category:
            if proposal_category.lower() not in root_cert.category.lower() and root_cert.category.lower() not in proposal_category.lower():
                semantic_valid = False
                errors.append(
                    f"Semantic derivation failure: proposed category '{proposal_category}' does not match root intent '{root_cert.category}'"
                )

        is_valid = structural_valid and semantic_valid
        return DerivationValidationResult(
            is_valid=is_valid,
            structural_valid=structural_valid,
            semantic_valid=semantic_valid,
            errors=errors,
            step_count=len(steps),
        )
