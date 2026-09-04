import pytest
from app.services.ledger.ledger_service import LedgerService, GENESIS_PREVIOUS_HASH
from app.db.models import AuditLedgerEntry

def test_ledger_append_and_hash_chaining(db_session):
    # Ensure empty ledger for isolated test
    db_session.query(AuditLedgerEntry).delete()
    db_session.commit()

    ledger = LedgerService(db_session)

    # 1. Commit Entry 1 (Genesis parent)
    e1 = ledger.commit_entry(
        transaction_id="TX-001",
        outcome="AUTHORIZED",
        risk_score=10,
        policy_result="PASS",
        verification_result="PASS",
        amount=1900.0,
        recipient="GoaStay",
    )
    assert e1.previous_hash == GENESIS_PREVIOUS_HASH
    assert len(e1.current_hash) == 64

    # 2. Commit Entry 2 (Links to Entry 1)
    e2 = ledger.commit_entry(
        transaction_id="TX-002",
        outcome="HELD",
        risk_score=95,
        policy_result="BLOCK",
        verification_result="FAIL",
        amount=15000.0,
        recipient="GoaStay",
    )
    assert e2.previous_hash == e1.current_hash
    assert len(e2.current_hash) == 64

    # 3. Retrieve tail
    tail = ledger.get_tail(limit=5)
    assert len(tail) == 2
    assert tail[0].id == e2.id
    assert tail[1].id == e1.id
