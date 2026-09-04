import sys
from pathlib import Path
import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

# Ensure sys.path includes backend and root
backend_dir = str(Path(__file__).resolve().parent.parent)
root_dir = str(Path(__file__).resolve().parent.parent.parent)
for p in [backend_dir, root_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from app.db.database import get_db_context
from app.db.models import PaymentProposal, PaymentAuthorization
from app.services.commerce.payment_gate import PaymentGate

console = Console()
commerce_app = typer.Typer(help="Execute payment authorization through the Absolute Payment Gate.")

@commerce_app.command("authorize")
def authorize_proposal(
    proposal_id: str = typer.Argument(..., help="Proposal ID to process through Payment Gate (e.g. PROP-XXXX)"),
):
    """Execute PaymentGate on a proposal. Enforces: NO VERIFIED TRANSACTION = NO RAZORPAY ORDER."""
    with get_db_context() as db:
        proposal = db.query(PaymentProposal).filter(PaymentProposal.id == proposal_id).first()
        if not proposal:
            console.print(f"[bold red]Error:[/bold red] PaymentProposal '{proposal_id}' not found.")
            raise typer.Exit(code=1)

        gate = PaymentGate(db)
        with console.status("[bold cyan]Processing through Absolute Payment Gate...[/bold cyan]", spinner="dots"):
            auth = gate.process_proposal(proposal_id)

        console.print()
        dec_color = "bold green" if auth.decision == "PASS" else "bold red"
        order_str = auth.razorpay_order_id or "[bold red]ORDER NOT CREATED[/bold red]"

        table = Table(box=None, padding=(0, 2), show_header=False)
        table.add_column("Property", style="bold cyan", width=18)
        table.add_column("Value", style="white")

        table.add_row("Authorization ID", auth.id)
        table.add_row("Proposal ID", auth.payment_proposal_id)
        table.add_row("Decision", f"[{dec_color}]{auth.decision}[/{dec_color}]")
        table.add_row("Policy Result", f"[{dec_color}]{auth.policy_result}[/{dec_color}]")
        table.add_row("Risk Assessment", f"{auth.risk_score}/100 ({auth.risk_level})")
        table.add_row("Razorpay Test Order", f"[bold cyan]{order_str}[/bold cyan]")
        table.add_row("Reason", auth.reason)

        panel = Panel(
            table,
            title="[bold blue]PAYMENT GATE EXECUTION RESULT[/bold blue]",
            border_style="blue",
            padding=(1, 2),
        )
        console.print(panel)
        console.print()

@commerce_app.command("transaction")
def inspect_transaction(
    authorization_id: str = typer.Argument(..., help="Authorization ID (AUTH-XXXX)"),
):
    """Inspect payment authorization and Razorpay order record."""
    with get_db_context() as db:
        auth = db.query(PaymentAuthorization).filter(PaymentAuthorization.id == authorization_id).first()
        if not auth:
            console.print(f"[bold red]Error:[/bold red] Authorization '{authorization_id}' not found.")
            raise typer.Exit(code=1)

        proposal = auth.proposal

        table = Table(box=None, padding=(0, 2), show_header=False)
        table.add_column("Property", style="bold cyan", width=18)
        table.add_column("Value", style="white")

        table.add_row("Auth ID", auth.id)
        table.add_row("Proposal ID", auth.payment_proposal_id)
        table.add_row("Amount", f"{proposal.currency} {proposal.amount:,.2f}")
        table.add_row("Recipient", proposal.recipient)
        table.add_row("Decision", f"[bold {'green' if auth.decision == 'PASS' else 'red'}]{auth.decision}[/bold {'green' if auth.decision == 'PASS' else 'red'}]")
        table.add_row("Razorpay Order", auth.razorpay_order_id or "NONE")
        table.add_row("Timestamp", auth.created_at.strftime("%Y-%m-%d %H:%M:%S UTC"))

        panel = Panel(
            table,
            title=f"[bold blue]TRANSACTION INSPECTOR — {auth.id}[/bold blue]",
            border_style="cyan",
            padding=(1, 2),
        )
        console.print(panel)
        console.print()
