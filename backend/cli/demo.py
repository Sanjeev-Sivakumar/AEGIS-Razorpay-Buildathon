import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from app.db.database import get_db_context
from app.agent.controller import AgentController
from app.growth.service import get_growth_service
from app.security.attack_lab import AttackLab
from app.services.ledger.ledger_service import LedgerService
from app.services.replay import DecisionReplayService

demo_app = typer.Typer(name="demo", help="Aegis Unified End-to-End Walkthrough Scenarios")
console = Console()

@demo_app.command("growth")
def demo_growth():
    """Demonstrate Growth Intelligence: Discovery, Selection Probability, and Counterfactuals."""
    console.print(Panel("[bold cyan]AEGIS DEMO 1 — GROWTH INTELLIGENCE & COUNTERFACTUAL LAB[/bold cyan]", border_style="cyan"))
    query = "lightweight running shoes under 3000"
    product_id = "PRD-SHOE-01"

    console.print(f"[bold white]Query:[/] '{query}'")
    console.print(f"[bold white]Target Product:[/] Aegis Velocity Running Shoes ({product_id})")

    with get_db_context() as db:
        growth_svc = get_growth_service()
        pred = growth_svc.predict(query=query, product_id=product_id, db=db)
        sim = growth_svc.simulate(query=query, product_id=product_id, db=db)

    prob_pct = f"{pred['selection_probability'] * 100:.1f}%"
    console.print(f"Predicted Selection Probability: [bold green]{prob_pct}[/] (Model: {pred['model_version']})")

    # Table of counterfactual interventions
    table = Table(title="In-Memory Counterfactual Interventions", border_style="cyan")
    table.add_column("Intervention", style="bold white")
    table.add_column("Predicted Prob", style="cyan")
    table.add_column("Predicted Uplift", style="bold green")

    for sc in sim["scenarios"][:4]:
        uplift_str = f"{sc['uplift'] * 100:+.1f}%"
        table.add_row(sc["change"], f"{sc['predicted_probability'] * 100:.1f}%", uplift_str)

    console.print(table)
    console.print(f"[bold yellow]Recommended Action:[/] {sim['recommended_action']}\n")

@demo_app.command("attack")
def demo_attack():
    """Demonstrate Attack Lab: Intercepting an Amount Escalation attack before payment."""
    console.print(Panel("[bold red]AEGIS DEMO 2 — ATTACK LAB DEFENSE & ZERO-PAYMENT INTERCEPTION[/bold red]", border_style="red"))
    scenario = "amount-escalation"
    with get_db_context() as db:
        lab = AttackLab(db)
        record = lab.run_attack(scenario_name=scenario)

    console.print(f"Attack Injected: [bold red]{record.scenario_name}[/bold red]")
    console.print(f"Detection Status: [bold red]{record.status}[/]")
    console.print(f"Deterministic Policy Result: [bold red]{record.policy_result}[/]")
    console.print(f"Risk Score: [bold red]{record.risk_score}/100[/]")
    console.print(f"PaymentGate Call: [bold green]NONE (BLOCKED)[/]")
    console.print(f"Razorpay Order Created: [bold green]FALSE[/]")
    console.print(f"Audit Ledger Entry: [cyan]{record.ledger_entry_id}[/]\n")

@demo_app.command("full")
def demo_full():
    """Run the complete end-to-end autonomous story: Growth -> Legitimate Purchase -> Attack -> Ledger -> Replay."""
    console.print(Panel("[bold magenta]AEGIS DEMO 3 — COMPLETE UNIFIED AUTONOMOUS COMMERCE LIFECYCLE[/bold magenta]", border_style="magenta"))

    # Act 1: Autonomous Agent Loop with Growth and Trust
    console.print("[bold cyan]▶ ACT 1: Legitimate Autonomous Purchase[/bold cyan]")
    with get_db_context() as db:
        controller = AgentController(db)
        run_res = controller.run("Book a hotel in Goa under 3000")

    auth = run_res.result.get("authorization", {})
    console.print(f"Agent Session: [cyan]{run_res.session_id}[/]")
    console.print(f"Selected Offering: [white]{run_res.result.get('candidates', [{}])[0].get('name')}[/]")
    console.print(f"Payment Authorization: [bold green]{auth.get('decision')}[/] (Policy: {auth.get('policy_result')})")
    console.print(f"Razorpay Test Order: [bold green]{auth.get('razorpay_order_id')}[/]")
    console.print(f"Ledger Block ID: [cyan]{run_res.result.get('ledger_entry_id')}[/]\n")

    # Act 2: Malicious Attack Injection
    console.print("[bold red]▶ ACT 2: Adversarial Attack Injection (Amount Escalation)[/bold red]")
    with get_db_context() as db:
        lab = AttackLab(db)
        atk_res = lab.run_attack("amount-escalation")

    console.print(f"Attack Interception: [bold red]{atk_res.status}[/]")
    console.print(f"Policy Decision: [bold red]{atk_res.policy_result}[/]")
    console.print(f"Money Movement: [bold green]ZERO (BLOCKED)[/]")
    console.print(f"Attack Ledger ID: [cyan]{atk_res.ledger_entry_id}[/]\n")

    # Act 3: Cryptographic Ledger Verification
    console.print("[bold blue]▶ ACT 3: Cryptographic Audit Ledger Verification[/bold blue]")
    with get_db_context() as db:
        ledger = LedgerService(db)
        verif = ledger.verify_chain()

    console.print(f"Chain Integrity: [bold green]{'VALID' if verif['valid'] else 'BROKEN'}[/] ({verif['entries_checked']} blocks verified)\n")

    # Act 4: Forensic Replay
    console.print("[bold yellow]▶ ACT 4: Forensic Decision Replay[/bold yellow]")
    with get_db_context() as db:
        replay_svc = DecisionReplayService(db)
        replay = replay_svc.replay(atk_res.id)

    console.print(f"Replay Target: [cyan]{replay.transaction_id}[/] | Outcome: [bold red]{replay.outcome}[/]")
    for s in replay.steps[-3:]:
        console.print(f"  • [bold white]{s.stage}[/]: [{ 'green' if s.status in ('PASS', 'RECORDED') else 'red'}]{s.status}[/] — {s.title}")

    console.print("\n[bold green]✓ Full Unified Aegis Demo Complete.[/bold green]")
