from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict

class PredictionRequest(BaseModel):
    query: str
    product_id: str

class PredictionResponse(BaseModel):
    product_id: str
    product_name: Optional[str] = None
    merchant_name: Optional[str] = None
    selection_probability: float = Field(..., ge=0.0, le=1.0)
    rank: Optional[int] = None
    context_features: Dict[str, float] = Field(default_factory=dict)
    model_version: str
    device: str
    latency_ms: float = 0.0

    model_config = ConfigDict(from_attributes=True)

class RankRequest(BaseModel):
    query: str
    product_ids: List[str]

class RankResponse(BaseModel):
    query: str
    results: List[PredictionResponse]
    model_version: str
    device: str

class CounterfactualRequest(BaseModel):
    product_id: str
    query: str

class CounterfactualScenarioItem(BaseModel):
    change: str
    action_type: str
    target_field: str
    predicted_probability: float
    uplift: float
    details: Dict[str, Any] = Field(default_factory=dict)

class CounterfactualResponse(BaseModel):
    product_id: str
    product_name: str
    query: str
    baseline_probability: float
    scenarios: List[CounterfactualScenarioItem]
    recommended_action: str
    model_version: str

class OptimizationApplyRequest(BaseModel):
    product_id: str
    query: str
    scenario_change: Optional[str] = None

class OptimizationApplyResponse(BaseModel):
    optimization_id: str
    product_id: str
    action_type: str
    target_field: str
    baseline_probability: float
    optimized_probability: float
    predicted_uplift: float
    applied_change: Dict[str, Any]
    model_version: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
