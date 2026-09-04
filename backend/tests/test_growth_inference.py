import pytest
from app.db.models import Product
from app.growth.service import get_growth_service

def test_inference_prediction_bounds_and_structure(db_session):
    """Verify single product prediction returns valid probabilities and context indicators."""
    growth_svc = get_growth_service()
    growth_svc.ensure_loaded(db_session)

    product = db_session.query(Product).first()
    assert product is not None

    query = "running shoes under 3000"
    res = growth_svc.predict(query, product.id, db_session, persist=False)

    assert "selection_probability" in res
    prob = res["selection_probability"]
    assert 0.0 <= prob <= 1.0, "Probability must be within [0, 1]"
    assert res["model_version"] == "aegis-selection-v1"
    assert "context_features" in res
    assert "latency_ms" in res
    assert res["latency_ms"] >= 0

def test_inference_ranking_order(db_session):
    """Verify product ranking sorts descending by selection probability."""
    growth_svc = get_growth_service()
    growth_svc.ensure_loaded(db_session)

    products = db_session.query(Product).limit(4).all()
    p_ids = [p.id for p in products]

    query = "luxury hotel in Goa under 3000"
    ranked = growth_svc.rank(query, p_ids, db_session)

    assert len(ranked) == len(p_ids)

    # Must be sorted descending by probability
    probs = [r["selection_probability"] for r in ranked]
    assert probs == sorted(probs, reverse=True), "Ranked products must be sorted descending by probability"

    # Ranks must be consecutive integers starting from 1
    ranks = [r["rank"] for r in ranked]
    assert ranks == list(range(1, len(ranked) + 1))
