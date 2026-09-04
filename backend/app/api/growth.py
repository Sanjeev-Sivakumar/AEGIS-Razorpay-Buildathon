from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Product, Merchant
from app.schemas.growth import (
    PredictionRequest,
    PredictionResponse,
    RankRequest,
    RankResponse,
    CounterfactualRequest,
    CounterfactualResponse,
    OptimizationApplyRequest,
    OptimizationApplyResponse,
)
from app.growth.service import get_growth_service

router = APIRouter(prefix="/growth", tags=["Growth Intelligence"])

@router.post("/predict", response_model=PredictionResponse)
def predict_product_selection(
    payload: PredictionRequest,
    db: Session = Depends(get_db),
):
    """Predict AI-buyer selection probability for a single product offering."""
    growth_svc = get_growth_service()
    try:
        res = growth_svc.predict(payload.query, payload.product_id, db)
        return PredictionResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Growth Prediction Error: {str(e)}")

@router.post("/rank", response_model=RankResponse)
def rank_products_for_query(
    payload: RankRequest,
    db: Session = Depends(get_db),
):
    """Rank candidate products for a query, sorted descending by predicted selection probability."""
    growth_svc = get_growth_service()
    try:
        results = growth_svc.rank(payload.query, payload.product_ids, db)
        return RankResponse(
            query=payload.query,
            results=[PredictionResponse(**r) for r in results],
            model_version=growth_svc.inference_engine.model_version,
            device=str(growth_svc.inference_engine.device),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Growth Ranking Error: {str(e)}")

@router.post("/simulate", response_model=CounterfactualResponse)
def simulate_counterfactuals(
    payload: CounterfactualRequest,
    db: Session = Depends(get_db),
):
    """Simulate candidate catalog interventions and predict selection probability uplift."""
    growth_svc = get_growth_service()
    try:
        res = growth_svc.simulate(payload.query, payload.product_id, db)
        return CounterfactualResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Counterfactual Simulation Error: {str(e)}")

@router.post("/optimize", response_model=OptimizationApplyResponse)
def apply_catalog_optimization(
    payload: OptimizationApplyRequest,
    db: Session = Depends(get_db),
):
    """Apply an approved counterfactual optimization to the database and re-score."""
    growth_svc = get_growth_service()
    try:
        res = growth_svc.optimize(payload.query, payload.product_id, db, payload.scenario_change)
        return OptimizationApplyResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Catalog Optimization Error: {str(e)}")

@router.get("/product/{product_id}")
def get_product_growth_profile(
    product_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve growth intelligence profile and recent predictions for a product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Product '{product_id}' not found")

    growth_svc = get_growth_service()
    growth_svc.ensure_loaded(db)

    # Benchmark with a canonical query
    query = f"{product.category} {product.name}"
    merchant = db.query(Merchant).filter(Merchant.id == product.merchant_id).first()
    pred = growth_svc.inference_engine.predict_product(query, product, merchant)

    return {
        "product_id": product.id,
        "name": product.name,
        "category": product.category,
        "price": product.price,
        "currency": product.currency,
        "attributes": product.parsed_attributes,
        "benchmark_query": query,
        "selection_probability": pred["selection_probability"],
        "context_features": pred["context_features"],
        "model_version": pred["model_version"],
    }

@router.get("/merchant/{merchant_id}")
def get_merchant_growth_profile(
    merchant_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve merchant catalog growth analysis and optimization opportunities."""
    growth_svc = get_growth_service()
    try:
        return growth_svc.analyze_merchant(merchant_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Merchant Analysis Error: {str(e)}")
