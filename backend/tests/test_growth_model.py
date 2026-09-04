import pytest
import torch
from app.growth.model import HybridSelectionModel

def test_model_forward_and_shapes():
    """Verify HybridSelectionModel forward pass and output shapes."""
    batch_size = 4
    model = HybridSelectionModel(
        query_dim=384,
        product_dim=10,
        merchant_dim=3,
        graph_dim=32,
    )
    model.eval()

    q = torch.randn(batch_size, 384)
    p = torch.randn(batch_size, 10)
    m = torch.randn(batch_size, 3)
    g = torch.randn(batch_size, 32)

    with torch.no_grad():
        logits = model(q, p, m, g)
        probs = model.predict_proba(q, p, m, g)

    assert logits.shape == (batch_size, 1)
    assert probs.shape == (batch_size,)

    # Probabilities must be strictly bounded in [0, 1]
    assert (probs >= 0.0).all()
    assert (probs <= 1.0).all()

def test_model_ablation_sensitivity():
    """Verify that model output responds when input features are modified."""
    model = HybridSelectionModel()
    model.eval()

    q = torch.randn(1, 384)
    m = torch.randn(1, 3)
    g = torch.randn(1, 32)

    # Product A: standard features
    p_a = torch.zeros(1, 10)
    p_a[0, 0] = 0.5  # price ratio
    p_a[0, 1] = 0.8  # rating

    # Product B: heavily altered features
    p_b = torch.zeros(1, 10)
    p_b[0, 0] = 2.5  # expensive
    p_b[0, 1] = 0.2  # low rating

    with torch.no_grad():
        prob_a = float(model.predict_proba(q, p_a, m, g).item())
        prob_b = float(model.predict_proba(q, p_b, m, g).item())

    # The model must not output identical numbers for different inputs
    assert prob_a != prob_b, "Model output should vary when features change"
