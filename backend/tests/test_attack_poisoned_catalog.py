import pytest
from app.security.attack_lab import AttackLab
from app.db.models import AuditLedgerEntry

def test_poisoned_catalog_attack_detection(db_session):
    lab = AttackLab(db_session)
    record = lab.run_attack("poisoned-catalog")

    assert record.status == "DETECTED"
    assert record.policy_result == "BLOCK"
    assert record.payment_created is False
    assert record.risk_score >= 80
    assert record.ledger_entry_id is not None

    # Verify ledger commitment
    entry = db_session.query(AuditLedgerEntry).filter(AuditLedgerEntry.id == record.ledger_entry_id).first()
    assert entry is not None
    assert entry.outcome == "ATTACK_PREVENTED"
    assert entry.attack_scenario == "poisoned-catalog"
    assert entry.razorpay_order_id is None
