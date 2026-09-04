import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Column,
    String,
    Text,
    Float,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship
from app.db.database import Base

from datetime import datetime, timezone

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

def generate_uuid(prefix: str = "") -> str:
    short_id = uuid.uuid4().hex[:8].upper()
    return f"{prefix}{short_id}" if prefix else str(uuid.uuid4())

class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(String(64), primary_key=True, default=lambda: generate_uuid("MER-"))
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    products = relationship("Product", back_populates="merchant", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Merchant id={self.id} name={self.name}>"

class Product(Base):
    __tablename__ = "products"

    id = Column(String(64), primary_key=True, default=lambda: generate_uuid("PRD-"))
    merchant_id = Column(String(64), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False, index=True)
    price = Column(Float, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    availability = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    merchant = relationship("Merchant", back_populates="products")
    attributes = relationship("ProductAttribute", back_populates="product", cascade="all, delete-orphan")

    @property
    def parsed_attributes(self) -> Dict[str, Any]:
        if not self.attributes:
            return {}
        return {attr.key: attr.value for attr in self.attributes}

    @property
    def is_active(self) -> bool:
        return bool(self.availability)

    def __repr__(self) -> str:
        return f"<Product id={self.id} name={self.name} price={self.price}>"

class ProductAttribute(Base):
    __tablename__ = "product_attributes"

    id = Column(String(64), primary_key=True, default=lambda: generate_uuid("ATTR-"))
    product_id = Column(String(64), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    key = Column(String(100), nullable=False, index=True)
    value = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    product = relationship("Product", back_populates="attributes")

    def __repr__(self) -> str:
        return f"<ProductAttribute key={self.key} value={self.value}>"

class QueryIntent(Base):
    __tablename__ = "query_intents"

    id = Column(String(64), primary_key=True, default=lambda: generate_uuid("INT-"))
    raw_text = Column(Text, nullable=False)
    category = Column(String(100), nullable=True, index=True)
    location = Column(String(100), nullable=True, index=True)
    max_budget = Column(Float, nullable=True)
    currency = Column(String(10), default="INR", nullable=False)
    attributes = Column(Text, nullable=True)  # JSON-encoded string
    source = Column(String(50), default="groq", nullable=False)  # "groq" or "fallback"
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    @property
    def parsed_attributes(self) -> List[Dict[str, Any]]:
        if not self.attributes:
            return []
        try:
            return json.loads(self.attributes)
        except Exception:
            return []

    def __repr__(self) -> str:
        return f"<QueryIntent id={self.id} category={self.category} budget={self.max_budget} source={self.source}>"

class AgentSession(Base):
    __tablename__ = "agent_sessions"

    id = Column(String(64), primary_key=True, default=lambda: generate_uuid("AG-"))
    status = Column(String(50), default="active", nullable=False, index=True)  # active, completed, failed
    current_state = Column(String(50), default="IDLE", nullable=False, index=True)  # IDLE, PERCEIVE, ANALYZE, DECIDE, ACT, COMPLETED, FAILED
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    events = relationship(
        "AgentEvent",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="AgentEvent.created_at",
    )

    def __repr__(self) -> str:
        return f"<AgentSession id={self.id} state={self.current_state} status={self.status}>"

class AgentEvent(Base):
    __tablename__ = "agent_events"

    id = Column(String(64), primary_key=True, default=lambda: generate_uuid("EVT-"))
    session_id = Column(String(64), ForeignKey("agent_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    state = Column(String(50), nullable=False, index=True)
    message = Column(Text, nullable=False)
    payload = Column(Text, nullable=True)  # JSON serialized string
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    session = relationship("AgentSession", back_populates="events")

    @property
    def parsed_payload(self) -> Dict[str, Any]:
        if not self.payload:
            return {}
        try:
            return json.loads(self.payload)
        except Exception:
            return {}

    def __repr__(self) -> str:
        return f"<AgentEvent id={self.id} session={self.session_id} state={self.state} type={self.event_type}>"

# =========================================================================
# PHASE 2: TRUST ENGINE & PAYMENT GATE MODELS
# =========================================================================

class RootIntentCertificate(Base):
    __tablename__ = "root_intent_certificates"

    id = Column(String(64), primary_key=True, default=lambda: generate_uuid("RIC-"))
    session_id = Column(String(64), ForeignKey("agent_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    intent_id = Column(String(64), ForeignKey("query_intents.id", ondelete="SET NULL"), nullable=True, index=True)
    category = Column(String(100), nullable=False, index=True)
    location = Column(String(100), nullable=True, index=True)
    max_amount = Column(Float, nullable=True)
    currency = Column(String(10), default="INR", nullable=False)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    recipient_constraints = Column(Text, nullable=True)  # JSON text
    original_text = Column(Text, nullable=False)
    immutable_hash = Column(String(64), nullable=False, index=True)  # SHA-256 canonical hash
    signature = Column(String(128), nullable=False)  # Cryptographic signature
    status = Column(String(50), default="ISSUED", nullable=False)  # ISSUED, VERIFIED, REVOKED
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    session = relationship("AgentSession", backref="root_intent_certificates")
    intent = relationship("QueryIntent", backref="root_intent_certificates")
    derivation_chains = relationship("DerivationChain", back_populates="root_intent", cascade="all, delete-orphan")

    @property
    def parsed_recipient_constraints(self) -> Dict[str, Any]:
        if not self.recipient_constraints:
            return {}
        try:
            return json.loads(self.recipient_constraints)
        except Exception:
            return {}

    def __repr__(self) -> str:
        return f"<RootIntentCertificate id={self.id} category={self.category} max_amount={self.max_amount} status={self.status}>"

class DerivationChain(Base):
    __tablename__ = "derivation_chains"

    id = Column(String(64), primary_key=True, default=lambda: generate_uuid("DC-"))
    session_id = Column(String(64), ForeignKey("agent_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    root_intent_id = Column(String(64), ForeignKey("root_intent_certificates.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="IN_PROGRESS", nullable=False)  # IN_PROGRESS, VALIDATED, INVALID
    final_hash = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    session = relationship("AgentSession", backref="derivation_chains")
    root_intent = relationship("RootIntentCertificate", back_populates="derivation_chains")
    steps = relationship("DerivationStep", back_populates="chain", cascade="all, delete-orphan", order_by="DerivationStep.sequence")

    def __repr__(self) -> str:
        return f"<DerivationChain id={self.id} session={self.session_id} status={self.status}>"

class DerivationStep(Base):
    __tablename__ = "derivation_steps"

    id = Column(String(64), primary_key=True, default=lambda: generate_uuid("STEP-"))
    chain_id = Column(String(64), ForeignKey("derivation_chains.id", ondelete="CASCADE"), nullable=False, index=True)
    sequence = Column(Integer, nullable=False)
    action = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    input_data = Column(Text, nullable=True)  # JSON
    output_data = Column(Text, nullable=True)  # JSON
    previous_step_hash = Column(String(64), nullable=False)
    step_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    chain = relationship("DerivationChain", back_populates="steps")

    @property
    def parsed_input_data(self) -> Dict[str, Any]:
        if not self.input_data:
            return {}
        try:
            return json.loads(self.input_data)
        except Exception:
            return {}

    @property
    def parsed_output_data(self) -> Dict[str, Any]:
        if not self.output_data:
            return {}
        try:
            return json.loads(self.output_data)
        except Exception:
            return {}

    def __repr__(self) -> str:
        return f"<DerivationStep id={self.id} seq={self.sequence} action={self.action}>"

class PaymentProposal(Base):
    __tablename__ = "payment_proposals"

    id = Column(String(64), primary_key=True, default=lambda: generate_uuid("PROP-"))
    session_id = Column(String(64), ForeignKey("agent_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    root_intent_id = Column(String(64), ForeignKey("root_intent_certificates.id", ondelete="CASCADE"), nullable=False, index=True)
    merchant_id = Column(String(64), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(64), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    category = Column(String(100), nullable=False, index=True)
    recipient = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    derivation_chain_id = Column(String(64), ForeignKey("derivation_chains.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    session = relationship("AgentSession", backref="payment_proposals")
    root_intent = relationship("RootIntentCertificate", backref="payment_proposals")
    merchant = relationship("Merchant", backref="payment_proposals")
    product = relationship("Product", backref="payment_proposals")
    derivation_chain = relationship("DerivationChain", backref="payment_proposals")
    verifications = relationship("TransactionVerification", back_populates="proposal", cascade="all, delete-orphan")
    authorizations = relationship("PaymentAuthorization", back_populates="proposal", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<PaymentProposal id={self.id} amount={self.amount} {self.currency} recipient={self.recipient}>"

class TransactionVerification(Base):
    __tablename__ = "transaction_verifications"

    id = Column(String(64), primary_key=True, default=lambda: generate_uuid("VERIF-"))
    proposal_id = Column(String(64), ForeignKey("payment_proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    intent_match = Column(Boolean, nullable=False)
    amount_valid = Column(Boolean, nullable=False)
    category_valid = Column(Boolean, nullable=False)
    recipient_valid = Column(Boolean, nullable=False)
    derivation_valid = Column(Boolean, nullable=False)
    policy_valid = Column(Boolean, nullable=False)
    result = Column(String(50), nullable=False)  # PASS, BLOCK
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    proposal = relationship("PaymentProposal", back_populates="verifications")

    def __repr__(self) -> str:
        return f"<TransactionVerification id={self.id} proposal={self.proposal_id} result={self.result}>"

class PaymentAuthorization(Base):
    __tablename__ = "payment_authorizations"

    id = Column(String(64), primary_key=True, default=lambda: generate_uuid("AUTH-"))
    payment_proposal_id = Column(String(64), ForeignKey("payment_proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    verification_id = Column(String(64), ForeignKey("transaction_verifications.id", ondelete="SET NULL"), nullable=True, index=True)
    policy_result = Column(String(50), nullable=False)  # PASS, BLOCK
    risk_score = Column(Integer, nullable=False)
    risk_level = Column(String(50), nullable=False)  # SAFE, REVIEW, HIGH, BLOCK
    decision = Column(String(50), nullable=False)  # PASS, REVIEW, BLOCK
    reason = Column(Text, nullable=False)
    razorpay_order_id = Column(String(100), nullable=True, index=True)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    proposal = relationship("PaymentProposal", back_populates="authorizations")
    verification = relationship("TransactionVerification", backref="authorizations")

    def __repr__(self) -> str:
        return f"<PaymentAuthorization id={self.id} decision={self.decision} order={self.razorpay_order_id}>"

# =========================================================================
# PHASE 3: GROWTH INTELLIGENCE MODELS
# =========================================================================

class GrowthPrediction(Base):
    __tablename__ = "growth_predictions"

    id = Column(String(64), primary_key=True, default=lambda: generate_uuid("PRED-"))
    query_text = Column(Text, nullable=False)
    product_id = Column(String(64), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    selection_probability = Column(Float, nullable=False)
    rank = Column(Integer, nullable=True)
    context_features = Column(Text, nullable=True)  # JSON text
    model_version = Column(String(50), default="aegis-selection-v1", nullable=False)
    latency_ms = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    product = relationship("Product", backref="growth_predictions")

    @property
    def parsed_context_features(self) -> Dict[str, Any]:
        if not self.context_features:
            return {}
        try:
            return json.loads(self.context_features)
        except Exception:
            return {}

    def __repr__(self) -> str:
        return f"<GrowthPrediction id={self.id} prod={self.product_id} prob={self.selection_probability:.3f}>"

class GrowthOptimization(Base):
    __tablename__ = "growth_optimizations"

    id = Column(String(64), primary_key=True, default=lambda: generate_uuid("OPT-"))
    product_id = Column(String(64), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    action_type = Column(String(50), nullable=False)  # ADD_ATTRIBUTE, IMPROVE_DESCRIPTION, IMPROVE_DELIVERY, OPTIMIZE_PRICE
    target_field = Column(String(100), nullable=False)
    change_details = Column(Text, nullable=True)  # JSON text
    baseline_probability = Column(Float, nullable=False)
    optimized_probability = Column(Float, nullable=False)
    predicted_uplift = Column(Float, nullable=False)
    model_version = Column(String(50), default="aegis-selection-v1", nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    product = relationship("Product", backref="growth_optimizations")

    @property
    def parsed_change_details(self) -> Dict[str, Any]:
        if not self.change_details:
            return {}
        try:
            return json.loads(self.change_details)
        except Exception:
            return {}

    def __repr__(self) -> str:
        return f"<GrowthOptimization id={self.id} action={self.action_type} uplift={self.predicted_uplift:+.3f}>"

# =========================================================================
# PHASE 4: AUDIT LEDGER & SECURITY ATTACK MODELS
# =========================================================================

class AuditLedgerEntry(Base):
    __tablename__ = "audit_ledger_entries"

    id = Column(String(64), primary_key=True, default=lambda: generate_uuid("LEDGER-"))
    transaction_id = Column(String(64), nullable=False, index=True)
    session_id = Column(String(64), nullable=True, index=True)
    root_intent_id = Column(String(64), nullable=True, index=True)
    merchant_id = Column(String(64), nullable=True, index=True)
    product_id = Column(String(64), nullable=True, index=True)
    amount = Column(Float, nullable=True)
    currency = Column(String(10), default="INR", nullable=False)
    recipient = Column(String(255), nullable=True)
    discovery_reason = Column(Text, nullable=True)
    verification_reason = Column(Text, nullable=True)
    outcome = Column(String(50), nullable=False)  # AUTHORIZED, BLOCKED, HELD, ATTACK_PREVENTED
    risk_score = Column(Integer, nullable=False)
    policy_result = Column(String(50), nullable=False)  # PASS, BLOCK
    verification_result = Column(String(50), nullable=False)  # PASS, FAIL
    razorpay_order_id = Column(String(100), nullable=True, index=True)
    razorpay_payment_id = Column(String(100), nullable=True)
    attack_scenario = Column(String(100), nullable=True, index=True)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)
    previous_hash = Column(String(64), nullable=False)
    current_hash = Column(String(64), nullable=False, index=True)

    def to_canonical_dict(self) -> Dict[str, Any]:
        """Produce deterministic canonical dictionary for cryptographic hash chaining."""
        return {
            "transaction_id": str(self.transaction_id),
            "session_id": str(self.session_id or ""),
            "root_intent_id": str(self.root_intent_id or ""),
            "merchant_id": str(self.merchant_id or ""),
            "product_id": str(self.product_id or ""),
            "amount": float(self.amount or 0.0),
            "currency": str(self.currency),
            "recipient": str(self.recipient or ""),
            "outcome": str(self.outcome),
            "risk_score": int(self.risk_score),
            "policy_result": str(self.policy_result),
            "verification_result": str(self.verification_result),
            "razorpay_order_id": str(self.razorpay_order_id or ""),
            "attack_scenario": str(self.attack_scenario or ""),
        }

    def __repr__(self) -> str:
        return f"<AuditLedgerEntry id={self.id} tx={self.transaction_id} outcome={self.outcome} hash={self.current_hash[:8]}...>"

class AttackRecord(Base):
    __tablename__ = "attack_records"

    id = Column(String(64), primary_key=True, default=lambda: generate_uuid("ATK-"))
    scenario_name = Column(String(100), nullable=False, index=True)
    status = Column(String(50), default="DETECTED", nullable=False)  # DETECTED, BLOCKED
    root_intent_valid = Column(Boolean, nullable=False)
    derivation_valid = Column(Boolean, nullable=False)
    verification_result = Column(String(50), nullable=False)
    policy_result = Column(String(50), nullable=False)
    risk_score = Column(Integer, nullable=False)
    payment_created = Column(Boolean, default=False, nullable=False)
    explanation = Column(Text, nullable=False)
    payload = Column(Text, nullable=True)  # JSON string
    ledger_entry_id = Column(String(64), nullable=True, index=True)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    @property
    def parsed_payload(self) -> Dict[str, Any]:
        if not self.payload:
            return {}
        try:
            return json.loads(self.payload)
        except Exception:
            return {}

    def __repr__(self) -> str:
        return f"<AttackRecord id={self.id} scenario={self.scenario_name} status={self.status}>"

