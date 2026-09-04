import pytest
from app.services.replay import DecisionReplayService
from app.security.attack_lab import AttackLab
from app.agent.controller import AgentController

def test_decision_replay_for_attack(db_session):
    lab = AttackLab(db_session)
    record = lab.run_attack("amount-escalation")

    replay_svc = DecisionReplayService(db_session)
    replay = replay_svc.replay(record.id)

    assert replay.transaction_id == record.id
    assert replay.outcome == "ATTACK_PREVENTED"
    assert replay.final_decision == "BLOCK"
    assert replay.payment_created is False
    assert len(replay.steps) >= 5

    stages = [s.stage for s in replay.steps]
    assert "ROOT_INTENT" in stages
    assert "PROPOSAL" in stages
    assert "TRUST" in stages
    assert "PAYMENT" in stages
    assert "LEDGER" in stages

def test_decision_replay_for_legitimate_agent_run(db_session):
    controller = AgentController(db_session)
    run_res = controller.run("hotel in Goa under 3000")

    proposal_id = run_res.result.get("proposal", {}).get("id")
    assert proposal_id is not None

    replay_svc = DecisionReplayService(db_session)
    replay = replay_svc.replay(proposal_id)

    assert replay.outcome in ("AUTHORIZED", "HELD")
    stages = [s.stage for s in replay.steps]
    assert "ROOT_INTENT" in stages
    assert "PROPOSAL" in stages
    assert "PAYMENT" in stages
    assert "LEDGER" in stages
