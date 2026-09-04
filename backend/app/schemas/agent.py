from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict

class AgentRunRequest(BaseModel):
    input: str = Field(..., min_length=1, description="Natural language purchase or discovery query", examples=["Find me a hotel in Goa under ₹3000"])

class AgentEventResponse(BaseModel):
    id: str
    session_id: str
    event_type: str
    state: str
    message: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AgentSessionResponse(BaseModel):
    id: str
    status: str
    current_state: str
    created_at: datetime
    updated_at: datetime
    events: List[AgentEventResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

class AgentRunResponse(BaseModel):
    session_id: str
    status: str
    current_state: str
    intent: Dict[str, Any]
    events: List[AgentEventResponse]
    result: Dict[str, Any] = Field(default_factory=dict)
