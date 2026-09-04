from app.services.trust.root_intent import issue_root_intent_certificate
from app.services.trust.derivation import create_derivation_chain, append_derivation_step
from app.services.trust.verifier import TransactionVerifier
from app.db.models import AgentSession, PaymentProposal, generate_uuid, utc_now

def test_verifier_pass(db_session):
    """End-to-end verification passing all 6 dimensions."""
    session = AgentSession(id=generate_uuid("AG-"), current_state="ANALYZE", status="active")
    db_session.add(session)
    db_session.commit()

    cert = issue_root_intent_certificate(
        db=db_session,
        session_id=session.id,
        category="hotel",
        original_text="Goa hotel under 3000",
        location="Goa",
        max_amount=3000.0,
    )
    chain = create_derivation_chain(db_session, session.id, cert.id)
    append_derivation_step(db_session, chain.id, "INTENT_CAPTURE", "Captured")

    prop = PaymentProposal(
        id=generate_uuid("PROP-"),
        session_id=session.id,
        root_intent_id=cert.id,
        merchant_id="M-001",
        product_id="P-001",
        amount=2400.0,
        currency="INR",
        category="hotel",
        recipient="GoaStay Resort",
        derivation_chain_id=chain.id,
        created_at=utc_now(),
    )
    db_session.add(prop)
    db_session.commit()

    verifier = TransactionVerifier(db_session)
    verif = verifier.verify(prop)

    assert verif.result == "PASS"
    assert verif.amount_valid is True
    assert verif.category_valid is True
    assert verif.derivation_valid is True
    assert verif.intent_match is True

def test_verifier_missing_derivation(db_session):
    """Proposal with no derivation chain must be blocked."""
    session = AgentSession(id=generate_uuid("AG-"), current_state="ANALYZE", status="active")
    db_session.add(session)
    db_session.commit()

    cert = issue_root_intent_certificate(
        db=db_session,
        session_id=session.id,
        category="hotel",
        original_text="Goa hotel under 3000",
        max_amount=3000.0,
    )
    prop = PaymentProposal(
        id=generate_uuid("PROP-"),
        session_id=session.id,
        root_intent_id=cert.id,
        merchant_id="M-001",
        product_id="P-001",
        amount=2400.0,
        currency="INR",
        category="hotel",
        recipient="GoaStay Resort",
        derivation_chain_id=None,  # MISSING DERIVATION
        created_at=utc_now(),
    )
    db_session.add(prop)
    db_session.commit()

    verifier = TransactionVerifier(db_session)
    verif = verifier.verify(prop)

    assert verif.result == "BLOCK"
    assert verif.derivation_valid is False
    assert "Derivation chain is missing" in verif.reason

def test_verifier_amount_escalation(db_session):
    """Proposal exceeding authorized max must fail verification."""
    session = AgentSession(id=generate_uuid("AG-"), current_state="ANALYZE", status="active")
    db_session.add(session)
    db_session.commit()

    cert = issue_root_intent_certificate(
        db=db_session,
        session_id=session.id,
        category="hotel",
        original_text="Goa hotel under 3000",
        max_amount=3000.0,
    )
    chain = create_derivation_chain(db_session, session.id, cert.id)
    append_derivation_step(db_session, chain.id, "INTENT_CAPTURE", "Captured")

    prop = PaymentProposal(
        id=generate_uuid("PROP-"),
        session_id=session.id,
        root_intent_id=cert.id,
        merchant_id="M-001",
        product_id="P-001",
        amount=15000.0,  # ESCALATED
        currency="INR",
        category="hotel",
        recipient="GoaStay Resort",
        derivation_chain_id=chain.id,
        created_at=utc_now(),
    )
    db_session.add(prop)
    db_session.commit()

    verifier = TransactionVerifier(db_session)
    verif = verifier.verify(prop)

    assert verif.result == "BLOCK"
    assert verif.amount_valid is False
    assert "Amount exceeds limit" in verif.reason
