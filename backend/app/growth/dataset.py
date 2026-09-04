import random
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional
from sqlalchemy.orm import Session

from app.config.settings import get_settings
from app.db.models import Product, Merchant

# Seed queries representing diverse commercial categories
CANONICAL_QUERIES = [
    # Hotels / Travel
    {"text": "luxury hotel in Goa near beach under 3000", "category": "hotel", "location": "Goa", "budget": 3000.0},
    {"text": "budget resort in Candolim with swimming pool under 2800", "category": "hotel", "location": "Goa", "budget": 2800.0},
    {"text": "coastal boutique stay in Goa under 2000", "category": "hotel", "location": "Goa", "budget": 2000.0},
    {"text": "premium villa in South Goa under 3500", "category": "hotel", "location": "Goa", "budget": 3500.0},
    {"text": "beachfront inn in Calangute with complimentary breakfast under 2500", "category": "hotel", "location": "Goa", "budget": 2500.0},
    {"text": "family cottage in Goa with garden view under 3000", "category": "hotel", "location": "Goa", "budget": 3000.0},
    {"text": "affordable lodge in Panaji under 1800", "category": "hotel", "location": "Goa", "budget": 1800.0},
    {"text": "deluxe hotel room near Baga beach under 3200", "category": "hotel", "location": "Goa", "budget": 3200.0},

    # Footwear / Sports
    {"text": "lightweight running shoes under 3000", "category": "footwear", "location": None, "budget": 3000.0},
    {"text": "breathable marathon trail sneakers under 2500", "category": "footwear", "location": None, "budget": 2500.0},
    {"text": "shock absorbing athletic shoes for men under 3500", "category": "footwear", "location": None, "budget": 3500.0},
    {"text": "durable gym training footwear under 2200", "category": "footwear", "location": None, "budget": 2200.0},
    {"text": "cushioned road running shoes under 2800", "category": "footwear", "location": None, "budget": 2800.0},

    # Electronics / Tech
    {"text": "portable ultrabook laptop 16GB RAM under 55000", "category": "electronics", "location": None, "budget": 55000.0},
    {"text": "lightweight student laptop for coding under 50000", "category": "electronics", "location": None, "budget": 50000.0},
    {"text": "high resolution 14 inch display laptop under 60000", "category": "electronics", "location": None, "budget": 60000.0},
    {"text": "fast SSD laptop with backlit keyboard under 48000", "category": "electronics", "location": None, "budget": 48000.0},
]

