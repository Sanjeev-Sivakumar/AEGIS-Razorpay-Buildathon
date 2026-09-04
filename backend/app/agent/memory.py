from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from app.agent.state import AgentState
from app.schemas.intent import IntentExtractionResult

@dataclass
class AgentMemory:
    session_id: str
    root_request: str
    current_state: AgentState = AgentState.IDLE
    parsed_intent: Optional[IntentExtractionResult] = None
    events: List[Dict[str, Any]] = field(default_factory=list)
    decisions: List[Dict[str, Any]] = field(default_factory=list)
    action_result: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def record_event(self, event_dict: Dict[str, Any]) -> None:
        self.events.append(event_dict)

    def record_decision(self, decision_dict: Dict[str, Any]) -> None:
        self.decisions.append(decision_dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "root_request": self.root_request,
            "current_state": self.current_state.value,
            "parsed_intent": self.parsed_intent.model_dump() if self.parsed_intent else None,
            "events_count": len(self.events),
            "decisions": self.decisions,
            "action_result": self.action_result,
            "metadata": self.metadata,
        }
