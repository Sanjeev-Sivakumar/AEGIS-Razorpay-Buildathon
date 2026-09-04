from enum import Enum
from typing import Dict, Set

class AgentState(str, Enum):
    # Phase 1 Core States
    IDLE = "IDLE"
    PERCEIVE = "PERCEIVE"
    ANALYZE = "ANALYZE"
    DECIDE = "DECIDE"
    ACT = "ACT"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

    # Phase 4 Unified States
    UNDERSTAND = "UNDERSTAND"
    GROW = "GROW"
    LEARN = "LEARN"

    # Future Phase Extensions (Architecture Reservation)
    VERIFY = "VERIFY"
    PAY = "PAY"
    HOLD = "HOLD"
    ESCALATE = "ESCALATE"

# Explicit valid state transition matrix
VALID_TRANSITIONS: Dict[AgentState, Set[AgentState]] = {
    AgentState.IDLE: {AgentState.PERCEIVE, AgentState.FAILED},
    AgentState.PERCEIVE: {AgentState.ANALYZE, AgentState.UNDERSTAND, AgentState.FAILED},
    AgentState.UNDERSTAND: {AgentState.GROW, AgentState.ANALYZE, AgentState.FAILED},
    AgentState.GROW: {AgentState.ANALYZE, AgentState.DECIDE, AgentState.ACT, AgentState.FAILED},
    AgentState.ANALYZE: {AgentState.DECIDE, AgentState.FAILED},
    AgentState.DECIDE: {AgentState.GROW, AgentState.ACT, AgentState.FAILED},
    AgentState.ACT: {AgentState.VERIFY, AgentState.COMPLETED, AgentState.FAILED},
    AgentState.VERIFY: {AgentState.PAY, AgentState.HOLD, AgentState.FAILED},
    AgentState.PAY: {AgentState.COMPLETED, AgentState.FAILED},
    AgentState.HOLD: {AgentState.ESCALATE, AgentState.COMPLETED, AgentState.FAILED},
    AgentState.ESCALATE: {AgentState.COMPLETED, AgentState.FAILED},
    AgentState.COMPLETED: {AgentState.LEARN, AgentState.IDLE},  # Can transition to LEARN or reset
    AgentState.LEARN: {AgentState.IDLE},     # Finished learning, reset to IDLE
    AgentState.FAILED: {AgentState.IDLE},     # Can reset
}

def can_transition(from_state: AgentState, to_state: AgentState) -> bool:
    """Validate whether transitioning from one state to another is permissible."""
    return to_state in VALID_TRANSITIONS.get(from_state, set())
