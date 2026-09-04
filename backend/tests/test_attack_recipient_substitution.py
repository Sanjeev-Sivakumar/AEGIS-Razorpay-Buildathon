import pytest
from app.security.attack_lab import AttackLab
from app.db.models import AuditLedgerEntry

def test_recipient_substitution_attack_interception(db_session):
    lab = AttackLab(db_session)
    record = lab.run_attack("recipient-substitution")

    assert record.status == "DETECTED"
    assert record.policy_result == "BLOCK"
    assert record.payment_created is False
    assert record.risk_score >= 70

    entry = db_session.query(AuditLedgerEntry).filter(AuditLedgerEntry.id == record.ledger_entry_id).first()
    assert entry is not None
    assert "MALICIOUS" in entry.recipient
    assert entry.razorpay_order_id is None
