import pytest
from app.security.attack_lab import AttackLab
from app.db.models import AuditLedgerEntry

def test_derivation_tampering_attack_interception(db_session):
    lab = AttackLab(db_session)
    record = lab.run_attack("derivation-tampering")

    assert record.status == "DETECTED"
    assert record.derivation_valid is False
    assert record.policy_result == "BLOCK"
    assert record.payment_created is False

    entry = db_session.query(AuditLedgerEntry).filter(AuditLedgerEntry.id == record.ledger_entry_id).first()
    assert entry is not None
    assert entry.razorpay_order_id is None
