from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict

class IntentAttribute(BaseModel):
    key: str
    value: str

class IntentExtractionResult(BaseModel):
    category: Optional[str] = Field(default=None, description="Inferred category (e.g. hotel, laptop, shoes)")
    location: Optional[str] = Field(default=None, description="Extracted geographical location if any")
    max_budget: Optional[float] = Field(default=None, description="Maximum budget value extracted from request")
    currency: str = Field(default="INR", description="Currency symbol or 3-letter code")
    attributes: List[Dict[str, Any]] = Field(default_factory=list, description="Additional constraints or preferences")
    date_constraint: Optional[str] = Field(default=None, description="Temporal constraints like 'this weekend'")
    source: str = Field(default="groq", description="Source of extraction: 'groq' or 'fallback'")
    raw_text: str = Field(default="", description="Original user prompt")

class QueryIntentCreate(BaseModel):
    text: str = Field(..., min_length=1, description="Raw natural language intent string", examples=["Find me a hotel in Goa under ₹3000"])

class QueryIntentResponse(BaseModel):
    id: str
    raw_text: str
    category: Optional[str] = None
    location: Optional[str] = None
    max_budget: Optional[float] = None
    currency: str = "INR"
    attributes: List[Dict[str, Any]] = Field(default_factory=list)
    source: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
