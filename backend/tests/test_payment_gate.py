from unittest.mock import MagicMock
from app.services.trust.root_intent import issue_root_intent_certificate
from app.services.trust.derivation import create_derivation_chain, append_derivation_step
from app.services.commerce.payment_gate import PaymentGate
from app.services.commerce.razorpay_service import RazorpayService
from app.db.models import AgentSession, PaymentProposal, generate_uuid, utc_now

def setup_test_pipeline(db, amount=2400.0, category="hotel", max_amount=3000.0, recipient="GoaStay Resort"):
    session = AgentSession(id=generate_uuid("AG-"), current_state="ACT", status="active")
    db.add(session)
    db.commit()

    cert = issue_root_intent_certificate(
        db=db,
        session_id=session.id,
        category="hotel",
        original_text="Book hotel in Goa under 3000",
        location="Goa",
        max_amount=max_amount,
        recipient_constraints={"allowed_recipients": ["GoaStay Resort", "Coastal Hotels"]},
    )

    chain = create_derivation_chain(db, session.id, cert.id)
    append_derivation_step(db, chain.id, "INTENT_CAPTURE", "Intent captured")
    append_derivation_step(db, chain.id, "SEARCH_INVENTORY", "Catalog queried")
    append_derivation_step(db, chain.id, "FILTER_CONSTRAINTS", f"Budget <= {max_amount}")
    append_derivation_step(db, chain.id, "SELECT_OFFERING", f"Selected {category}")

    prop = PaymentProposal(
        id=generate_uuid("PROP-"),
        session_id=session.id,
        root_intent_id=cert.id,
        merchant_id="M-001",
        product_id="P-001",
        amount=amount,
        currency="INR",
        category=category,
        recipient=recipient,
        derivation_chain_id=chain.id,
        created_at=utc_now(),
    )
    db.add(prop)
    db.commit()
    return session, cert, chain, prop

def test_payment_gate_valid_transaction(db_session):
    """Valid proposal passes trust checks and creates Razorpay Order."""
    session, cert, chain, prop = setup_test_pipeline(db_session, amount=2400.0)

    mock_rzp = MagicMock(spec=RazorpayService)
    mock_rzp.create_order.return_value = {
        "id": "order_mock_12345",
        "entity": "order",
        "amount": 240000,
        "currency": "INR",
        "status": "created",
    }

    gate = PaymentGate(db_session, razorpay_service=mock_rzp)
    auth = gate.process_proposal(prop.id)

    assert auth.decision == "PASS"
    assert auth.policy_result == "PASS"
    assert auth.risk_score <= 24
    assert auth.razorpay_order_id == "order_mock_12345"
    mock_rzp.create_order.assert_called_once()

def test_payment_gate_amount_escalation_blocks_razorpay(db_session):
    """Amount escalation (15000 > 3000) must BLOCK and NEVER call Razorpay."""
    session, cert, chain, prop = setup_test_pipeline(db_session, amount=15000.0, max_amount=3000.0)

    mock_rzp = MagicMock(spec=RazorpayService)
    gate = PaymentGate(db_session, razorpay_service=mock_rzp)
    auth = gate.process_proposal(prop.id)

    assert auth.decision == "BLOCK"
    assert auth.policy_result == "BLOCK"
    assert auth.razorpay_order_id is None
    mock_rzp.create_order.assert_not_called()

def test_payment_gate_category_substitution_blocks_razorpay(db_session):
    """Category substitution (flight vs hotel) must BLOCK and NEVER call Razorpay."""
    session, cert, chain, prop = setup_test_pipeline(db_session, amount=2400.0, category="flight")

    mock_rzp = MagicMock(spec=RazorpayService)
    gate = PaymentGate(db_session, razorpay_service=mock_rzp)
    auth = gate.process_proposal(prop.id)

    assert auth.decision == "BLOCK"
    assert auth.policy_result == "BLOCK"
    assert auth.razorpay_order_id is None
    mock_rzp.create_order.assert_not_called()

def test_payment_gate_recipient_substitution_blocks_razorpay(db_session):
    """Unauthorized recipient must BLOCK and NEVER call Razorpay."""
    session, cert, chain, prop = setup_test_pipeline(db_session, amount=2400.0, recipient="attacker@fraud.com")

    mock_rzp = MagicMock(spec=RazorpayService)
    gate = PaymentGate(db_session, razorpay_service=mock_rzp)
    auth = gate.process_proposal(prop.id)

    assert auth.decision == "BLOCK"
    assert auth.policy_result == "BLOCK"
    assert auth.razorpay_order_id is None
    mock_rzp.create_order.assert_not_called()

def test_payment_gate_idempotency(db_session):
    """Repeated calls for the same authorized proposal must return existing order without second call."""
    session, cert, chain, prop = setup_test_pipeline(db_session, amount=2400.0)

    mock_rzp = MagicMock(spec=RazorpayService)
    mock_rzp.create_order.return_value = {
        "id": "order_mock_idempotent",
        "entity": "order",
        "amount": 240000,
        "currency": "INR",
        "status": "created",
    }

    gate = PaymentGate(db_session, razorpay_service=mock_rzp)
    auth1 = gate.process_proposal(prop.id)
    assert auth1.razorpay_order_id == "order_mock_idempotent"
    assert mock_rzp.create_order.call_count == 1

    # Second call
    auth2 = gate.process_proposal(prop.id)
    assert auth2.id == auth1.id
    assert auth2.razorpay_order_id == "order_mock_idempotent"
    # Call count must still be 1!
    assert mock_rzp.create_order.call_count == 1
