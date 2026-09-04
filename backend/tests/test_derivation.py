from app.services.trust.root_intent import issue_root_intent_certificate
from app.services.trust.derivation import (
    create_derivation_chain,
    append_derivation_step,
    DerivationValidator,
    compute_step_hash,
)
from app.db.models import AgentSession, DerivationStep, generate_uuid

def test_valid_derivation_chain(db_session):
    """Test full valid chain creation and validation."""
    session = AgentSession(id=generate_uuid("AG-"), current_state="ANALYZE", status="active")
    db_session.add(session)
    db_session.commit()

    cert = issue_root_intent_certificate(
        db=db_session,
        session_id=session.id,
        category="hotel",
        original_text="Book a hotel in Goa under ₹3000",
        location="Goa",
        max_amount=3000.0,
    )

    chain = create_derivation_chain(db_session, session.id, cert.id)
    step1 = append_derivation_step(db_session, chain.id, "INTENT_CAPTURE", "Captured root intent")
    step2 = append_derivation_step(db_session, chain.id, "SEARCH_INVENTORY", "Queried catalog")
    step3 = append_derivation_step(db_session, chain.id, "FILTER_CONSTRAINTS", "Applied budget filter")

    assert step1.previous_step_hash == cert.immutable_hash
    assert step2.previous_step_hash == step1.step_hash
    assert step3.previous_step_hash == step2.step_hash

    # Validate
    res = DerivationValidator.validate(chain, cert, proposal_amount=2400.0, proposal_category="hotel")
    assert res.is_valid is True
    assert res.structural_valid is True
    assert res.semantic_valid is True
    assert res.step_count == 3

def test_broken_previous_hash(db_session):
    """Corrupting a previous_step_hash link must be detected."""
    session = AgentSession(id=generate_uuid("AG-"), current_state="ANALYZE", status="active")
    db_session.add(session)
    db_session.commit()

    cert = issue_root_intent_certificate(
        db=db_session, session_id=session.id, category="hotel", original_text="Stay in Goa", max_amount=3000.0
    )
    chain = create_derivation_chain(db_session, session.id, cert.id)
    append_derivation_step(db_session, chain.id, "INTENT_CAPTURE", "Step 1")
    step2 = append_derivation_step(db_session, chain.id, "SEARCH", "Step 2")

    # Tamper with previous_step_hash of step 2
    step2.previous_step_hash = "corrupted_hash_00000000000000000000000000000000000000000000000000"
    db_session.commit()

    res = DerivationValidator.validate(chain, cert, proposal_amount=2000.0, proposal_category="hotel")
    assert res.is_valid is False
    assert res.structural_valid is False
    assert any("Hash link mismatch" in e for e in res.errors)

def test_tampered_step_content(db_session):
    """Modifying step description or data without updating hash must fail validation."""
    session = AgentSession(id=generate_uuid("AG-"), current_state="ANALYZE", status="active")
    db_session.add(session)
    db_session.commit()

    cert = issue_root_intent_certificate(
        db=db_session, session_id=session.id, category="hotel", original_text="Stay in Goa", max_amount=3000.0
    )
    chain = create_derivation_chain(db_session, session.id, cert.id)
    step1 = append_derivation_step(db_session, chain.id, "INTENT_CAPTURE", "Step 1")

    # Tamper with description
    step1.description = "Tampered action unauthorized"
    db_session.commit()

    res = DerivationValidator.validate(chain, cert, proposal_amount=2000.0, proposal_category="hotel")
    assert res.is_valid is False
    assert any("Tampered step data" in e for e in res.errors)

def test_semantic_amount_escalation_in_derivation(db_session):
    """If proposed transaction amount exceeds root intent, semantic validation must fail."""
    session = AgentSession(id=generate_uuid("AG-"), current_state="ANALYZE", status="active")
    db_session.add(session)
    db_session.commit()

    cert = issue_root_intent_certificate(
        db=db_session, session_id=session.id, category="hotel", original_text="Stay in Goa", max_amount=3000.0
    )
    chain = create_derivation_chain(db_session, session.id, cert.id)
    append_derivation_step(db_session, chain.id, "INTENT_CAPTURE", "Step 1")

    res = DerivationValidator.validate(chain, cert, proposal_amount=15000.0, proposal_category="hotel")
    assert res.is_valid is False
    assert res.structural_valid is True
    assert res.semantic_valid is False
    assert any("exceeds authorized max" in e for e in res.errors)
