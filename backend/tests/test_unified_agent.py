import pytest
from app.agent.controller import AgentController
from app.db.models import AuditLedgerEntry, AgentEvent

def test_unified_agent_lifecycle(db_session):
    controller = AgentController(db_session)
    response = controller.run("lightweight running shoes under 3000")

    assert response.status == "completed"
    assert response.current_state == "COMPLETED"
    assert "authorization" in response.result
    assert "ledger_entry_id" in response.result

    ledger_id = response.result["ledger_entry_id"]
    ledger_entry = db_session.query(AuditLedgerEntry).filter(AuditLedgerEntry.id == ledger_id).first()
    assert ledger_entry is not None
    assert ledger_entry.session_id == response.session_id

    # Verify event timeline contains Phase 3 & 4 events
    events = db_session.query(AgentEvent).filter(AgentEvent.session_id == response.session_id).all()
    event_types = [e.event_type for e in events]
    assert "GROWTH_RANKING_APPLIED" in event_types
    assert "LEDGER_COMMITTED" in event_types
    assert "OUTCOME_LEARNED" in event_types
