import pytest
from app.security.attack_lab import AttackLab
from app.db.models import AuditLedgerEntry

def test_amount_escalation_attack_interception(db_session):
    lab = AttackLab(db_session)
    record = lab.run_attack("amount-escalation")

    assert record.status == "DETECTED"
    assert record.policy_result == "BLOCK"
    assert record.payment_created is False
    assert record.risk_score == 100
    assert "exceeds authorized limit" in record.explanation.lower()

    # Verify zero payment order
    entry = db_session.query(AuditLedgerEntry).filter(AuditLedgerEntry.id == record.ledger_entry_id).first()
    assert entry is not None
    assert entry.amount == 15000.0
    assert entry.razorpay_order_id is None
