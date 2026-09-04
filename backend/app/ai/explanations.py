from typing import Any, Dict, List
from app.schemas.intent import IntentExtractionResult

def explain_intent(intent: IntentExtractionResult) -> str:
    """Generate a clean human-readable explanation of extracted intent."""
    parts = []
    if intent.category:
        parts.append(f"Category: {intent.category.upper()}")
    if intent.location:
        parts.append(f"Location: {intent.location}")
    if intent.max_budget is not None:
        parts.append(f"Budget Cap: {intent.currency} {intent.max_budget:,.2f}")
    if intent.date_constraint:
        parts.append(f"Timing: {intent.date_constraint}")
    
    source_tag = f"[{intent.source.upper()}]"
    details = ", ".join(parts) if parts else "Generic query without strict constraints"
    return f"{source_tag} {details}"

def explain_decision(
    intent: IntentExtractionResult,
    candidate_count: int,
    action_type: str = "DISCOVERY"
) -> str:
    """Generate decision reasoning explanation."""
    criteria = []
    if intent.category:
        criteria.append(f"category='{intent.category}'")
    if intent.location:
        criteria.append(f"location='{intent.location}'")
    if intent.max_budget is not None:
        criteria.append(f"price <= {intent.currency} {intent.max_budget}")

    criteria_str = " AND ".join(criteria) if criteria else "broad search criteria"
    return (
        f"Selected action '{action_type}' for {criteria_str}. "
        f"Identified {candidate_count} eligible merchant offerings in inventory."
    )
