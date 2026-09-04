import json
import hashlib
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.db.models import AuditLedgerEntry, generate_uuid, utc_now

logger = logging.getLogger("aegis.services.ledger")

GENESIS_PREVIOUS_HASH = "GENESIS"

def compute_ledger_hash(previous_hash: str, canonical_dict: Dict[str, Any]) -> str:
    """
    Compute cryptographic SHA-256 block hash for an audit ledger entry.
    Canonicalizes dictionary with sorted keys and compact separators.
    """
    canonical_json = json.dumps(canonical_dict, sort_keys=True, separators=(",", ":"))
    payload = f"{previous_hash}:{canonical_json}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()

class LedgerService:
    """
    Append-Only Cryptographic Audit Ledger Service.
    Enforces tamper-evident hash chaining across all commerce transactions and attacks.
    """

    def __init__(self, db: Session):
        self.db = db

    def commit_entry(
        self,
        transaction_id: str,
        outcome: str,
        risk_score: int,
        policy_result: str,
        verification_result: str,
        session_id: Optional[str] = None,
        root_intent_id: Optional[str] = None,
        merchant_id: Optional[str] = None,
        product_id: Optional[str] = None,
        amount: Optional[float] = None,
        currency: str = "INR",
        recipient: Optional[str] = None,
        discovery_reason: Optional[str] = None,
        verification_reason: Optional[str] = None,
        razorpay_order_id: Optional[str] = None,
        razorpay_payment_id: Optional[str] = None,
        attack_scenario: Optional[str] = None,
    ) -> AuditLedgerEntry:
        """Commit an immutable, hash-chained transaction entry to the shared audit ledger."""
        # Find the latest ledger entry to establish hash chain link
        last_entry = (
            self.db.query(AuditLedgerEntry)
            .order_by(AuditLedgerEntry.created_at.desc(), AuditLedgerEntry.id.desc())
            .first()
        )

        previous_hash = last_entry.current_hash if last_entry else GENESIS_PREVIOUS_HASH

        canonical_data = {
            "transaction_id": str(transaction_id),
            "session_id": str(session_id or ""),
            "root_intent_id": str(root_intent_id or ""),
            "merchant_id": str(merchant_id or ""),
            "product_id": str(product_id or ""),
            "amount": float(amount or 0.0),
            "currency": str(currency),
            "recipient": str(recipient or ""),
            "outcome": str(outcome),
            "risk_score": int(risk_score),
            "policy_result": str(policy_result),
            "verification_result": str(verification_result),
            "razorpay_order_id": str(razorpay_order_id or ""),
            "attack_scenario": str(attack_scenario or ""),
        }

        current_hash = compute_ledger_hash(previous_hash, canonical_data)

        entry = AuditLedgerEntry(
            id=generate_uuid("LEDGER-"),
            transaction_id=transaction_id,
            session_id=session_id,
            root_intent_id=root_intent_id,
            merchant_id=merchant_id,
            product_id=product_id,
            amount=amount,
            currency=currency,
            recipient=recipient,
            discovery_reason=discovery_reason,
            verification_reason=verification_reason,
            outcome=outcome,
            risk_score=risk_score,
            policy_result=policy_result,
            verification_result=verification_result,
            razorpay_order_id=razorpay_order_id,
            razorpay_payment_id=razorpay_payment_id,
            attack_scenario=attack_scenario,
            created_at=utc_now(),
            previous_hash=previous_hash,
            current_hash=current_hash,
        )

        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)
        logger.info(f"Ledger committed: {entry.id} outcome={outcome} hash={current_hash[:8]}...")
        return entry

    def verify_chain(self) -> Dict[str, Any]:
        """
        Verify cryptographic integrity of the entire audit ledger from Genesis to Head.
        Detects data tampering, hash modification, or broken parent links.
        """
        entries = (
            self.db.query(AuditLedgerEntry)
            .order_by(AuditLedgerEntry.created_at.asc(), AuditLedgerEntry.id.asc())
            .all()
        )

        if not entries:
            return {
                "valid": True,
                "entries_checked": 0,
                "broken_entries": [],
                "details": "Ledger is empty (Genesis state).",
            }

        broken_entries: List[str] = []
        expected_prev = GENESIS_PREVIOUS_HASH

        for idx, entry in enumerate(entries):
            # 1. Check continuity of parent link
            if entry.previous_hash != expected_prev:
                broken_entries.append(entry.id)
                return {
                    "valid": False,
                    "entries_checked": idx + 1,
                    "broken_entries": broken_entries,
                    "details": f"Broken chain link at entry {entry.id}: previous_hash '{entry.previous_hash}' != expected '{expected_prev}'.",
                }

            # 2. Recompute current hash from canonical data
            canonical_data = entry.to_canonical_dict()
            recomputed_hash = compute_ledger_hash(entry.previous_hash, canonical_data)

            if entry.current_hash != recomputed_hash:
                broken_entries.append(entry.id)
                return {
                    "valid": False,
                    "entries_checked": idx + 1,
                    "broken_entries": broken_entries,
                    "details": f"Data tampering detected at entry {entry.id}: stored current_hash does not match recomputed SHA-256.",
                }

            expected_prev = entry.current_hash

        return {
            "valid": True,
            "entries_checked": len(entries),
            "broken_entries": [],
            "details": f"All {len(entries)} ledger entries cryptographically verified.",
        }

    def get_tail(self, limit: int = 20) -> List[AuditLedgerEntry]:
        """Fetch the most recent ledger entries in reverse chronological order."""
        return (
            self.db.query(AuditLedgerEntry)
            .order_by(AuditLedgerEntry.created_at.desc())
            .limit(limit)
            .all()
        )

    def get_entry(self, entry_id_or_tx_id: str) -> Optional[AuditLedgerEntry]:
        """Lookup a ledger entry by entry ID or transaction/authorization ID."""
        return (
            self.db.query(AuditLedgerEntry)
            .filter(
                (AuditLedgerEntry.id == entry_id_or_tx_id)
                | (AuditLedgerEntry.transaction_id == entry_id_or_tx_id)
            )
            .first()
        )
