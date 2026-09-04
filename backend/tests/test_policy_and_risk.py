import json
from app.services.trust.policy import PolicyEngine
from app.services.trust.risk import RiskEngine
from app.db.models import (
    PaymentProposal,
    RootIntentCertificate,
    TransactionVerification,
    generate_uuid,
    utc_now,
)

def create_mock_entities(amount=2400.0, category="hotel", currency="INR", max_amount=3000.0, recipient="Hotel ABC"):
    cert = RootIntentCertificate(
        id=generate_uuid("RIC-"),
        session_id="AG-1",
        category="hotel",
        location="Goa",
        max_amount=max_amount,
        currency="INR",
        recipient_constraints=json.dumps({"allowed_recipients": ["Hotel ABC", "GoaStay Resort"]}),
        original_text="Book hotel in Goa under 3000",
        immutable_hash="mock_hash",
        signature="mock_sig",
        status="ISSUED",
        created_at=utc_now(),
    )
    prop = PaymentProposal(
        id=generate_uuid("PROP-"),
        session_id="AG-1",
        root_intent_id=cert.id,
        merchant_id="M-001",
        product_id="P-001",
        amount=amount,
        currency=currency,
        category=category,
        recipient=recipient,
        created_at=utc_now(),
    )
    verif = TransactionVerification(
        id=generate_uuid("VERIF-"),
        proposal_id=prop.id,
        intent_match=True,
        amount_valid=amount <= max_amount,
        category_valid=category == cert.category,
        recipient_valid=recipient in ["Hotel ABC", "GoaStay Resort"],
        derivation_valid=True,
        policy_valid=True,
        result="PASS" if (amount <= max_amount and category == cert.category) else "BLOCK",
        reason="Valid baseline",
        created_at=utc_now(),
    )
    return cert, prop, verif

def test_policy_all_pass():
    cert, prop, verif = create_mock_entities(amount=2400.0)
    res = PolicyEngine.evaluate(prop, cert, verif)
    assert res.result == "PASS"
    assert len(res.violations) == 0

def test_policy_rule1_amount_exceeded():
    cert, prop, verif = create_mock_entities(amount=15000.0, max_amount=3000.0)
    res = PolicyEngine.evaluate(prop, cert, verif)
    assert res.result == "BLOCK"
    assert any("Rule 1 Violated" in v for v in res.violations)

def test_policy_rule2_category_mismatch():
    cert, prop, verif = create_mock_entities(amount=2400.0, category="flight")
    res = PolicyEngine.evaluate(prop, cert, verif)
    assert res.result == "BLOCK"
    assert any("Rule 2 Violated" in v for v in res.violations)

def test_policy_rule3_recipient_violation():
    cert, prop, verif = create_mock_entities(amount=2400.0, recipient="attacker@example.com")
    res = PolicyEngine.evaluate(prop, cert, verif)
    assert res.result == "BLOCK"
    assert any("Rule 3 Violated" in v for v in res.violations)

def test_policy_rule4_broken_derivation():
    cert, prop, verif = create_mock_entities(amount=2400.0)
    verif.derivation_valid = False
    res = PolicyEngine.evaluate(prop, cert, verif)
    assert res.result == "BLOCK"
    assert any("Rule 4 Violated" in v for v in res.violations)

def test_policy_rule7_currency_mismatch():
    cert, prop, verif = create_mock_entities(amount=2400.0, currency="USD")
    res = PolicyEngine.evaluate(prop, cert, verif)
    assert res.result == "BLOCK"
    assert any("Rule 7 Violated" in v for v in res.violations)

def test_risk_scoring_and_levels():
    cert, prop, verif = create_mock_entities(amount=2400.0)
    pol = PolicyEngine.evaluate(prop, cert, verif)
    risk = RiskEngine.calculate(prop, cert, verif, pol)
    assert risk.level == "SAFE"
    assert risk.score <= 24

def test_hard_policy_overrides_low_risk():
    """Even if an anomaly were somehow isolated, a policy violation must result in BLOCK."""
    cert, prop, verif = create_mock_entities(amount=15000.0, max_amount=3000.0)
    pol = PolicyEngine.evaluate(prop, cert, verif)
    risk = RiskEngine.calculate(prop, cert, verif, pol)
    assert pol.result == "BLOCK"
    # Policy violation gives at least +50 to risk, pushing into HIGH or BLOCK
    assert risk.score >= 50
