import sys
from pathlib import Path
import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

# Ensure sys.path includes backend and root
backend_dir = str(Path(__file__).resolve().parent.parent)
root_dir = str(Path(__file__).resolve().parent.parent.parent)
for p in [backend_dir, root_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from app.db.database import get_db_context
from app.db.models import AgentSession, AgentEvent
from app.agent.controller import AgentController

console = Console()
agent_app = typer.Typer(help="Manage and observe Aegis autonomous agent executions.")

STATE_COLORS = {
    "PERCEIVE": "cyan",
    "ANALYZE": "magenta",
    "DECIDE": "blue",
    "ACT": "yellow",
    "COMPLETED": "green",
    "FAILED": "red",
    "IDLE": "white",
}

@agent_app.command("run")
def run_agent(
    intent: str = typer.Option(..., "--intent", "-i", help="Natural language request or shopping intent"),
):
    """Execute the Aegis autonomous agent lifecycle for a user request."""
    clean_intent = intent.strip()
    if not clean_intent:
        console.print("[bold red]Error:[/bold red] --intent cannot be empty.")
        raise typer.Exit(code=1)

    with get_db_context() as db:
        controller = AgentController(db)
        
        # Display header
        console.print()
        console.print(
            Panel(
                f"[bold white]Target Prompt:[/bold white] \"{clean_intent}\"",
                title="[bold cyan]AEGIS AGENT CORE[/bold cyan]",
                border_style="cyan",
                padding=(1, 2),
            )
        )

        with console.status("[bold green]Executing Aegis Autonomous Agent Cycle...[/bold green]", spinner="dots"):
            response = controller.run(clean_intent)

    # Lifecycle visual representation
    console.print()
    for evt in response.events:
        state = evt.state
        color = STATE_COLORS.get(state, "white")
        console.print(f"[{color}][{state}][/{color}]")
        
        if state == "PERCEIVE":
            console.print(f"  User request received: \"{clean_intent}\"\n")
        elif state == "ANALYZE":
            intent_data = response.intent
            cat = (intent_data.get("category") or "N/A").upper()
            loc = intent_data.get("location") or "N/A"
            mb = intent_data.get("max_budget")
            curr = intent_data.get("currency", "INR")
            mb_str = f"{curr} {mb:,.2f}" if mb is not None else "N/A"
            
            console.print(f"  Category       [bold]{cat}[/bold]")
            console.print(f"  Location       [bold]{loc}[/bold]")
            console.print(f"  Max Budget     [bold]{mb_str}[/bold]")
            console.print(f"  Currency       [bold]{curr}[/bold]\n")
        elif state == "DECIDE":
            console.print(f"  {evt.message}\n")
        elif state == "ACT":
            console.print(f"  {evt.message}")
            candidates = response.result.get("candidates", [])
            if candidates:
                cand_table = Table(box=None, padding=(0, 2), show_edge=False)
                cand_table.add_column("Product", style="bold white")
                cand_table.add_column("Merchant", style="cyan")
                cand_table.add_column("Price", style="green")
                for c in candidates[:3]:
                    cand_table.add_row(
                        c.get("name", "Product"),
                        c.get("merchant_name", "Merchant"),
                        f"{c.get('currency', 'INR')} {c.get('price', 0):,.2f}"
                    )
                console.print(cand_table)
            console.print()
        elif state == "COMPLETED":
            pass

    console.print("[dim]" + "─" * 48 + "[/dim]")
    if response.status == "completed":
        console.print("[bold green]✓ AGENT EXECUTION COMPLETED[/bold green]")
    else:
        console.print("[bold red]✗ AGENT EXECUTION FAILED[/bold red]")
    console.print("[dim]" + "─" * 48 + "[/dim]\n")

    source = response.intent.get("source", "N/A")
    source_color = "green" if source == "groq" else "yellow"
    console.print(f"Session:       [bold cyan]{response.session_id}[/bold cyan]")
    console.print(f"State:         [bold green]{response.current_state}[/bold green]")
    console.print(f"Intent Source: [{source_color}]{source.upper()}[/{source_color}]\n")

@agent_app.command("observe")
def observe_session(
    session_id: str = typer.Argument(..., help="Session ID to observe (e.g. AG-XXXX)"),
):
    """Observe the audit event timeline for an Aegis agent session."""
    with get_db_context() as db:
        session = db.query(AgentSession).filter(AgentSession.id == session_id).first()
        if not session:
            console.print(f"[bold red]Error:[/bold red] Session '[bold]{session_id}[/bold]' not found in database.")
            raise typer.Exit(code=1)

        events = (
            db.query(AgentEvent)
            .filter(AgentEvent.session_id == session_id)
            .order_by(AgentEvent.created_at.asc())
            .all()
        )

        console.print()
        console.print(
            Panel(
                f"Session ID:   [bold cyan]{session.id}[/bold cyan]\n"
                f"Status:       [bold]{session.status.upper()}[/bold]\n"
                f"Final State:  [bold]{session.current_state}[/bold]\n"
                f"Total Events: [bold]{len(events)}[/bold]",
                title=f"[bold blue]AEGIS AUDIT TIMELINE — {session.id}[/bold blue]",
                border_style="blue",
                padding=(1, 2),
            )
        )
        console.print()

        timeline_table = Table(box=None, padding=(0, 2), show_header=True)
        timeline_table.add_column("Timestamp", style="dim", width=12)
        timeline_table.add_column("State", style="bold", width=14)
        timeline_table.add_column("Event & Message", style="white")

        for e in events:
            time_str = e.created_at.strftime("%H:%M:%S")
            state_color = STATE_COLORS.get(e.state, "white")
            state_text = f"[{state_color}]{e.state}[/{state_color}]"
            message_text = f"[bold]{e.event_type}[/bold]\n{e.message}"
            timeline_table.add_row(time_str, state_text, message_text)

        console.print(timeline_table)
        console.print()

@agent_app.command("replay")
def replay_transaction(
    target_id: str = typer.Argument(..., help="Transaction ID, Proposal ID, or Session ID to replay"),
):
    """Forensically replay the decision trail for an Aegis transaction."""
    from app.services.replay import DecisionReplayService

    with get_db_context() as db:
        svc = DecisionReplayService(db)
        try:
            rep = svc.replay(target_id)
        except Exception as e:
            console.print(f"[bold red]Error loading replay:[/] {e}")
            raise typer.Exit(code=1)

    outcome_color = "green" if rep.outcome == "AUTHORIZED" else "red"
    console.print(Panel(
        f"[bold cyan]AEGIS DECISION REPLAY[/bold cyan]\n"
        f"Target ID: [white]{rep.transaction_id}[/] | Outcome: [{outcome_color}]{rep.outcome}[/{outcome_color}] | Payment Created: [bold]{rep.payment_created}[/bold]",
        border_style="cyan",
    ))

    for idx, step in enumerate(rep.steps, 1):
        status_color = "green" if step.status in ("VALID", "PASS", "CREATED", "RECORDED") else "red"
        console.print(f"[bold white]{idx}. {step.stage}[/] — [{status_color}]{step.status}[/] ({step.title})")
        for k, v in step.details.items():
            console.print(f"   • [dim]{k}:[/] {v}")
        console.print()
