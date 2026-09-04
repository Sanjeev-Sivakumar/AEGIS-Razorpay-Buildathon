import typer
from typing import Optional
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from app.db.database import get_db_context
from app.growth.service import get_growth_service

growth_app = typer.Typer(name="growth", help="Aegis Deep Learning Growth Intelligence & Optimization")
console = Console()

@growth_app.command(name="train")
def train_cmd(
    epochs: int = typer.Option(15, "--epochs", "-e", help="Number of training epochs"),
    batch_size: int = typer.Option(32, "--batch-size", "-b", help="Batch size"),
    lr: float = typer.Option(1e-3, "--lr", help="Learning rate"),
):
    """Train the Hybrid Deep Learning Selection Model and evaluate against baseline."""
    console.print(Panel.fit(
        "[bold cyan]AEGIS GROWTH INTELLIGENCE — MODEL TRAINING[/bold cyan]\n"
        "[dim]PyTorch + PyTorch Geometric GraphSAGE + Feature Fusion[/dim]",
        border_style="cyan"
    ))

    with console.status("[bold green]Executing end-to-end training pipeline...[/bold green]"):
        with get_db_context() as db:
            growth_svc = get_growth_service()
            result = growth_svc.train(db, epochs=epochs, batch_size=batch_size, lr=lr)

    # 1. Dataset & Setup Summary
    ds = result["dataset"]
    table_setup = Table(title="Training Configuration & Splits", show_header=True, header_style="bold magenta")
    table_setup.add_column("Parameter", style="cyan")
    table_setup.add_column("Value", style="green")

    table_setup.add_row("Model Version", result["model_version"])
    table_setup.add_row("ML Hardware Device", result["device"].upper())
    table_setup.add_row("Total Interactions", str(ds["total_samples"]))
    table_setup.add_row("Train / Val / Test Split", f"{ds['train_samples']} / {ds['val_samples']} / {ds['test_samples']}")
    table_setup.add_row("Epochs Trained", str(result["epochs"]))
    table_setup.add_row("Execution Time", f"{result['training_time_seconds']}s")
    table_setup.add_row("Checkpoint Path", result["checkpoint_path"])
    console.print(table_setup)

    # 2. Test Evaluation Metrics Table
    metrics = result["test_metrics"]
    base_comp = result["baseline_comparison"]

    table_metrics = Table(title="Test Set Evaluation & Baseline Comparison", show_header=True, header_style="bold cyan")
    table_metrics.add_column("Metric", style="white")
    table_metrics.add_column("Logistic Regression Baseline", style="yellow")
    table_metrics.add_column("Aegis Hybrid DL Model", style="bold green")
    table_metrics.add_column("Uplift / Gain", style="bold cyan")

    table_metrics.add_row("ROC-AUC", f"{base_comp['baseline_roc_auc']:.4f}", f"{base_comp['aegis_dl_roc_auc']:.4f}", f"{base_comp['roc_auc_gain']:+.4f}")
    table_metrics.add_row("PR-AUC (Avg Precision)", f"{base_comp['baseline_pr_auc']:.4f}", f"{base_comp['aegis_dl_pr_auc']:.4f}", f"{base_comp['aegis_dl_pr_auc'] - base_comp['baseline_pr_auc']:+.4f}")
    table_metrics.add_row("Accuracy", "N/A", f"{metrics['accuracy']:.4f}", "—")
    table_metrics.add_row("Precision", "N/A", f"{metrics['precision']:.4f}", "—")
    table_metrics.add_row("Recall", "N/A", f"{metrics['recall']:.4f}", "—")
    table_metrics.add_row("F1 Score", "N/A", f"{metrics['f1']:.4f}", "—")
    table_metrics.add_row("Log Loss (BCE)", "N/A", f"{metrics['log_loss']:.4f}", "—")
    console.print(table_metrics)

    # 3. Calibration Table
    cal_table = Table(title="Probability Calibration Analysis (Test Set Bins)", show_header=True, header_style="bold blue")
    cal_table.add_column("Bin", style="dim")
    cal_table.add_column("Probability Range", style="cyan")
    cal_table.add_column("Samples", style="white")
    cal_table.add_column("Mean Predicted Prob", style="yellow")
    cal_table.add_column("Observed Selection Freq", style="green")

    for row in result["calibration"][:5]:  # Top representative bins
        cal_table.add_row(
            str(row["bin"]),
            row["range"],
            str(row["samples"]),
            f"{row['mean_pred_probability']:.3f}",
            f"{row['observed_frequency']:.3f}",
        )
    console.print(cal_table)
    console.print("[bold green]✓ Model checkpoint saved and armed for inference.[/bold green]\n")

