import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from app.db.database import get_db_context
from app.services.ledger.ledger_service import LedgerService

ledger_app = typer.Typer(name="ledger", help="Aegis Append-Only Cryptographic Audit Ledger")
console = Console()

@ledger_app.command("tail")
def tail_ledger(limit: int = typer.Option(10, "--limit", "-n", help="Number of records to show")):
    """Display the latest hash-chained blocks in the audit ledger."""
    with get_db_context() as db:
        svc = LedgerService(db)
        entries = svc.get_tail(limit=limit)

    table = Table(title="Aegis Append-Only Audit Ledger (Tail)", border_style="cyan")
    table.add_column("Ledger ID", style="bold cyan")
    table.add_column("Transaction ID", style="white")
    table.add_column("Outcome", style="bold")
    table.add_column("Amount", style="green")
    table.add_column("Policy", style="yellow")
    table.add_column("Previous Hash", style="dim")
    table.add_column("Current Hash", style="bold blue")

    for e in entries:
        outcome_color = "green" if e.outcome == "AUTHORIZED" else "red"
        amt_str = f"₹{e.amount:,.2f}" if e.amount else "N/A"
        table.add_row(
            e.id,
            e.transaction_id,
            f"[{outcome_color}]{e.outcome}[/]",
            amt_str,
            e.policy_result,
            f"{e.previous_hash[:10]}...",
            f"{e.current_hash[:10]}...",
        )

    console.print(table)

@ledger_app.command("inspect")
def inspect_entry(entry_id: str = typer.Argument(..., help="Ledger Entry ID or Transaction ID")):
    """Inspect detailed canonical payload and cryptographic proof of a ledger block."""
    with get_db_context() as db:
        svc = LedgerService(db)
        entry = svc.get_entry(entry_id)

    if not entry:
        console.print(f"[bold red]Error:[/] Ledger entry '{entry_id}' not found.")
        raise typer.Exit(code=1)

    table = Table(title=f"Audit Ledger Block — {entry.id}", border_style="cyan")
    table.add_column("Field", style="bold cyan")
    table.add_column("Value", style="white")

    table.add_row("Transaction ID", entry.transaction_id)
    table.add_row("Session ID", entry.session_id or "N/A")
    table.add_row("Outcome", f"[bold]{entry.outcome}[/]")
    table.add_row("Policy Result", entry.policy_result)
    table.add_row("Risk Score", f"{entry.risk_score}/100")
    table.add_row("Amount", f"₹{entry.amount:,.2f}" if entry.amount else "N/A")
    table.add_row("Recipient", entry.recipient or "N/A")
    table.add_row("Razorpay Order ID", entry.razorpay_order_id or "[dim]NONE (PAYMENT BLOCKED)[/]")
    table.add_row("Attack Scenario", entry.attack_scenario or "[dim]NONE (LEGITIMATE)[/]")
    table.add_row("Previous Block Hash", f"[yellow]{entry.previous_hash}[/]")
    table.add_row("Current Block Hash", f"[bold green]{entry.current_hash}[/]")
    table.add_row("Committed Timestamp", entry.created_at.isoformat())

    console.print(table)

@ledger_app.command("verify")
def verify_ledger():
    """Verify cryptographic chain continuity and recalculate all SHA-256 block hashes."""
    console.print(Panel("Verifying Cryptographic Audit Ledger Chain Integrity...", border_style="cyan"))
    with get_db_context() as db:
        svc = LedgerService(db)
        res = svc.verify_chain()

    status_color = "bold green" if res["valid"] else "bold red"
    status_text = "VALID (TAMPER-FREE)" if res["valid"] else "INVALID (TAMPERING DETECTED)"

    console.print(f"Chain Status: [{status_color}]{status_text}[/]")
    console.print(f"Blocks Verified: [bold white]{res['entries_checked']}[/]")
    console.print(f"Details: [dim]{res['details']}[/]")

    if not res["valid"]:
        console.print(f"[bold red]Broken / Tampered Blocks:[/] {res['broken_entries']}")
        raise typer.Exit(code=1)
    else:
        console.print("[bold green]✓ All SHA-256 block hashes match canonical data perfectly.[/]")
