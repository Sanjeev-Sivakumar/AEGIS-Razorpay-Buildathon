from app.agent.state import AgentState, can_transition, VALID_TRANSITIONS
from app.agent.controller import AgentController
from app.db.models import AgentSession, AgentEvent

def test_agent_state_transitions():
    assert can_transition(AgentState.IDLE, AgentState.PERCEIVE) is True
    assert can_transition(AgentState.PERCEIVE, AgentState.ANALYZE) is True
    assert can_transition(AgentState.ANALYZE, AgentState.DECIDE) is True
    assert can_transition(AgentState.DECIDE, AgentState.ACT) is True
    assert can_transition(AgentState.ACT, AgentState.COMPLETED) is True
    
    # Illegal transitions
    assert can_transition(AgentState.IDLE, AgentState.ACT) is False
    assert can_transition(AgentState.PERCEIVE, AgentState.COMPLETED) is False

def test_agent_controller_full_loop(db_session):
    controller = AgentController(db_session)
    response = controller.run("Find me a hotel in Goa under 3000")

    assert response.status == "completed"
    assert response.current_state == "COMPLETED"
    assert response.session_id.startswith("AG-")
    assert len(response.events) >= 5

    # Check that core progression states are present
    event_states = [e.state for e in response.events]
    for expected_state in ["PERCEIVE", "ANALYZE", "DECIDE", "ACT", "VERIFY", "COMPLETED"]:
        assert expected_state in event_states

    # Verify session in DB
    session_db = db_session.query(AgentSession).filter(AgentSession.id == response.session_id).first()
    assert session_db is not None
    assert session_db.status == "completed"
    assert session_db.current_state == "COMPLETED"

    # Verify events in DB
    db_events = db_session.query(AgentEvent).filter(AgentEvent.session_id == response.session_id).all()
    assert len(db_events) >= 5

def test_agent_controller_empty_input_failure(db_session):
    controller = AgentController(db_session)
    try:
        controller.run("")
        assert False, "Should have raised ValueError"
    except ValueError:
        pass

def test_api_agent_run_and_observe(client):
    run_resp = client.post("/api/agent/run", json={"input": "Find a hotel in Goa under 2800"})
    assert run_resp.status_code == 200
    data = run_resp.json()
    assert data["status"] == "completed"
    session_id = data["session_id"]
    assert len(data["events"]) >= 5

    # Observe session
    session_resp = client.get(f"/api/agent/{session_id}")
    assert session_resp.status_code == 200
    assert session_resp.json()["id"] == session_id
    assert session_resp.json()["status"] == "completed"

    # Observe session events
    events_resp = client.get(f"/api/agent/{session_id}/events")
    assert events_resp.status_code == 200
    events = events_resp.json()
    assert len(events) >= 5

    # List all sessions
    list_resp = client.get("/api/agent/sessions")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1

    # List all events
    all_events_resp = client.get("/api/agent/events")
    assert all_events_resp.status_code == 200
    assert len(all_events_resp.json()) >= 5
