import os
import time
import logging
from pathlib import Path
from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader
from sqlalchemy.orm import Session

from app.config.settings import get_settings
from app.growth.dataset import generate_synthetic_interaction_dataset, split_interaction_dataset
from app.growth.encoders import QueryEncoder, ProductEncoder, MerchantEncoder
from app.growth.graphsage import CommerceGraphBuilder, CommerceGraphSAGE
from app.growth.model import HybridSelectionModel
from app.growth.evaluate import compute_classification_metrics, evaluate_calibration, train_baseline_model

logger = logging.getLogger("aegis.growth.train")

def prepare_tensors(
    df: pd.DataFrame,
    query_encoder: QueryEncoder,
    product_encoder: ProductEncoder,
    merchant_encoder: MerchantEncoder,
    product_graph_embs: Dict[str, torch.Tensor],
    device: torch.device,
) -> Tuple[TensorDataset, np.ndarray]:
    """Prepare vectorized tensor inputs for PyTorch DataLoader."""
    q_texts = df["query_text"].tolist()
    q_embs = query_encoder.encode_batch(q_texts)

    p_feats_list = []
    m_feats_list = []
    g_embs_list = []
    y_labels = df["selected"].to_numpy(dtype=np.float32)

    default_graph_emb = torch.zeros(32, dtype=torch.float32)

    for _, row in df.iterrows():
        p_row = row.to_dict()
        p_feat = product_encoder.encode_features(p_row)
        p_feats_list.append(p_feat)

        m_info = {
            "rating": row["merchant_rating"],
            "selection_rate": row["merchant_selection_rate"],
        }
        m_feat = merchant_encoder.encode_merchant(m_info)
        m_feats_list.append(m_feat)

        prod_id = row["product_id"]
        g_emb = product_graph_embs.get(prod_id, default_graph_emb)
        g_embs_list.append(g_emb.detach().cpu().numpy())

    t_q = torch.tensor(q_embs, dtype=torch.float32)
    t_p = torch.tensor(np.array(p_feats_list), dtype=torch.float32)
    t_m = torch.tensor(np.array(m_feats_list), dtype=torch.float32)
    t_g = torch.tensor(np.array(g_embs_list), dtype=torch.float32)
    t_y = torch.tensor(y_labels, dtype=torch.float32).unsqueeze(1)

    dataset = TensorDataset(t_q, t_p, t_m, t_g, t_y)
    structured_tabular_x = np.hstack([np.array(p_feats_list), np.array(m_feats_list)])
    return dataset, structured_tabular_x

