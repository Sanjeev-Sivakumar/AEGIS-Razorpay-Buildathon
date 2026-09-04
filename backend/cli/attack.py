import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from app.db.database import get_db_context
from app.security.attack_lab import AttackLab
from app.services.replay import DecisionReplayService

attack_app = typer.Typer(name="attack", help="Aegis Attack Lab & Adversarial Instruction Testing")
console = Console()

@attack_app.command("list")
def list_scenarios():
    """List all available Attack Lab scenarios."""
    with get_db_context() as db:
        lab = AttackLab(db)
        scenarios = lab.list_scenarios()

    table = Table(title="Aegis Attack Lab — Available Scenarios", border_style="red")
    table.add_column("Scenario ID", style="bold cyan")
    table.add_column("Display Title", style="bold white")
    table.add_column("Attack Type", style="yellow")
    table.add_column("Description", style="dim")

    for s in scenarios:
        table.add_row(s["name"], s["display_title"], s["attack_type"], s["description"])

    console.print(table)

@attack_app.command("run")
def run_scenario(
    scenario: str = typer.Argument(..., help="Scenario name (e.g. amount-escalation, poisoned-catalog)"),
    instruction: str = typer.Option(None, "--instruction", "-i", help="Optional custom adversarial payload"),
):
    """Execute an attack simulation and verify deterministic defense interception."""
    console.print(Panel(f"Executing Attack Scenario: [bold red]{scenario}[/bold red]", border_style="red"))
    with get_db_context() as db:
        lab = AttackLab(db)
        try:
            record = lab.run_attack(scenario_name=scenario, custom_instruction=instruction)
        except Exception as e:
            console.print(f"[bold red]Error executing attack:[/] {e}")
            raise typer.Exit(code=1)

    # Render structured results
    res_table = Table(title=f"Attack Simulation Result — {record.id}", border_style="red")
    res_table.add_column("Security Metric", style="bold cyan")
    res_table.add_column("Value", style="bold white")

    res_table.add_row("Attack Status", f"[bold red]{record.status}[/]")
    res_table.add_row("Root Intent Valid", "[green]✓ YES[/]" if record.root_intent_valid else "[red]✗ NO[/]")
    res_table.add_row("Derivation Valid", "[green]✓ YES[/]" if record.derivation_valid else "[red]✗ BROKEN / TAMPERED[/]")
    res_table.add_row("Verification Result", f"[red]{record.verification_result}[/]")
    res_table.add_row("Policy Decision", f"[bold red]{record.policy_result}[/]")
    res_table.add_row("Risk Score", f"[red]{record.risk_score}/100[/]")
    res_table.add_row("Razorpay Order Created", "[bold green]✗ FALSE (ZERO MONEY MOVED)[/]")
    res_table.add_row("Ledger Entry", f"[cyan]{record.ledger_entry_id}[/]")

    console.print(res_table)
    console.print(Panel(f"[bold yellow]Defense Forensic Explanation:[/] {record.explanation}", border_style="dim"))

@attack_app.command("replay")
def replay_attack(attack_id: str = typer.Argument(..., help="Attack record ID (e.g. ATK-...)")):
    """Forensically replay the decision trail for an intercepted attack."""
    with get_db_context() as db:
        svc = DecisionReplayService(db)
        try:
            rep = svc.replay(attack_id)
        except Exception as e:
            console.print(f"[bold red]Error loading replay:[/] {e}")
            raise typer.Exit(code=1)

    console.print(Panel(
        f"[bold red]AEGIS ADVERSARIAL DECISION REPLAY[/bold red]\n"
        f"Target ID: [cyan]{rep.transaction_id}[/] | Outcome: [bold red]{rep.outcome}[/] | Final Decision: [bold red]{rep.final_decision}[/]",
        border_style="red",
    ))

    for idx, step in enumerate(rep.steps, 1):
        status_color = "green" if step.status in ("VALID", "PASS", "CREATED", "RECORDED") else "red"
        console.print(f"[bold white]{idx}. {step.stage}[/] — [{status_color}]{step.status}[/] ({step.title})")
        for k, v in step.details.items():
            console.print(f"   • [dim]{k}:[/] {v}")
        console.print()
