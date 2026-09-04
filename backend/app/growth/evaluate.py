import numpy as np
from typing import Dict, Any, List, Tuple
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    log_loss,
)
from sklearn.linear_model import LogisticRegression

def compute_classification_metrics(
    y_true: np.ndarray,
    y_pred_proba: np.ndarray,
    threshold: float = 0.5,
) -> Dict[str, float]:
    """Compute comprehensive classification and ranking metrics."""
    y_true = np.asarray(y_true).astype(int)
    y_pred_proba = np.asarray(y_pred_proba).astype(float)
    y_pred_proba = np.clip(y_pred_proba, 1e-7, 1 - 1e-7)
    y_pred = (y_pred_proba >= threshold).astype(int)

    metrics = {
        "roc_auc": float(roc_auc_score(y_true, y_pred_proba)),
        "pr_auc": float(average_precision_score(y_true, y_pred_proba)),
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        "log_loss": float(log_loss(y_true, y_pred_proba)),
    }
    return metrics

def evaluate_calibration(
    y_true: np.ndarray,
    y_pred_proba: np.ndarray,
    num_bins: int = 10,
) -> List[Dict[str, Any]]:
    """
    Evaluate predicted probability calibration by binning predictions and
    comparing mean predicted probability against observed empirical frequency.
    """
    bins = np.linspace(0.0, 1.0, num_bins + 1)
    bin_assignments = np.digitize(y_pred_proba, bins) - 1
    calibration_report = []

    for b in range(num_bins):
        mask = bin_assignments == b
        count = int(np.sum(mask))
        if count > 0:
            mean_pred = float(np.mean(y_pred_proba[mask]))
            empirical_freq = float(np.mean(y_true[mask]))
        else:
            mean_pred = float((bins[b] + bins[b + 1]) / 2.0)
            empirical_freq = 0.0

        calibration_report.append({
            "bin": b + 1,
            "range": f"[{bins[b]:.1f}, {bins[b+1]:.1f})",
            "samples": count,
            "mean_pred_probability": round(mean_pred, 3),
            "observed_frequency": round(empirical_freq, 3),
        })

    return calibration_report

def train_baseline_model(
    x_train: np.ndarray,
    y_train: np.ndarray,
    x_test: np.ndarray,
    y_test: np.ndarray,
) -> Dict[str, Any]:
    """Train a simple Logistic Regression baseline to benchmark deep learning model gains."""
    clf = LogisticRegression(max_iter=500, random_state=42)
    clf.fit(x_train, y_train)

    probs = clf.predict_proba(x_test)[:, 1]
    metrics = compute_classification_metrics(y_test, probs)
    return {
        "model": "LogisticRegression (Structured Features Baseline)",
        "metrics": metrics,
    }
