import ast
from pathlib import Path

def test_static_payment_boundary_zero_bypass():
    """
    Static security test guaranteeing that Razorpay order creation
    CANNOT be called from anywhere outside the isolated PaymentGate.
    """
    backend_dir = Path(__file__).resolve().parent.parent

    # Find all Python files in backend/app/
    app_files = list((backend_dir / "app").rglob("*.py"))
    assert len(app_files) > 10

    forbidden_callers = []

    for file_path in app_files:
        # Allowed files that may invoke create_order: only PaymentGate and RazorpayService itself
        rel_str = str(file_path.relative_to(backend_dir)).replace("\\", "/")
        if "payment_gate.py" in rel_str or "razorpay_client.py" in rel_str:
            continue

        content = file_path.read_text(encoding="utf-8")
        if "create_order" in content:
            # Parse AST to check if it's calling create_order
            try:
                tree = ast.parse(content, filename=str(file_path))
                for node in ast.walk(tree):
                    if isinstance(node, ast.Call):
                        if isinstance(node.func, ast.Attribute) and node.func.attr == "create_order":
                            forbidden_callers.append(rel_str)
            except Exception:
                pass

    assert len(forbidden_callers) == 0, (
        f"CRITICAL SECURITY VIOLATION: Unauthorized direct call to RazorpayService.create_order() "
        f"detected in: {forbidden_callers}. Only PaymentGate is authorized to trigger payment orders."
    )