@growth_app.command(name="predict")
def predict_cmd(
    product_id: str = typer.Argument(..., help="Product ID (e.g. PRD-GOA-01)"),
    query: str = typer.Option(..., "--query", "-q", help="Buyer query text"),
):
    """Predict AI-buyer selection probability for a given product and query."""
    with get_db_context() as db:
        growth_svc = get_growth_service()
        try:
            res = growth_svc.predict(query, product_id, db)
        except ValueError as e:
            console.print(f"[bold red]Error:[/bold red] {e}")
            raise typer.Exit(1)

    prob = res["selection_probability"]
    prob_pct = f"{prob * 100:.1f}%"
    prob_color = "green" if prob >= 0.35 else ("yellow" if prob >= 0.20 else "red")

    ctx = res["context_features"]

    console.print(Panel.fit(
        f"[bold white]Query:[/bold white] {query}\n"
        f"[bold white]Product:[/bold white] {res['product_name']} [dim]({res['product_id']})[/dim]\n"
        f"[bold white]Merchant:[/bold white] {res['merchant_name']}\n\n"
        f"[bold cyan]PREDICTED AI-BUYER SELECTION PROBABILITY:[/bold cyan] [{prob_color} bold text-xl]{prob_pct}[/{prob_color} bold text-xl]\n\n"
        f"[bold]Context Indicators:[/bold]\n"
        f"  • Semantic Match:       [cyan]{ctx.get('semantic_match', 0):.2f}[/cyan]\n"
        f"  • Price Fit:            [cyan]{ctx.get('price_fit', 0):.2f}[/cyan]\n"
        f"  • Attribute Quality:    [cyan]{ctx.get('attribute_quality', 0):.2f}[/cyan]\n"
        f"  • Delivery Fit:         [cyan]{ctx.get('delivery_fit', 0):.2f}[/cyan]\n\n"
        f"[dim]Model: {res['model_version']} | Device: {res['device'].upper()} | Latency: {res['latency_ms']}ms[/dim]",
        title="[bold cyan]AEGIS GROWTH INTELLIGENCE[/bold cyan]",
        border_style="cyan",
    ))

@growth_app.command(name="simulate")
def simulate_cmd(
    product_id: str = typer.Argument(..., help="Product ID (e.g. PRD-GOA-01)"),
    query: str = typer.Option(..., "--query", "-q", help="Buyer query text"),
):
    """Simulate candidate catalog interventions and predict selection probability uplift."""
    with get_db_context() as db:
        growth_svc = get_growth_service()
        try:
            sim = growth_svc.simulate(query, product_id, db)
        except ValueError as e:
            console.print(f"[bold red]Error:[/bold red] {e}")
            raise typer.Exit(1)

    base_prob = sim["baseline_probability"]

    console.print(Panel.fit(
        f"[bold white]Product:[/bold white] {sim['product_name']} [dim]({sim['product_id']})[/dim]\n"
        f"[bold white]Query:[/bold white] {query}\n"
        f"[bold white]Baseline Selection Probability:[/bold white] [bold yellow]{base_prob * 100:.1f}%[/bold yellow]",
        title="[bold magenta]AEGIS COUNTERFACTUAL LAB[/bold magenta]",
        border_style="magenta",
    ))

    table = Table(title="Candidate Catalog Interventions & Predicted Uplift", show_header=True, header_style="bold magenta")
    table.add_column("#", style="dim")
    table.add_column("Intervention / Change", style="white")
    table.add_column("Action Type", style="cyan")
    table.add_column("Target Field", style="dim")
    table.add_column("Predicted Prob", style="bold yellow")
    table.add_column("Predicted Uplift", style="bold green")

    for idx, s in enumerate(sim["scenarios"], start=1):
        uplift_str = f"{s['uplift'] * 100:+.1f}%"
        table.add_row(
            str(idx),
            s["change"],
            s["action_type"],
            s["target_field"],
            f"{s['predicted_probability'] * 100:.1f}%",
            uplift_str,
        )
    console.print(table)
    console.print(f"[bold green]Recommended Action:[/bold green] [bold white]{sim['recommended_action']}[/bold white]\n")

