import pytest
from app.services.ledger.ledger_service import LedgerService
from app.db.models import AuditLedgerEntry

def test_ledger_integrity_verification_and_tamper_detection(db_session):
    db_session.query(AuditLedgerEntry).delete()
    db_session.commit()

    ledger = LedgerService(db_session)

    # Add 3 sequential entries
    e1 = ledger.commit_entry(
        transaction_id="TX-101",
        outcome="AUTHORIZED",
        risk_score=5,
        policy_result="PASS",
        verification_result="PASS",
        amount=2500.0,
    )
    e2 = ledger.commit_entry(
        transaction_id="TX-102",
        outcome="AUTHORIZED",
        risk_score=15,
        policy_result="PASS",
        verification_result="PASS",
        amount=1900.0,
    )
    e3 = ledger.commit_entry(
        transaction_id="TX-103",
        outcome="HELD",
        risk_score=100,
        policy_result="BLOCK",
        verification_result="FAIL",
        amount=28000.0,
    )

    # 1. Clean verification must pass
    clean_check = ledger.verify_chain()
    assert clean_check["valid"] is True
    assert clean_check["entries_checked"] == 3
    assert len(clean_check["broken_entries"]) == 0

    # 2. Tamper with e2: change amount from 1900.0 to 99999.0
    e2.amount = 99999.0
    db_session.commit()

    # 3. Verification must immediately flag tampering
    tamper_check = ledger.verify_chain()
    assert tamper_check["valid"] is False
    assert e2.id in tamper_check["broken_entries"]
    assert "tampering detected" in tamper_check["details"].lower()
