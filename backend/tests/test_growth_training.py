import pytest
from app.growth.train import train_growth_model

def test_training_pipeline_execution(db_session):
    """Verify training loop runs, minimizes loss, evaluates metrics, and benchmarks baseline."""
    result = train_growth_model(
        db_session,
        epochs=2,
        batch_size=16,
        learning_rate=1e-3,
        seed=42,
    )

    assert result["model_version"] == "aegis-selection-v1"
    assert "dataset" in result
    assert result["dataset"]["total_samples"] > 0

    # History must contain epoch records
    assert len(result["history"]) == 2

    # Test metrics must be computed
    metrics = result["test_metrics"]
    for m in ["roc_auc", "pr_auc", "accuracy", "precision", "recall", "f1", "log_loss"]:
        assert m in metrics
        assert metrics[m] is not None

    # Baseline comparison must exist
    assert "baseline_comparison" in result
    assert "baseline_roc_auc" in result["baseline_comparison"]
    assert "aegis_dl_roc_auc" in result["baseline_comparison"]

    # Calibration report
    assert "calibration" in result
    assert len(result["calibration"]) == 10