@growth_app.command(name="optimize")
def optimize_cmd(
    product_id: str = typer.Argument(..., help="Product ID (e.g. PRD-GOA-01)"),
    query: str = typer.Option(..., "--query", "-q", help="Buyer query text"),
    intervention: Optional[str] = typer.Option(None, "--intervention", "-i", help="Specific scenario change name"),
):
    """Apply an approved counterfactual optimization to the database and record the event."""
    with get_db_context() as db:
        growth_svc = get_growth_service()
        try:
            res = growth_svc.optimize(query, product_id, db, intervention)
        except ValueError as e:
            console.print(f"[bold red]Error:[/bold red] {e}")
            raise typer.Exit(1)

    base = res["baseline_probability"]
    opt = res["optimized_probability"]
    uplift = res["predicted_uplift"]

    console.print(Panel.fit(
        f"[bold white]Optimization ID:[/bold white] {res['optimization_id']}\n"
        f"[bold white]Product ID:[/bold white] {res['product_id']}\n"
        f"[bold white]Action Applied:[/bold white] [bold cyan]{res['action_type']}[/bold cyan] on [dim]{res['target_field']}[/dim]\n\n"
        f"[bold]Before:[/bold] [yellow]{base * 100:.1f}%[/yellow]\n"
        f"[bold]After:[/bold]  [bold green]{opt * 100:.1f}%[/bold green]\n"
        f"[bold]Predicted Uplift:[/bold] [bold cyan]{uplift * 100:+.1f}%[/bold cyan]\n\n"
        f"[dim]Optimization persisted to SQLite and auditable growth history.[/dim]",
        title="[bold green]AEGIS CATALOG OPTIMIZATION APPLIED[/bold green]",
        border_style="green",
    ))

@growth_app.command(name="analyze")
def analyze_cmd(
    merchant_id: str = typer.Argument(..., help="Merchant ID (e.g. MER-GOASTAY)"),
):
    """Produce comprehensive catalog growth analysis for a merchant."""
    with get_db_context() as db:
        growth_svc = get_growth_service()
        try:
            report = growth_svc.analyze_merchant(merchant_id, db)
        except ValueError as e:
            console.print(f"[bold red]Error:[/bold red] {e}")
            raise typer.Exit(1)

    console.print(Panel.fit(
        f"[bold white]Merchant:[/bold white] {report['merchant_name']} [dim]({report['merchant_id']})[/dim]\n\n"
        f"[bold]Catalog Intelligence:[/bold]\n"
        f"  • Total Products:            [cyan]{report['product_count']}[/cyan]\n"
        f"  • Complete Attributes:       [cyan]{report['complete_attributes_pct']}%[/cyan]\n"
        f"  • Available in Stock:        [cyan]{report['available_count']}[/cyan]\n"
        f"  • Avg Selection Probability: [bold green]{report['avg_selection_probability'] * 100:.1f}%[/bold green]\n\n"
        f"[bold]Top Product:[/bold]     {report['top_product']['name'] if report['top_product'] else 'None'} ({report['top_product']['selection_probability'] * 100:.1f}%)\n"
        f"[bold]Weakest Product:[/bold] {report['weakest_product']['name'] if report['weakest_product'] else 'None'} ({report['weakest_product']['selection_probability'] * 100:.1f}%)\n\n"
        f"[bold yellow]Growth Opportunities:[/bold yellow]\n" +
        "\n".join(f"  • {opp}" for opp in report["growth_opportunities"]),
        title="[bold cyan]AEGIS MERCHANT GROWTH ANALYSIS[/bold cyan]",
        border_style="cyan",
    ))
