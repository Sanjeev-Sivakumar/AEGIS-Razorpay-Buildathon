import re
from typer.testing import CliRunner
from cli.main import app

runner = CliRunner()

def test_cli_system_status():
    result = runner.invoke(app, ["system", "status"])
    assert result.exit_code == 0
    assert "AEGIS SYSTEM STATUS" in result.stdout
    assert "Backend" in result.stdout
    assert "SQLite" in result.stdout
    assert "Groq" in result.stdout
    assert "Agent Core" in result.stdout
    assert "Phase" in result.stdout

def test_cli_intent_lifecycle():
    # 1. Create intent
    create_result = runner.invoke(app, ["intent", "create", "Find a hotel in Goa under 3000 this weekend"])
    assert create_result.exit_code == 0
    assert "ROOT INTENT" in create_result.stdout
    assert "HOTEL" in create_result.stdout
    assert "Goa" in create_result.stdout
    assert "CREATED" in create_result.stdout

    # Extract INT- ID
    match = re.search(r"INT-[0-9A-F]+", create_result.stdout)
    assert match is not None, "Intent ID not found in CLI output"
    intent_id = match.group(0)

    # 2. Inspect intent
    inspect_result = runner.invoke(app, ["intent", "inspect", intent_id])
    assert inspect_result.exit_code == 0
    assert f"INTENT INSPECTION — {intent_id}" in inspect_result.stdout
    assert "HOTEL" in inspect_result.stdout
    assert "Goa" in inspect_result.stdout

def test_cli_agent_lifecycle():
    # 1. Run agent
    run_result = runner.invoke(app, ["agent", "run", "--intent", "Find a hotel in Goa under 3000 this weekend"])
    assert run_result.exit_code == 0
    assert "AEGIS AGENT CORE" in run_result.stdout
    assert "[PERCEIVE]" in run_result.stdout
    assert "[ANALYZE]" in run_result.stdout
    assert "[DECIDE]" in run_result.stdout
    assert "[ACT]" in run_result.stdout
    assert "AGENT EXECUTION COMPLETED" in run_result.stdout

    # Extract AG- Session ID
    match = re.search(r"AG-[0-9A-F]+", run_result.stdout)
    assert match is not None, "Session ID not found in CLI output"
    session_id = match.group(0)

    # 2. Observe agent session
    observe_result = runner.invoke(app, ["agent", "observe", session_id])
    assert observe_result.exit_code == 0
    assert f"AEGIS AUDIT TIMELINE — {session_id}" in observe_result.stdout
    assert "PERCEIVE" in observe_result.stdout
    assert "ANALYZE" in observe_result.stdout
    assert "DECIDE" in observe_result.stdout
    assert "ACT" in observe_result.stdout
    assert "COMPLETED" in observe_result.stdout