def generate_synthetic_interaction_dataset(
    db: Session,
    target_samples: int = 2400,
    seed: Optional[int] = None,
) -> pd.DataFrame:
    """
    Generate a deterministic synthetic interaction dataset representing AI-buyer product evaluations.
    Documented: Uses realistic commerce utility mechanics (similarity, budget ratio, attributes, rating).
    """
    settings = get_settings()
    effective_seed = seed if seed is not None else settings.GROWTH_DATASET_SEED

    random.seed(effective_seed)
    np.random.seed(effective_seed)

    products = db.query(Product).filter(Product.availability == True).all()
    merchants = {m.id: m for m in db.query(Merchant).all()}

    if not products:
        raise RuntimeError("Cannot generate dataset: No active products found in database.")

    # Pre-calculate merchant base ratings & catalog counts
    merchant_stats = {}
    for m_id, m in merchants.items():
        m_prods = [p for p in products if p.merchant_id == m_id]
        merchant_stats[m_id] = {
            "rating": m.trust_score if hasattr(m, "trust_score") and m.trust_score else 4.2,
            "product_count": len(m_prods),
            "selection_rate": round(random.uniform(0.20, 0.45), 3),
        }

    rows = []
    sample_id = 1

    # Repeat queries with variations to achieve target_samples
    queries_pool = CANONICAL_QUERIES * ((target_samples // (len(CANONICAL_QUERIES) * len(products))) + 2)

    for q_idx, q in enumerate(queries_pool):
        if len(rows) >= target_samples:
            break

        query_id = f"Q-{q_idx+1:04d}"
        q_text = q["text"]
        q_cat = q["category"]
        q_loc = q["location"]
        max_budget = q["budget"]

        # Candidate selection: products in same category or close
        candidate_products = [p for p in products if p.category == q_cat]
        if not candidate_products:
            candidate_products = products[:4]

        # Add competing products
        competitor_count = len(candidate_products)

        # Calculate ranks across candidates for this query
        prices = [p.price for p in candidate_products]
        sorted_prices = sorted(prices)

        for p in candidate_products:
            if len(rows) >= target_samples:
                break

            m_info = merchant_stats.get(p.merchant_id, {"rating": 4.0, "selection_rate": 0.25})

            # 1. Category & Location Match
            cat_match = 1.0 if p.category == q_cat else 0.0
            loc_match = 1.0
            if q_loc:
                attrs = p.parsed_attributes
                loc_val = attrs.get("location", "")
                loc_match = 1.0 if q_loc.lower() in loc_val.lower() or q_loc.lower() in p.name.lower() else 0.2

            # 2. Financial Fit
            price_ratio = min(3.0, p.price / max(1.0, max_budget))
            price_rank = sorted_prices.index(p.price) + 1

            # 3. Quality & Attributes
            attrs = p.parsed_attributes
            attr_count = len(attrs)
            attr_completeness = min(1.0, attr_count / 4.0)
            desc_len = len(p.description or "")
            desc_quality = min(1.0, desc_len / 120.0)

            # 4. Shipping & Delivery
            delivery_days = random.randint(1, 5) if p.category != "hotel" else 0
            rating = float(attrs.get("rating", random.uniform(3.8, 4.8)))

            # Latent Commerce Utility Formulation:
            # High semantic/location match (+), within budget (+), high rating (+), high attribute completeness (+)
            # Exceeding budget penalty (-), slow delivery penalty (-)
            budget_penalty = max(0.0, price_ratio - 1.0) * 3.5
            price_advantage = max(0.0, 1.0 - price_ratio) * 1.5

            latent_utility = (
                (cat_match * 1.8)
                + (loc_match * 1.2)
                + (price_advantage * 1.2)
                - budget_penalty
                + ((rating - 3.0) * 0.8)
                + (attr_completeness * 0.9)
                + (desc_quality * 0.5)
                + (m_info["selection_rate"] * 0.6)
                - (delivery_days * 0.08)
                + np.random.normal(0.0, 0.28)  # Controlled stochastic realism
            )

            # Ground-truth probability via Sigmoid
            true_prob = 1.0 / (1.0 + np.exp(-latent_utility))
            true_prob = float(np.clip(true_prob, 0.01, 0.99))

            # Binary outcome sampled from true probability
            selected = 1 if random.random() < true_prob else 0

            rows.append({
                "interaction_id": f"INT-{sample_id:05d}",
                "query_id": query_id,
                "query_text": q_text,
                "product_id": p.id,
                "product_name": p.name,
                "category": p.category,
                "merchant_id": p.merchant_id,
                "category_match": cat_match,
                "location_match": loc_match,
                "price": p.price,
                "max_budget": max_budget,
                "price_ratio": round(price_ratio, 3),
                "price_rank": price_rank,
                "rating": round(rating, 2),
                "availability": 1 if p.is_active else 0,
                "delivery_days": delivery_days,
                "attribute_completeness": round(attr_completeness, 3),
                "description_quality": round(desc_quality, 3),
                "merchant_rating": round(m_info["rating"], 2),
                "merchant_selection_rate": m_info["selection_rate"],
                "competitor_count": competitor_count,
                "latent_probability": round(true_prob, 4),
                "selected": selected,
            })
            sample_id += 1

    df = pd.DataFrame(rows)
    return df

def split_interaction_dataset(
    df: pd.DataFrame,
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    seed: int = 42,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Deterministically split interaction dataset by Query ID to eliminate cross-query feature leakage.
    Default split: 70% Train, 15% Validation, 15% Test.
    """
    unique_queries = df["query_id"].unique()
    rng = np.random.RandomState(seed)
    shuffled_queries = rng.permutation(unique_queries)

    n_total = len(shuffled_queries)
    n_train = int(n_total * train_ratio)
    n_val = int(n_total * val_ratio)

    train_q = set(shuffled_queries[:n_train])
    val_q = set(shuffled_queries[n_train : n_train + n_val])
    test_q = set(shuffled_queries[n_train + n_val :])

    train_df = df[df["query_id"].isin(train_q)].copy().reset_index(drop=True)
    val_df = df[df["query_id"].isin(val_q)].copy().reset_index(drop=True)
    test_df = df[df["query_id"].isin(test_q)].copy().reset_index(drop=True)

    return train_df, val_df, test_df
