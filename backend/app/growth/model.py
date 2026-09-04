import torch
import torch.nn as nn
from typing import Dict, Any

class HybridSelectionModel(nn.Module):
    """
    Hybrid Deep Learning Architecture for predicting AI-Buyer Selection Probability.
    Fuses dense semantic query embeddings, structured product metrics, merchant reputation,
    and GraphSAGE relational graph embeddings into a unified multi-layer fusion classifier.
    """

    def __init__(
        self,
        query_dim: int = 384,
        product_dim: int = 10,
        merchant_dim: int = 3,
        graph_dim: int = 32,
        hidden_dim1: int = 96,
        hidden_dim2: int = 48,
        dropout: float = 0.15,
        version: str = "aegis-selection-v1",
    ):
        super().__init__()
        self.version = version

        # 1. Component Projection Heads
        self.query_proj = nn.Sequential(
            nn.Linear(query_dim, 64),
            nn.LayerNorm(64),
            nn.ReLU(),
        )

        self.product_proj = nn.Sequential(
            nn.Linear(product_dim, 32),
            nn.ReLU(),
        )

        self.merchant_proj = nn.Sequential(
            nn.Linear(merchant_dim, 16),
            nn.ReLU(),
        )

        # Total fused feature dimension = 64 + 32 + 16 + 32 = 144
        fusion_dim = 64 + 32 + 16 + graph_dim

        # 2. Deep Fusion MLP
        self.fusion_mlp = nn.Sequential(
            nn.Linear(fusion_dim, hidden_dim1),
            nn.BatchNorm1d(hidden_dim1),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim1, hidden_dim2),
            nn.ReLU(),
            nn.Dropout(dropout * 0.5),
            nn.Linear(hidden_dim2, 1),
        )

    def forward(
        self,
        query_emb: torch.Tensor,
        product_feats: torch.Tensor,
        merchant_feats: torch.Tensor,
        graph_emb: torch.Tensor,
    ) -> torch.Tensor:
        """
        Forward pass returning raw logits.
        Use BCEWithLogitsLoss during training for numerical stability.
        """
        q_h = self.query_proj(query_emb)
        p_h = self.product_proj(product_feats)
        m_h = self.merchant_proj(merchant_feats)

        # Concatenate multi-modal representations
        fused = torch.cat([q_h, p_h, m_h, graph_emb], dim=-1)
        logits = self.fusion_mlp(fused)
        return logits

    def predict_proba(
        self,
        query_emb: torch.Tensor,
        product_feats: torch.Tensor,
        merchant_feats: torch.Tensor,
        graph_emb: torch.Tensor,
    ) -> torch.Tensor:
        """Forward pass applying Sigmoid for inference probability ∈ [0, 1]."""
        self.eval()
        with torch.no_grad():
            logits = self.forward(query_emb, product_feats, merchant_feats, graph_emb)
            probs = torch.sigmoid(logits)
        return probs.squeeze(-1)
