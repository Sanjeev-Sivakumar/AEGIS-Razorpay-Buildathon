import hmac
import hashlib
import json
from datetime import datetime
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session

from app.config.settings import get_settings
from app.db.models import RootIntentCertificate, generate_uuid, utc_now

def canonicalize_root_intent(
    category: str,
    location: Optional[str],
    max_amount: Optional[float],
    currency: str,
    start_date: Optional[datetime],
    end_date: Optional[datetime],
    recipient_constraints: Optional[Dict[str, Any]],
    original_text: str,
) -> bytes:
    """Produce deterministic canonical JSON representation of root intent."""
    normalized = {
        "category": category.strip().lower() if category else "",
        "currency": currency.strip().upper() if currency else "INR",
        "end_date": end_date.isoformat() if end_date else None,
        "location": location.strip().title() if location else None,
        "max_amount": round(float(max_amount), 2) if max_amount is not None else None,
        "original_text": original_text.strip(),
        "recipient_constraints": recipient_constraints or {},
        "start_date": start_date.isoformat() if start_date else None,
    }
    canonical_json = json.dumps(normalized, sort_keys=True, separators=(",", ":"))
    return canonical_json.encode("utf-8")

def compute_intent_hash(canonical_bytes: bytes) -> str:
    """Compute SHA-256 digest of canonical root intent bytes."""
    return hashlib.sha256(canonical_bytes).hexdigest()

def sign_intent_hash(intent_hash: str, secret_key: Optional[str] = None) -> str:
    """Cryptographically sign canonical root intent hash using HMAC-SHA256."""
    key = secret_key or get_settings().AEGIS_SIGNING_KEY
    signature = hmac.new(
        key.encode("utf-8"),
        intent_hash.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return signature

def verify_intent_signature(
    intent_hash: str,
    signature: str,
    secret_key: Optional[str] = None
) -> bool:
    """Verify cryptographic authenticity of a root intent signature."""
    expected_sig = sign_intent_hash(intent_hash, secret_key)
    return hmac.compare_digest(expected_sig, signature)

def verify_certificate_integrity(
    cert: RootIntentCertificate,
    secret_key: Optional[str] = None
) -> bool:
    """Verify both canonical hash stability and cryptographic signature of a certificate."""
    canonical_bytes = canonicalize_root_intent(
        category=cert.category,
        location=cert.location,
        max_amount=cert.max_amount,
        currency=cert.currency,
        start_date=cert.start_date,
        end_date=cert.end_date,
        recipient_constraints=cert.parsed_recipient_constraints,
        original_text=cert.original_text,
    )
    recalculated_hash = compute_intent_hash(canonical_bytes)
    if not hmac.compare_digest(recalculated_hash, cert.immutable_hash):
        return False

    return verify_intent_signature(cert.immutable_hash, cert.signature, secret_key)

def issue_root_intent_certificate(
    db: Session,
    session_id: str,
    category: str,
    original_text: str,
    intent_id: Optional[str] = None,
    location: Optional[str] = None,
    max_amount: Optional[float] = None,
    currency: str = "INR",
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    recipient_constraints: Optional[Dict[str, Any]] = None,
) -> RootIntentCertificate:
    """Issue, sign, and persist an immutable Root Intent Certificate."""
    canonical_bytes = canonicalize_root_intent(
        category=category,
        location=location,
        max_amount=max_amount,
        currency=currency,
        start_date=start_date,
        end_date=end_date,
        recipient_constraints=recipient_constraints,
        original_text=original_text,
    )
    immutable_hash = compute_intent_hash(canonical_bytes)
    signature = sign_intent_hash(immutable_hash)

    cert = RootIntentCertificate(
        id=generate_uuid("RIC-"),
        session_id=session_id,
        intent_id=intent_id,
        category=category,
        location=location,
        max_amount=max_amount,
        currency=currency,
        start_date=start_date,
        end_date=end_date,
        recipient_constraints=json.dumps(recipient_constraints or {}),
        original_text=original_text,
        immutable_hash=immutable_hash,
        signature=signature,
        status="ISSUED",
        created_at=utc_now(),
    )
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return cert
