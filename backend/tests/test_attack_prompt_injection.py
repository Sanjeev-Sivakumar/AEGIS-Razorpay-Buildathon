import pytest
from app.security.attack_lab import AttackLab
from app.db.models import AuditLedgerEntry, RootIntentCertificate

def test_prompt_injection_resistance(db_session):
    lab = AttackLab(db_session)
    record = lab.run_attack("prompt-injection")

    assert record.status == "DETECTED"
    assert record.policy_result == "BLOCK"
    assert record.payment_created is False

    # Verify Root Intent remained bounded to legitimate parameters
    entry = db_session.query(AuditLedgerEntry).filter(AuditLedgerEntry.id == record.ledger_entry_id).first()
    assert entry is not None
    assert entry.razorpay_order_id is None

    cert = db_session.query(RootIntentCertificate).filter(RootIntentCertificate.id == entry.root_intent_id).first()
    assert cert is not None
    assert cert.max_amount == 3000.0  # Did not get escalated to ₹25,000
    assert cert.currency == "INR"
