import torch
import torch.nn as nn
from typing import Dict, List, Tuple, Any, Optional
from torch_geometric.data import Data
from torch_geometric.nn import SAGEConv
from sqlalchemy.orm import Session

from app.db.models import Product, Merchant

class CommerceGraphBuilder:
    """Constructs a relational PyTorch Geometric commerce graph linking merchants, products, and attributes."""

    def __init__(self, feature_dim: int = 64):
        self.feature_dim = feature_dim
        self.node_to_idx: Dict[str, int] = {}
        self.idx_to_node: Dict[int, str] = {}
        self.product_indices: Dict[str, int] = {}

    def build_from_database(self, db: Session) -> Tuple[Data, Dict[str, int]]:
        """Build graph from active database records."""
        products = db.query(Product).filter(Product.availability == True).all()
        merchants = db.query(Merchant).all()

        nodes = []
        edges = []

        def get_or_add_node(node_id: str, node_type: str) -> int:
            if node_id not in self.node_to_idx:
                idx = len(self.node_to_idx)
                self.node_to_idx[node_id] = idx
                self.idx_to_node[idx] = node_id
                nodes.append((idx, node_id, node_type))
            return self.node_to_idx[node_id]

        # 1. Register Merchants & Products
        for m in merchants:
            get_or_add_node(m.id, "merchant")

        for p in products:
            p_idx = get_or_add_node(p.id, "product")
            self.product_indices[p.id] = p_idx

            # Edge: Merchant <-> Product (sells)
            m_idx = get_or_add_node(p.merchant_id, "merchant")
            edges.append((m_idx, p_idx))
            edges.append((p_idx, m_idx))

            # Edge: Category <-> Product
            cat_id = f"CAT-{p.category.upper()}"
            cat_idx = get_or_add_node(cat_id, "category")
            edges.append((cat_idx, p_idx))
            edges.append((p_idx, cat_idx))

            # Edge: Product <-> Attributes
            attrs = p.parsed_attributes
            for k, v in attrs.items():
                attr_id = f"ATTR-{k}:{v}".lower()
                attr_idx = get_or_add_node(attr_id, "attribute")
                edges.append((p_idx, attr_idx))
                edges.append((attr_idx, p_idx))

        # 2. Add Competitor Edges between products in the same category
        cat_groups: Dict[str, List[int]] = {}
        for p in products:
            p_idx = self.product_indices[p.id]
            cat_groups.setdefault(p.category, []).append(p_idx)

        for cat, p_list in cat_groups.items():
            for i in range(len(p_list)):
                for j in range(i + 1, len(p_list)):
                    edges.append((p_list[i], p_list[j]))
                    edges.append((p_list[j], p_list[i]))

        # 3. Create Node Feature Tensor
        num_nodes = len(nodes)
        torch.manual_seed(42)
        # Initialize initial structured feature representations
        x = torch.randn((num_nodes, self.feature_dim), dtype=torch.float32) * 0.1

        # Adjust node features with categorical embeddings
        for idx, node_id, node_type in nodes:
            if node_type == "product":
                x[idx, 0] = 1.0
            elif node_type == "merchant":
                x[idx, 1] = 1.0
            elif node_type == "category":
                x[idx, 2] = 1.0
            elif node_type == "attribute":
                x[idx, 3] = 1.0

        if edges:
            src, dst = zip(*edges)
            edge_index = torch.tensor([src, dst], dtype=torch.long)
        else:
            edge_index = torch.empty((2, 0), dtype=torch.long)

        graph_data = Data(x=x, edge_index=edge_index)
        return graph_data, self.product_indices


class CommerceGraphSAGE(nn.Module):
    """2-Layer GraphSAGE message passing network producing relational product embeddings."""

    def __init__(
        self,
        in_channels: int = 64,
        hidden_channels: int = 48,
        out_channels: int = 32,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.conv1 = SAGEConv(in_channels, hidden_channels)
        self.conv2 = SAGEConv(hidden_channels, out_channels)
        self.dropout = nn.Dropout(dropout)
        self.out_channels = out_channels

    def forward(self, x: torch.Tensor, edge_index: torch.Tensor) -> torch.Tensor:
        """Execute 2-hop neighbor aggregation across commerce graph."""
        h = self.conv1(x, edge_index)
        h = torch.relu(h)
        h = self.dropout(h)
        h = self.conv2(h, edge_index)
        h = torch.relu(h)
        return h
