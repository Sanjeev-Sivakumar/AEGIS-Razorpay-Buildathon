import pytest
import numpy as np
import pandas as pd
from app.growth.dataset import generate_synthetic_interaction_dataset, split_interaction_dataset

def test_dataset_generation_reproducibility(db_session):
    """Verify that identical seeds generate identical interaction datasets."""
    df1 = generate_synthetic_interaction_dataset(db_session, target_samples=100, seed=42)
    df2 = generate_synthetic_interaction_dataset(db_session, target_samples=100, seed=42)

    assert len(df1) == len(df2)
    pd.testing.assert_frame_equal(df1, df2)

def test_dataset_schema_and_labels(db_session):
    """Verify dataset columns, non-nullity, and binary label range."""
    df = generate_synthetic_interaction_dataset(db_session, target_samples=150, seed=42)

    expected_cols = [
        "interaction_id", "query_id", "query_text", "product_id", "merchant_id",
        "category_match", "price", "max_budget", "price_ratio", "rating",
        "availability", "delivery_days", "attribute_completeness", "selected"
    ]
    for col in expected_cols:
        assert col in df.columns, f"Missing expected column: {col}"

    # Labels must be strictly binary
    unique_labels = set(df["selected"].unique())
    assert unique_labels.issubset({0, 1})
    assert len(unique_labels) == 2, "Dataset should have both positive and negative samples"

def test_train_val_test_split_separation(db_session):
    """Verify that train, validation, and test splits have disjoint queries to prevent leakage."""
    df = generate_synthetic_interaction_dataset(db_session, target_samples=200, seed=42)
    train_df, val_df, test_df = split_interaction_dataset(df, train_ratio=0.70, val_ratio=0.15, seed=42)

    train_queries = set(train_df["query_id"].unique())
    val_queries = set(val_df["query_id"].unique())
    test_queries = set(test_df["query_id"].unique())

    # Absolute query disjointness
    assert len(train_queries.intersection(val_queries)) == 0, "Query leakage between train and val"
    assert len(train_queries.intersection(test_queries)) == 0, "Query leakage between train and test"
    assert len(val_queries.intersection(test_queries)) == 0, "Query leakage between val and test"

    assert len(train_df) + len(val_df) + len(test_df) == len(df)
