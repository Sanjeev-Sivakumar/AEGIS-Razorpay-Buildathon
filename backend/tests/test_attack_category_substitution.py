import pytest
from app.security.attack_lab import AttackLab
from app.db.models import AuditLedgerEntry

def test_category_substitution_attack_interception(db_session):
    lab = AttackLab(db_session)
    record = lab.run_attack("category-substitution")

    assert record.status == "DETECTED"
    assert record.policy_result == "BLOCK"
    assert record.payment_created is False
    assert record.risk_score >= 80

    entry = db_session.query(AuditLedgerEntry).filter(AuditLedgerEntry.id == record.ledger_entry_id).first()
    assert entry is not None
    assert entry.razorpay_order_id is None
