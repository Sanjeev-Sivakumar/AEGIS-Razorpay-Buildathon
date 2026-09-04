import sys
from pathlib import Path
import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.tree import Tree

# Ensure sys.path includes backend and root
backend_dir = str(Path(__file__).resolve().parent.parent)
root_dir = str(Path(__file__).resolve().parent.parent.parent)
for p in [backend_dir, root_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from app.db.database import get_db_context
from app.db.models import (
    AgentSession,
    RootIntentCertificate,
    DerivationChain,
    PaymentProposal,
    TransactionVerification,
    PaymentAuthorization,
)
from app.services.trust.verifier import TransactionVerifier
from app.services.trust.policy import PolicyEngine
from app.services.trust.risk import RiskEngine
from app.services.trust.derivation import DerivationValidator

console = Console()
trust_app = typer.Typer(help="Inspect and verify Aegis Root Intent and Derivation Chains.")

@trust_app.command("derive")
def derive_chain(
    session_id: str = typer.Argument(..., help="Session ID to inspect derivation chain (e.g. AG-XXXX)"),
):
    """Inspect the cryptographic derivation step chain for an agent session."""
    with get_db_context() as db:
        chain = (
            db.query(DerivationChain)
            .filter((DerivationChain.session_id == session_id) | (DerivationChain.id == session_id))
            .first()
        )
        if not chain:
            console.print(f"[bold red]Error:[/bold red] No derivation chain found for session '{session_id}'.")
            raise typer.Exit(code=1)

        root_cert = (
            db.query(RootIntentCertificate)
            .filter(RootIntentCertificate.id == chain.root_intent_id)
            .first()
        )

        console.print()
        console.print(
            Panel(
                f"Chain ID:       [bold cyan]{chain.id}[/bold cyan]\n"
                f"Session:        [bold white]{chain.session_id}[/bold white]\n"
                f"Root Intent ID: [bold]{chain.root_intent_id}[/bold]\n"
                f"Status:         [bold green]{chain.status}[/bold green]\n"
                f"Final Hash:     [dim]{chain.final_hash or 'N/A'}[/dim]",
                title="[bold blue]CRYPTOGRAPHIC DERIVATION CHAIN[/bold blue]",
                border_style="blue",
                padding=(1, 2),
            )
        )

        tree = Tree(f"[bold cyan]Root Intent ({chain.root_intent_id})[/bold cyan]")
        for s in chain.steps:
            node = tree.add(
                f"[bold white]Step {s.sequence}:[/bold white] [bold yellow]{s.action}[/bold yellow] — {s.description}\n"
                f"  [dim]Prev: {s.previous_step_hash[:12]}... | Hash: {s.step_hash[:12]}...[/dim]"
            )

        console.print(tree)
        console.print()

        # Validate chain
        if root_cert:
            val_res = DerivationValidator.validate(chain, root_cert)
            if val_res.is_valid:
                console.print("[bold green]✓ DERIVATION CHAIN INTEGRITY VALIDATED (Structural + Semantic)[/bold green]\n")
            else:
                console.print(f"[bold red]✗ DERIVATION INVALID:[/bold red] {'; '.join(val_res.errors)}\n")

@trust_app.command("verify")
def verify_session(
    session_id: str = typer.Argument(..., help="Session ID to verify trust (e.g. AG-XXXX)"),
):
    """Run full isolated verification and deterministic policy check for an agent session."""
    with get_db_context() as db:
        proposal = (
            db.query(PaymentProposal)
            .filter(PaymentProposal.session_id == session_id)
            .order_by(PaymentProposal.created_at.desc())
            .first()
        )
        if not proposal:
            console.print(f"[bold red]Error:[/bold red] No PaymentProposal found for session '{session_id}'.")
            raise typer.Exit(code=1)

        root_cert = (
            db.query(RootIntentCertificate)
            .filter(RootIntentCertificate.id == proposal.root_intent_id)
            .first()
        )
        chain = (
            db.query(DerivationChain)
            .filter(DerivationChain.id == proposal.derivation_chain_id)
            .first()
            if proposal.derivation_chain_id
            else None
        )

        verifier = TransactionVerifier(db)
        verif = verifier.verify(proposal, root_cert, chain)
        policy_res = PolicyEngine.evaluate(proposal, root_cert, verif)
        risk_res = RiskEngine.calculate(proposal, root_cert, verif, policy_res)

        console.print()
        console.print(
            Panel(
                f"[bold cyan]AEGIS TRUST VERIFICATION — {session_id}[/bold cyan]",
                border_style="cyan",
                padding=(0, 2),
            )
        )

        table = Table(box=None, padding=(0, 2), show_header=False)
        table.add_column("Category", style="bold white", width=18)
        table.add_column("Details", style="white")

        # Root Intent
        r_loc = root_cert.location or "N/A"
        r_amt = f"{root_cert.currency} {root_cert.max_amount:,.2f}" if root_cert.max_amount else "None"
        table.add_row(
            "[bold cyan]Root Intent[/bold cyan]",
            f"Category: [bold]{root_cert.category.upper()}[/bold] | Location: {r_loc} | Max: [bold green]{r_amt}[/bold green]"
        )

        # Transaction Proposal
        p_amt = f"{proposal.currency} {proposal.amount:,.2f}"
        table.add_row(
            "[bold yellow]Proposal[/bold yellow]",
            f"Category: [bold]{proposal.category.upper()}[/bold] | Amount: [bold green]{p_amt}[/bold green] | Recipient: {proposal.recipient}"
        )

        # Derivation
        d_status = "[bold green]✓ Valid Chain[/bold green]" if verif.derivation_valid else "[bold red]✗ Invalid / Tampered[/bold red]"
        table.add_row("[bold blue]Derivation[/bold blue]", d_status)

        # Policy
        pol_status = "[bold green]✓ All 7 Hard Rules Satisfied[/bold green]" if policy_res.result == "PASS" else f"[bold red]✗ {policy_res.reason}[/bold red]"
        table.add_row("[bold magenta]Policy[/bold magenta]", pol_status)

        # Risk
        risk_color = "green" if risk_res.level == "SAFE" else "yellow" if risk_res.level == "REVIEW" else "red"
        table.add_row("[bold]Risk[/bold]", f"[{risk_color}]Score: {risk_res.score}/100 ({risk_res.level})[/{risk_color}]")

        # Final Decision
        is_pass = policy_res.result == "PASS" and verif.result == "PASS"
        dec_color = "bold green" if is_pass else "bold red"
        dec_text = "✓ PASS (Eligible for Razorpay Order)" if is_pass else "✗ BLOCK (Razorpay Order Prevented)"
        table.add_row("[bold white]FINAL DECISION[/bold white]", f"[{dec_color}]{dec_text}[/{dec_color}]")

        console.print(table)
        console.print()

@trust_app.command("explain")
def explain_authorization(
    identifier: str = typer.Argument(..., help="Authorization ID (AUTH-XXXX) or Session ID (AG-XXXX)"),
):
    """Provide forensic explanation of authorization decision and evidence trail."""
    with get_db_context() as db:
        auth = (
            db.query(PaymentAuthorization)
            .filter(
                (PaymentAuthorization.id == identifier)
                | (PaymentAuthorization.payment_proposal_id == identifier)
            )
            .first()
        )

        if not auth:
            # Check by session ID
            proposal = (
                db.query(PaymentProposal)
                .filter(PaymentProposal.session_id == identifier)
                .order_by(PaymentProposal.created_at.desc())
                .first()
            )
            if proposal:
                auth = (
                    db.query(PaymentAuthorization)
                    .filter(PaymentAuthorization.payment_proposal_id == proposal.id)
                    .first()
                )

        if not auth:
            console.print(f"[bold red]Error:[/bold red] No authorization record found for identifier '{identifier}'.")
            raise typer.Exit(code=1)

        proposal = auth.proposal
        verif = auth.verification

        console.print()
        console.print(
            Panel(
                f"Authorization: [bold cyan]{auth.id}[/bold cyan]\n"
                f"Decision:      [bold {'green' if auth.decision == 'PASS' else 'red'}]{auth.decision}[/bold {'green' if auth.decision == 'PASS' else 'red'}]\n"
                f"Risk Score:    [bold]{auth.risk_score}/100 ({auth.risk_level})[/bold]\n"
                f"Razorpay Order:[bold cyan] {auth.razorpay_order_id or 'NONE (PREVENTED)'}[/bold cyan]\n\n"
                f"[bold white]Detailed Rationale:[/bold white]\n{auth.reason}",
                title="[bold blue]AEGIS FORENSIC TRUST EXPLANATION[/bold blue]",
                border_style="blue",
                padding=(1, 2),
            )
        )
        console.print()
