import pytest
from app.db.models import Product, GrowthOptimization
from app.growth.service import get_growth_service

def test_counterfactual_simulation(db_session):
    """Verify counterfactual simulation generates scenarios and calculates uplifts."""
    growth_svc = get_growth_service()
    growth_svc.ensure_loaded(db_session)

    product = db_session.query(Product).first()
    query = "running shoes under 2500"

    sim = growth_svc.simulate(query, product.id, db_session)

    assert "baseline_probability" in sim
    assert 0.0 <= sim["baseline_probability"] <= 1.0
    assert "scenarios" in sim
    assert len(sim["scenarios"]) >= 3

    for s in sim["scenarios"]:
        assert "change" in s
        assert "predicted_probability" in s
        assert "uplift" in s
        assert 0.0 <= s["predicted_probability"] <= 1.0
        # Uplift must equal predicted - baseline (within rounding)
        expected_uplift = round(s["predicted_probability"] - sim["baseline_probability"], 4)
        assert abs(s["uplift"] - expected_uplift) < 1e-3

    assert "recommended_action" in sim

def test_optimization_application_and_persistence(db_session):
    """Verify that applying an optimization modifies product attributes and persists GrowthOptimization record."""
    growth_svc = get_growth_service()
    growth_svc.ensure_loaded(db_session)

    product = db_session.query(Product).first()
    query = "hotel in Goa under 3000"

    opt = growth_svc.optimize(query, product.id, db_session)

    assert opt["optimization_id"].startswith("OPT-")
    assert opt["product_id"] == product.id
    assert "baseline_probability" in opt
    assert "optimized_probability" in opt
    assert "predicted_uplift" in opt

    # Record must exist in DB
    db_rec = db_session.query(GrowthOptimization).filter(GrowthOptimization.id == opt["optimization_id"]).first()
    assert db_rec is not None
