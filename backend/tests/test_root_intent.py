from datetime import datetime
from app.services.trust.root_intent import (
    canonicalize_root_intent,
    compute_intent_hash,
    sign_intent_hash,
    verify_intent_signature,
    verify_certificate_integrity,
    issue_root_intent_certificate,
)
from app.db.models import AgentSession, generate_uuid

def test_canonicalization_determinism():
    """Verify that same data produces identical canonical bytes regardless of dict key ordering."""
    bytes1 = canonicalize_root_intent(
        category="hotel",
        location="Goa",
        max_amount=3000.0,
        currency="INR",
        start_date=datetime(2026, 9, 10, 12, 0, 0),
        end_date=datetime(2026, 9, 12, 10, 0, 0),
        recipient_constraints={"allowed_merchants": ["M-001", "M-002"]},
        original_text="Book a hotel in Goa under ₹3000",
    )
    bytes2 = canonicalize_root_intent(
        category=" hotel ",
        location=" goa ",
        max_amount=3000,
        currency="inr",
        start_date=datetime(2026, 9, 10, 12, 0, 0),
        end_date=datetime(2026, 9, 12, 10, 0, 0),
        recipient_constraints={"allowed_merchants": ["M-001", "M-002"]},
        original_text="Book a hotel in Goa under ₹3000",
    )
    assert bytes1 == bytes2
    assert compute_intent_hash(bytes1) == compute_intent_hash(bytes2)

def test_hash_tampering_detection():
    """Any modification in certificate data must produce a different hash."""
    base_bytes = canonicalize_root_intent(
        category="hotel",
        location="Goa",
        max_amount=3000.0,
        currency="INR",
        start_date=None,
        end_date=None,
        recipient_constraints={},
        original_text="Book hotel in Goa",
    )
    tampered_bytes = canonicalize_root_intent(
        category="hotel",
        location="Goa",
        max_amount=15000.0,  # Escalated budget
        currency="INR",
        start_date=None,
        end_date=None,
        recipient_constraints={},
        original_text="Book hotel in Goa",
    )
    assert compute_intent_hash(base_bytes) != compute_intent_hash(tampered_bytes)

def test_cryptographic_signing_and_verification():
    """Verify HMAC-SHA256 signature generation and validation."""
    intent_hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    sig = sign_intent_hash(intent_hash)
    assert verify_intent_signature(intent_hash, sig) is True
    # Tampered signature or hash
    assert verify_intent_signature("different_hash", sig) is False
    assert verify_intent_signature(intent_hash, sig + "corrupted") is False

def test_issue_certificate_lifecycle(db_session):
    """Verify full certificate issuance and integrity verification."""
    session = AgentSession(id=generate_uuid("AG-"), current_state="ANALYZE", status="active")
    db_session.add(session)
    db_session.commit()

    cert = issue_root_intent_certificate(
        db=db_session,
        session_id=session.id,
        category="hotel",
        original_text="Book a stay in Goa under 3000",
        location="Goa",
        max_amount=3000.0,
        currency="INR",
    )

    assert cert.id.startswith("RIC-")
    assert cert.status == "ISSUED"
    assert verify_certificate_integrity(cert) is True

    # Tamper with certificate max_amount in-memory
    cert.max_amount = 50000.0
    assert verify_certificate_integrity(cert) is False