def train_growth_model(
    db: Session,
    epochs: int = 15,
    batch_size: int = 32,
    learning_rate: float = 1e-3,
    seed: int = 42,
) -> Dict[str, Any]:
    """
    Complete end-to-end training and evaluation pipeline for Aegis Growth Intelligence.
    Executes dataset generation, GraphSAGE message passing, fusion network training,
    baseline benchmarking, and checkpoint persistence.
    """
    start_time = time.time()
    settings = get_settings()

    # Hardware Detection
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Initiating Growth Model Training on device: {device}")

    # Set deterministic seeds
    torch.manual_seed(seed)
    np.random.seed(seed)

    # 1. Dataset Generation & Splitting
    logger.info("Generating synthetic commerce interaction dataset...")
    df = generate_synthetic_interaction_dataset(db, target_samples=2400, seed=seed)
    train_df, val_df, test_df = split_interaction_dataset(df, train_ratio=0.70, val_ratio=0.15, seed=seed)
    logger.info(f"Dataset Split: Train={len(train_df)}, Val={len(val_df)}, Test={len(test_df)}")

    # 2. Commerce Graph Construction & GraphSAGE Message Passing
    logger.info("Constructing commerce graph and computing GraphSAGE embeddings...")
    graph_builder = CommerceGraphBuilder(feature_dim=64)
    graph_data, prod_idx_map = graph_builder.build_from_database(db)

    graph_sage = CommerceGraphSAGE(in_channels=64, hidden_channels=48, out_channels=32).to(device)
    graph_data = graph_data.to(device)

    graph_sage.eval()
    with torch.no_grad():
        all_node_embeddings = graph_sage(graph_data.x, graph_data.edge_index)

    # Extract learned product node embeddings
    product_graph_embs: Dict[str, torch.Tensor] = {}
    for p_id, node_idx in prod_idx_map.items():
        product_graph_embs[p_id] = all_node_embeddings[node_idx].cpu()

    # 3. Encoders & Tensor Preparation
    query_encoder = QueryEncoder()
    product_encoder = ProductEncoder()
    merchant_encoder = MerchantEncoder()

    train_ds, x_train_tab = prepare_tensors(train_df, query_encoder, product_encoder, merchant_encoder, product_graph_embs, device)
    val_ds, x_val_tab = prepare_tensors(val_df, query_encoder, product_encoder, merchant_encoder, product_graph_embs, device)
    test_ds, x_test_tab = prepare_tensors(test_df, query_encoder, product_encoder, merchant_encoder, product_graph_embs, device)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False)

    # 4. Train Logistic Regression Baseline
    logger.info("Training Logistic Regression structured features baseline...")
    baseline_eval = train_baseline_model(
        x_train=x_train_tab,
        y_train=train_df["selected"].to_numpy(),
        x_test=x_test_tab,
        y_test=test_df["selected"].to_numpy(),
    )

    # 5. Initialize Hybrid Selection Neural Network
    model = HybridSelectionModel(
        query_dim=384,
        product_dim=10,
        merchant_dim=3,
        graph_dim=32,
        version=settings.GROWTH_MODEL_VERSION,
    ).to(device)

    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate, weight_decay=1e-4)
    criterion = nn.BCEWithLogitsLoss()

    # 6. Training Loop
    logger.info(f"Beginning training for {epochs} epochs...")
    history = []
    best_val_loss = float("inf")
    best_weights = None

    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0

        for b_q, b_p, b_m, b_g, b_y in train_loader:
            b_q, b_p, b_m, b_g, b_y = (
                b_q.to(device),
                b_p.to(device),
                b_m.to(device),
                b_g.to(device),
                b_y.to(device),
            )

            optimizer.zero_grad()
            logits = model(b_q, b_p, b_m, b_g)
            loss = criterion(logits, b_y)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * len(b_y)

        train_loss /= len(train_df)

        # Validation Step
        model.eval()
        val_loss = 0.0
        val_preds = []
        val_targets = []

        with torch.no_grad():
            for b_q, b_p, b_m, b_g, b_y in val_loader:
                b_q, b_p, b_m, b_g, b_y = (
                    b_q.to(device),
                    b_p.to(device),
                    b_m.to(device),
                    b_g.to(device),
                    b_y.to(device),
                )
                logits = model(b_q, b_p, b_m, b_g)
                loss = criterion(logits, b_y)
                val_loss += loss.item() * len(b_y)

                probs = torch.sigmoid(logits).squeeze(-1)
                val_preds.extend(probs.cpu().numpy().tolist())
                val_targets.extend(b_y.squeeze(-1).cpu().numpy().tolist())

        val_loss /= len(val_df)
        val_metrics = compute_classification_metrics(np.array(val_targets), np.array(val_preds))

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_weights = model.state_dict()

        history.append({
            "epoch": epoch,
            "train_loss": round(train_loss, 4),
            "val_loss": round(val_loss, 4),
            "val_auc": round(val_metrics["roc_auc"], 4),
        })

    # Load best checkpoint weights
    if best_weights:
        model.load_state_dict(best_weights)

    # 7. Test Set Evaluation
    model.eval()
    test_preds = []
    test_targets = []

    with torch.no_grad():
        for b_q, b_p, b_m, b_g, b_y in test_loader:
            b_q, b_p, b_m, b_g = b_q.to(device), b_p.to(device), b_m.to(device), b_g.to(device)
            probs = model.predict_proba(b_q, b_p, b_m, b_g)
            test_preds.extend(probs.cpu().numpy().tolist())
            test_targets.extend(b_y.squeeze(-1).numpy().tolist())

    test_preds = np.array(test_preds)
    test_targets = np.array(test_targets)

    test_metrics = compute_classification_metrics(test_targets, test_preds)
    calibration_report = evaluate_calibration(test_targets, test_preds)

    # 8. Checkpoint Persistence
    model_dir = settings.GROWTH_MODEL_DIR
    model_dir.mkdir(parents=True, exist_ok=True)
    checkpoint_path = model_dir / f"{settings.GROWTH_MODEL_VERSION}.pt"

    checkpoint_data = {
        "model_version": settings.GROWTH_MODEL_VERSION,
        "model_state_dict": model.state_dict(),
        "graph_sage_state_dict": graph_sage.state_dict(),
        "device": str(device),
        "test_metrics": test_metrics,
        "baseline_metrics": baseline_eval["metrics"],
        "product_encoder_stats": product_encoder.stats,
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    torch.save(checkpoint_data, checkpoint_path)
    logger.info(f"Model saved successfully to {checkpoint_path}")

    elapsed = round(time.time() - start_time, 2)

    return {
        "model_version": settings.GROWTH_MODEL_VERSION,
        "device": str(device),
        "checkpoint_path": str(checkpoint_path),
        "dataset": {
            "total_samples": len(df),
            "train_samples": len(train_df),
            "val_samples": len(val_df),
            "test_samples": len(test_df),
        },
        "training_time_seconds": elapsed,
        "epochs": epochs,
        "history": history,
        "test_metrics": test_metrics,
        "baseline_comparison": {
            "baseline_roc_auc": round(baseline_eval["metrics"]["roc_auc"], 4),
            "aegis_dl_roc_auc": round(test_metrics["roc_auc"], 4),
            "roc_auc_gain": round(test_metrics["roc_auc"] - baseline_eval["metrics"]["roc_auc"], 4),
            "baseline_pr_auc": round(baseline_eval["metrics"]["pr_auc"], 4),
            "aegis_dl_pr_auc": round(test_metrics["pr_auc"], 4),
        },
        "calibration": calibration_report,
    }
