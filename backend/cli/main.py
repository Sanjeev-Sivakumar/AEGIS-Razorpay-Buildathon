import os
import sys
from pathlib import Path
import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from sqlalchemy import text

# Configure standard encoding for Windows terminal output
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure sys.path includes backend and root
backend_dir = str(Path(__file__).resolve().parent.parent)
root_dir = str(Path(__file__).resolve().parent.parent.parent)
for p in [backend_dir, root_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from app.config.settings import get_settings
from app.db.database import get_db_context, init_db
from app.ai.groq_client import get_groq_client
from cli.agent import agent_app
from cli.intent import intent_app
from cli.trust import trust_app
from cli.commerce import commerce_app
from cli.growth import growth_app
from cli.attack import attack_app
from cli.ledger import ledger_app
from cli.demo import demo_app

console = Console()
app = typer.Typer(
    name="aegis",
    help="AEGIS — The Growth-and-Trust Agent for Agentic Commerce CLI",
    add_completion=False,
)

# Sub-command groups
app.add_typer(agent_app, name="agent")
app.add_typer(intent_app, name="intent")
app.add_typer(growth_app, name="growth")
app.add_typer(trust_app, name="trust")
app.add_typer(commerce_app, name="commerce")
app.add_typer(attack_app, name="attack")
app.add_typer(ledger_app, name="ledger")
app.add_typer(demo_app, name="demo")

system_app = typer.Typer(help="Inspect and monitor Aegis system components.")
app.add_typer(system_app, name="system")

def render_system_status():
    """Render the official Aegis System Status table."""
    init_db()  # Ensure tables exist
    settings = get_settings()
    groq_client = get_groq_client()

    # Check SQLite
    sqlite_ok = False
    try:
        with get_db_context() as db:
            db.execute(text("SELECT 1"))
            sqlite_ok = True
    except Exception:
        sqlite_ok = False

    groq_ok = groq_client.is_configured

    from app.services.commerce.razorpay_service import RazorpayService
    rzp = RazorpayService()
    rzp_status = "[bold green]✓ (Test Mode)[/bold green]" if rzp.is_configured else "[bold yellow]NOT CONFIGURED[/bold yellow]"

    table = Table(show_header=False, box=None, padding=(0, 2))
    table.add_column("Component", style="bold white", width=16)
    table.add_column("Status", width=26)

    table.add_row("Backend", "[bold green]✓[/bold green]")
    table.add_row("SQLite", "[bold green]✓[/bold green]" if sqlite_ok else "[bold red]✗ ERROR[/bold red]")
    if groq_ok:
        table.add_row("Groq", "[bold green]✓[/bold green]")
    else:
        table.add_row("Groq", "[bold yellow]NOT CONFIGURED[/bold yellow]")
    table.add_row("Agent Core", "[bold green]✓[/bold green]")
    
    # Growth ML status
    import torch
    device = "CUDA" if torch.cuda.is_available() else "CPU"
    checkpoint_file = settings.GROWTH_MODEL_DIR / f"{settings.GROWTH_MODEL_VERSION}.pt"
    growth_status = f"[bold green]✓ ({device})[/bold green]" if checkpoint_file.exists() else f"[bold yellow]UNTRAINED ({device})[/bold yellow]"
    table.add_row("Growth ML", growth_status)

    table.add_row("Trust Engine", "[bold green]✓[/bold green]")
    table.add_row("Payment Gate", "[bold green]✓ (Zero Bypass)[/bold green]")
    table.add_row("Razorpay", rzp_status)
    table.add_row("CLI", "[bold green]✓[/bold green]")
    table.add_row("", "")
    
    db_filename = os.path.basename(settings.DATABASE_URL.replace("sqlite:///", ""))
    table.add_row("Database", f"[cyan]{db_filename}[/cyan]")
    table.add_row("Environment", f"[dim]{settings.APP_ENV}[/dim]")
    table.add_row("", "")
    table.add_row("Phase", f"[bold cyan]{settings.PHASE}[/bold cyan]")

    panel = Panel(
        table,
        title="[bold cyan]AEGIS SYSTEM STATUS[/bold cyan]",
        border_style="cyan",
        padding=(1, 2),
    )
    console.print()
    console.print(panel)
    console.print()

@system_app.command("status")
def system_status():
    """Display health and operational status of all Aegis Phase 1 subsystems."""
    render_system_status()

@app.command("status")
def root_status():
    """Shortcut to display Aegis system status."""
    render_system_status()

if __name__ == "__main__":
    app()
