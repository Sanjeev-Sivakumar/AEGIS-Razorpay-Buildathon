from functools import lru_cache
from typing import Dict, Any, List, Optional
import numpy as np
from sqlalchemy.orm import Session

from app.db.models import Product, Merchant, GrowthPrediction
from app.growth.inference import GrowthInferenceEngine
from app.growth.counterfactual import CounterfactualEngine, GrowthOptimizer
from app.growth.train import train_growth_model

class GrowthService:
    """Singleton service wrapping inference, simulation, optimization, and training."""

    def __init__(self):
        self.inference_engine = GrowthInferenceEngine()
        self.counterfactual_engine = CounterfactualEngine(self.inference_engine)
        self.optimizer = GrowthOptimizer(self.inference_engine, self.counterfactual_engine)

    def ensure_loaded(self, db: Session):
        if not self.inference_engine.is_loaded:
            self.inference_engine.load_model(db)

    def predict(
        self,
        query: str,
        product_id: str,
        db: Session,
        persist: bool = True,
    ) -> Dict[str, Any]:
        """Predict selection probability for a single product."""
        self.ensure_loaded(db)
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ValueError(f"Product '{product_id}' not found")

        merchant = db.query(Merchant).filter(Merchant.id == product.merchant_id).first()
        result = self.inference_engine.predict_product(query, product, merchant)

        if persist:
            import json
            from app.db.models import generate_uuid, utc_now
            pred_record = GrowthPrediction(
                id=generate_uuid("PRED-"),
                query_text=query,
                product_id=product.id,
                selection_probability=result["selection_probability"],
                rank=result.get("rank"),
                context_features=json.dumps(result["context_features"]),
                model_version=result["model_version"],
                latency_ms=result["latency_ms"],
                created_at=utc_now(),
            )
            db.add(pred_record)
            db.commit()

        return result

    def rank(
        self,
        query: str,
        product_ids: List[str],
        db: Session,
    ) -> List[Dict[str, Any]]:
        """Rank multiple products for a query."""
        self.ensure_loaded(db)
        products = db.query(Product).filter(Product.id.in_(product_ids)).all()
        if not products:
            # Fallback if catalog IDs (e.g. HOTEL-GOA-01) don't match DB primary keys directly
            q_lower = query.lower()
            if "hotel" in q_lower or "goa" in q_lower:
                products = db.query(Product).filter(Product.category == "hotel").all()
            elif "laptop" in q_lower:
                products = db.query(Product).filter(Product.category == "laptop").all()
            elif "shoe" in q_lower or "boot" in q_lower:
                products = db.query(Product).filter(Product.category == "footwear").all()
            if not products:
                products = db.query(Product).limit(6).all()
        merchants = {m.id: m for m in db.query(Merchant).all()}
        return self.inference_engine.rank_products(query, products, merchants)

    def simulate(
        self,
        query: str,
        product_id: str,
        db: Session,
    ) -> Dict[str, Any]:
        """Run counterfactual simulation for a product."""
        self.ensure_loaded(db)
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ValueError(f"Product '{product_id}' not found")
        merchant = db.query(Merchant).filter(Merchant.id == product.merchant_id).first()
        return self.counterfactual_engine.simulate_scenarios(query, product, merchant)

    def optimize(
        self,
        query: str,
        product_id: str,
        db: Session,
        scenario: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Apply optimal catalog intervention and persist."""
        self.ensure_loaded(db)
        opt_record = self.optimizer.apply_optimization(db, product_id, query, scenario, session_id)
        return {
            "optimization_id": opt_record.id,
            "product_id": opt_record.product_id,
            "action_type": opt_record.action_type,
            "target_field": opt_record.target_field,
            "baseline_probability": opt_record.baseline_probability,
            "optimized_probability": opt_record.optimized_probability,
            "predicted_uplift": opt_record.predicted_uplift,
            "applied_change": opt_record.parsed_change_details,
            "model_version": opt_record.model_version,
            "created_at": opt_record.created_at,
        }

    def analyze_merchant(
        self,
        merchant_id: str,
        db: Session,
    ) -> Dict[str, Any]:
        """Produce comprehensive catalog growth analysis for a merchant."""
        self.ensure_loaded(db)
        merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
        if not merchant:
            raise ValueError(f"Merchant '{merchant_id}' not found")

        products = db.query(Product).filter(Product.merchant_id == merchant.id).all()
        if not products:
            return {
                "merchant_id": merchant.id,
                "merchant_name": merchant.name,
                "product_count": 0,
                "avg_selection_probability": 0.0,
                "message": "Merchant has no products in catalog",
            }

        # Benchmark each product against a default canonical query for its category
        predictions = []
        for p in products:
            q = f"{p.category} {p.name}"
            pred = self.inference_engine.predict_product(q, p, merchant)
            predictions.append(pred)

        probs = [p["selection_probability"] for p in predictions]
        avg_prob = float(np.mean(probs)) if probs else 0.0

        predictions.sort(key=lambda x: x["selection_probability"], reverse=True)
        top_prod = predictions[0] if predictions else None
        weakest_prod = predictions[-1] if predictions else None

        # Attribute completeness capped at 1.0
        comp_scores = [min(1.0, len(p.parsed_attributes) / 4.0) for p in products]
        avg_completeness = float(np.mean(comp_scores)) if comp_scores else 0.0

        return {
            "merchant_id": merchant.id,
            "merchant_name": merchant.name,
            "product_count": len(products),
            "complete_attributes_pct": round(avg_completeness * 100, 1),
            "available_count": sum(1 for p in products if p.is_active),
            "avg_selection_probability": round(avg_prob, 4),
            "top_product": {
                "id": top_prod["product_id"],
                "name": top_prod["product_name"],
                "selection_probability": top_prod["selection_probability"],
            } if top_prod else None,
            "weakest_product": {
                "id": weakest_prod["product_id"],
                "name": weakest_prod["product_name"],
                "selection_probability": weakest_prod["selection_probability"],
            } if weakest_prod else None,
            "growth_opportunities": [
                "Enrich missing technical attributes (material, dimensions)",
                "Optimize delivery speed metadata for faster buyer fulfillment",
                "Expand product descriptions with certification standards",
            ],
        }

    def train(
        self,
        db: Session,
        epochs: int = 15,
        batch_size: int = 32,
        lr: float = 1e-3,
    ) -> Dict[str, Any]:
        """Train and evaluate the neural selection model."""
        res = train_growth_model(db, epochs=epochs, batch_size=batch_size, learning_rate=lr)
        # Reload newly trained model into inference engine
        self.inference_engine.load_model(db)
        return res

@lru_cache()
def get_growth_service() -> GrowthService:
    return GrowthService()
