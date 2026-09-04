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
from app.db.models import QueryIntent, generate_uuid
from app.ai.groq_client import get_groq_client
import json

console = Console()
intent_app = typer.Typer(help="Manage and inspect Aegis commerce intents.")

@intent_app.command("create")
def create_intent(
    text: str = typer.Argument(..., help="Natural language commercial request to parse into structured intent"),
):
    """Parse a user request into structured intent and store it in the database."""
    clean_text = text.strip()
    if not clean_text:
        console.print("[bold red]Error:[/bold red] Prompt cannot be empty.")
        raise typer.Exit(code=1)

    groq_client = get_groq_client()
    with console.status("[cyan]Extracting root intent via AI intelligence...[/cyan]", spinner="dots"):
        extracted = groq_client.extract_intent(clean_text)

    with get_db_context() as db:
        intent_id = generate_uuid("INT-")
        intent_record = QueryIntent(
            id=intent_id,
            raw_text=clean_text,
            category=extracted.category,
            location=extracted.location,
            max_budget=extracted.max_budget,
            currency=extracted.currency,
            attributes=json.dumps(extracted.attributes),
            source=extracted.source,
        )
        db.add(intent_record)
        db.commit()

    # Visual Output
    table = Table(show_header=False, box=None, padding=(0, 2))
    table.add_column("Key", style="bold cyan", width=14)
    table.add_column("Value", style="bold white")

    table.add_row("ID", intent_id)
    table.add_row("Category", (extracted.category or "N/A").upper())
    table.add_row("Location", extracted.location or "N/A")
    budget_str = f"{extracted.currency} {extracted.max_budget:,.2f}" if extracted.max_budget is not None else "N/A"
    table.add_row("Budget", budget_str)
    table.add_row("Currency", extracted.currency)
    source_style = "bold green" if extracted.source == "groq" else "bold yellow"
    table.add_row("Source", f"[{source_style}]{extracted.source.upper()}[/{source_style}]")
    if extracted.date_constraint:
        table.add_row("Timing", extracted.date_constraint)
    table.add_row("Status", "[bold green]CREATED[/bold green]")

    panel = Panel(
        table,
        title="[bold blue]ROOT INTENT[/bold blue]",
        border_style="blue",
        subtitle=f"Query: \"{clean_text}\"",
        padding=(1, 2),
    )
    console.print(panel)

@intent_app.command("inspect")
def inspect_intent(
    intent_id: str = typer.Argument(..., help="ID of the intent to inspect (e.g. INT-XXXX)"),
):
    """Inspect stored metadata for a specific intent ID."""
    with get_db_context() as db:
        intent = db.query(QueryIntent).filter(QueryIntent.id == intent_id).first()
        if not intent:
            console.print(f"[bold red]Error:[/bold red] Intent '[bold]{intent_id}[/bold]' not found in database.")
            raise typer.Exit(code=1)

        table = Table(show_header=False, box=None, padding=(0, 2))
        table.add_column("Field", style="bold cyan", width=18)
        table.add_column("Value", style="white")

        table.add_row("Intent ID", f"[bold]{intent.id}[/bold]")
        table.add_row("Raw Request", f"\"{intent.raw_text}\"")
        table.add_row("Category", (intent.category or "N/A").upper())
        table.add_row("Location", intent.location or "N/A")
        budget_str = f"{intent.currency} {intent.max_budget:,.2f}" if intent.max_budget is not None else "N/A"
        table.add_row("Budget", budget_str)
        table.add_row("Currency", intent.currency)
        source_color = "green" if intent.source == "groq" else "yellow"
        table.add_row("Extraction Source", f"[{source_color}]{intent.source.upper()}[/{source_color}]")
        table.add_row("Attributes", str(intent.parsed_attributes) if intent.parsed_attributes else "[]")
        table.add_row("Creation Time", intent.created_at.strftime("%Y-%m-%d %H:%M:%S UTC"))

        panel = Panel(
            table,
            title=f"[bold blue]INTENT INSPECTION — {intent.id}[/bold blue]",
            border_style="cyan",
            padding=(1, 2),
        )
        console.print(panel)
