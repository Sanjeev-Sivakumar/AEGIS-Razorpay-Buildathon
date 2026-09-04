import os
import re
from pathlib import Path

def test_zero_bypass_static_verification():
    """Verify that RazorpayService.create_order is ONLY invoked inside PaymentGate across the codebase."""
    backend_app_dir = Path(__file__).resolve().parent.parent / "app"
    cli_dir = Path(__file__).resolve().parent.parent / "cli"

    disallowed_dirs = [
        backend_app_dir / "api",
        backend_app_dir / "agent",
        cli_dir,
    ]

    target_pattern = re.compile(r"(razorpay.*\.create_order|RazorpayService.*\.create_order)")

    violations = []
    for d in disallowed_dirs:
        for py_file in d.rglob("*.py"):
            content = py_file.read_text(encoding="utf-8")
            for line_no, line in enumerate(content.splitlines(), start=1):
                # Ignore comments
                stripped = line.strip()
                if stripped.startswith("#"):
                    continue
                if target_pattern.search(line):
                    violations.append(f"{py_file.name}:{line_no} -> {stripped}")

    assert len(violations) == 0, f"Security Violation! Direct Razorpay order bypass detected:\n" + "\n".join(violations)
